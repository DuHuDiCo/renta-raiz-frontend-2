import { delay, Observable, of } from 'rxjs';
import { TIPOS_LISTADO } from '../listados/listados';
import { FiltrosIa, InterpretarBusquedaRequest, InterpretarBusquedaResponse } from './busqueda-ia.models';

/** Ciudades y barrios de Domus (GET /properties/ciudades y /barrios), para usar códigos reales. */
export interface LugaresIa {
  ciudades: { code: string; name: string }[];
  barrios: { code: string; name: string; city_code: string; city_name: string }[];
}

/** Sin tildes, en minúsculas, solo letras y números, con un espacio a cada lado para buscar palabras enteras. */
const normalizar = (texto: string) =>
  ` ${String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;

const NUMEROS: Record<string, number> = { un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6 };

/** "Locales" → "Local", "Casas campestres" → "Casa campestre". */
const singular = (plural: string) => plural.replace(/(l)es\b/g, '$1').replace(/s\b/g, '');

/** Tipos con su singular y plural en texto normalizado; los nombres largos primero ("casas campestres" antes que "casas"). */
const TIPOS_EN_TEXTO = [
  ...TIPOS_LISTADO.map((t) => {
    const plural = normalizar(t.plural).trim();
    return { codigo: t.codigo, etiqueta: singular(t.plural), patron: new RegExp(` (${plural}|${singular(plural)}) `) };
  }),
  { codigo: '1', etiqueta: 'Apartamento', patron: / aptos? / },
].sort((a, b) => b.patron.source.length - a.patron.source.length);

const PALABRAS_VACIAS =
  / (busco|quiero|necesito|me|gustaria|un|una|unos|unas|el|la|los|las|en|de|del|con|y|que|para|algo|por|favor|mejor|ahora|tambien|pero) /g;

/**
 * Interpretación de prueba para ver y probar la búsqueda con IA sin el backend. Solo se usa con
 * `environment.busquedaIaMock` (configuración de desarrollo); imita el contrato real con reglas
 * simples, sin IA.
 */
export function interpretarSimulado(
  peticion: InterpretarBusquedaRequest,
  lugares: LugaresIa
): Observable<InterpretarBusquedaResponse> {
  // "4.000.000" → "4000000" y "4,5" → "4x5", porque normalizar() quita puntos y comas.
  let texto = normalizar(
    peticion.consulta.replace(/(\d)[.,](?=\d{3}\b)/g, '$1').replace(/(\d)[.,](\d{1,2})\b/g, '$1x$2')
  );
  const quitar = (patron: RegExp | string) => (texto = texto.replace(patron, ' '));
  const filtros: FiltrosIa = { ...peticion.filtrosActuales };
  const etiquetas: InterpretarBusquedaResponse['etiquetas'] = {};

  const arriendo = / (arriendo|arrendar|alquiler|alquilar|rentar) /.test(texto);
  const venta = / (venta|comprar|compra) /.test(texto);
  if (arriendo || venta) filtros.biz = arriendo && venta ? '3' : arriendo ? '1' : '2';
  quitar(/ (para |en )?(arriendo|arrendar|alquiler|alquilar|rentar|venta|comprar|compra) /g);

  // "con parqueadero" es una característica, no el tipo de inmueble Parqueadero.
  if (/ con parqueaderos? /.test(texto)) {
    filtros.minparking = '1';
    quitar(/ con parqueaderos? /);
  }

  const tipo = TIPOS_EN_TEXTO.find((t) => t.patron.test(texto));
  if (tipo) {
    filtros.type = tipo.codigo;
    etiquetas.type = tipo.etiqueta;
    quitar(tipo.patron);
  }

  // Un barrio con nombre de ciudad cuenta como ciudad; los nombres largos primero ("El Poblado" antes que "Poblado").
  const largoPrimero = (a: { name: string }, b: { name: string }) => b.name.length - a.name.length;
  const ciudad = lugares.ciudades
    .filter((c) => normalizar(c.name).length > 5 && texto.includes(normalizar(c.name)))
    .sort(largoPrimero)[0];
  const barrio = lugares.barrios
    .filter((b) => normalizar(b.name).length > 6 && texto.includes(normalizar(b.name)))
    .filter((b) => !lugares.ciudades.some((c) => normalizar(c.name) === normalizar(b.name)))
    .filter((b) => !ciudad || b.city_code === ciudad.code)
    .sort(largoPrimero)[0];
  if (barrio) {
    filtros.city = barrio.city_code;
    filtros.neighborhood_code = barrio.code;
    etiquetas.city = barrio.city_name;
    etiquetas.neighborhood_code = barrio.name;
    quitar(normalizar(barrio.name));
  } else if (ciudad) {
    filtros.city = ciudad.code;
    delete filtros.neighborhood_code;
    etiquetas.city = ciudad.name;
  }
  if (ciudad) quitar(normalizar(ciudad.name));

  const habitaciones = texto.match(
    / (\d{1,2}|un|una|dos|tres|cuatro|cinco|seis) (o mas )?(habitaciones|habitacion|alcobas|alcoba|cuartos|cuarto|hab) /
  );
  if (habitaciones) {
    const n = String(NUMEROS[habitaciones[1]] ?? habitaciones[1]);
    filtros.minbed = n;
    if (habitaciones[2]) delete filtros.maxbed;
    else filtros.maxbed = n;
    quitar(habitaciones[0]);
  }

  const precio = texto.match(/ (maximo|hasta|menos de) (\d+(?:x\d+)?) ?(millones|millon|m|palos)? /);
  if (precio) {
    const valor = Math.round(parseFloat(precio[2].replace('x', '.')) * (precio[3] ? 1_000_000 : 1));
    const esVenta = filtros.biz === '2' || (!filtros.biz && valor >= 30_000_000);
    if (!filtros.biz) filtros.biz = esVenta ? '2' : '1';
    filtros[esVenta ? 'pvmax' : 'pcmax'] = String(valor);
    quitar(precio[0]);
  }

  if (/ mas barat[oa]s? /.test(texto) && (filtros.pcmax || filtros.pvmax)) {
    const clave = filtros.pcmax ? 'pcmax' : 'pvmax';
    filtros[clave] = String(Math.round(Number(filtros[clave]) * 0.8));
    quitar(/ mas barat[oa]s? /);
  }

  // Se repite hasta que no cambie: las palabras vacías seguidas comparten el espacio que las separa.
  let resto = texto;
  for (let antes = ''; antes !== resto; ) {
    antes = resto;
    resto = resto.replace(PALABRAS_VACIAS, ' ');
  }
  resto = resto.replace(/\s+/g, ' ').trim();

  return of({ filtros, etiquetas, noEntendido: resto ? [resto] : [], degradado: false }).pipe(delay(600));
}
