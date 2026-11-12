/**
 * Inmueble que ya no está en Domus (vendido, arrendado o retirado). La API ya no entrega sus datos, pero la
 * dirección de la ficha los trae: el texto se arma con tipo, negocio, barrio y ciudad (rutaFicha) y la ficha
 * agrega ?city=…&biz=…&category=… al abrirse. Con eso se buscan los inmuebles más parecidos.
 */
import { TIPOS_CAPTACION } from '../captaciones/captaciones.models';
import { BIZ_DE_NEGOCIO, Negocio, TipoListado, codigoDeFicha, slugListado, tipoPorSlug } from './listados';

export type CategoriaPrecio = 'DIAMANTE' | 'ORO' | 'PLATA';

export interface InmuebleRetirado {
  codpro: number;
  /** "arriendo/venta" se busca como arriendo, igual que en los listados. */
  negocio: Negocio;
  tipo?: TipoListado;
  /** Nombre del tipo en singular, para el mensaje: "Casa". */
  tipoNombre?: string;
  /** Barrio y ciudad tal como quedaron en la dirección: "la-intermedia-envigado". */
  zonaSlug: string;
  /** Slug de la ciudad si la dirección la trae aparte (?city=Envigado). */
  ciudadSlug?: string;
  categoria?: CategoriaPrecio;
}

/** Tipos en singular, del nombre más largo al más corto ("casa-campestre" antes que "casa"). */
const TIPOS_SINGULAR = TIPOS_CAPTACION
  .map((tipo) => ({ prefijo: slugListado(tipo.nombre), slug: tipo.valor as string, nombre: tipo.nombre }))
  .sort((a, b) => b.prefijo.length - a.prefijo.length);

/**
 * Rangos de precio de cada categoría, los mismos con los que la ficha la calcula (ver-propiedad, updateParams)
 * y el menú filtra Diamante, Oro y Plata.
 */
const RANGOS: Record<Negocio, Record<CategoriaPrecio, Record<string, number>>> = {
  arriendo: {
    DIAMANTE: { pcmin: 15000001 },
    ORO: { pcmin: 8000000, pcmax: 15000000 },
    PLATA: { pcmin: 2000000, pcmax: 8000000 },
  },
  venta: {
    DIAMANTE: { pvmin: 2000000001 },
    ORO: { pvmin: 1000000001, pvmax: 2000000000 },
    PLATA: { pvmin: 100000000, pvmax: 1000000000 },
  },
};

/** Lee lo que dice la dirección "casa-arriendo-la-intermedia-envigado-7590" (+ ?city, ?biz, ?category). */
export function leerInmuebleRetirado(slug: string, params: Record<string, string | undefined> = {}): InmuebleRetirado | null {
  const codpro = codigoDeFicha(slug);
  if (!Number.isInteger(codpro) || codpro <= 0) return null;
  let resto = slug.replace(new RegExp(`-?${codpro}$`), '');

  const tipoSingular = TIPOS_SINGULAR.find((t) => resto === t.prefijo || resto.startsWith(`${t.prefijo}-`));
  if (tipoSingular) resto = resto.slice(tipoSingular.prefijo.length).replace(/^-/, '');

  let negocio: Negocio | null = null;
  for (const [prefijo, valor] of [['arriendo-venta', 'arriendo'], ['arriendo', 'arriendo'], ['venta', 'venta']] as const) {
    if (resto === prefijo || resto.startsWith(`${prefijo}-`)) {
      negocio = valor;
      resto = resto.slice(prefijo.length).replace(/^-/, '');
      break;
    }
  }
  const biz = String(params['biz'] ?? '').toUpperCase();
  if (!negocio) negocio = biz === 'VENTA' ? 'venta' : biz === 'ARRIENDO' ? 'arriendo' : null;
  if (!negocio) return null;

  const categoria = String(params['category'] ?? '').toUpperCase();
  return {
    codpro,
    negocio,
    tipo: tipoSingular ? tipoPorSlug(tipoSingular.slug) : undefined,
    tipoNombre: tipoSingular?.nombre,
    zonaSlug: resto,
    ciudadSlug: params['city'] ? slugListado(params['city']) : undefined,
    categoria: categoria === 'DIAMANTE' || categoria === 'ORO' || categoria === 'PLATA' ? categoria : undefined,
  };
}

export interface LugarRetirado {
  codigo: string;
  nombre: string;
  slug: string;
}

/**
 * Ciudad y barrio a partir de los catálogos de la API. La ciudad es la de ?city o, si no viene, la que coincide
 * con el final del texto (la más larga: "la-estrella" antes que "estrella"); el barrio es lo que queda antes.
 */
export function ubicarInmuebleRetirado(
  datos: InmuebleRetirado,
  ciudades: any[],
  barrios: any[]
): { ciudad?: LugarRetirado; barrio?: LugarRetirado } {
  const conSlug = (lista: any[]) =>
    (lista || []).map((l) => ({ codigo: String(l.code), nombre: String(l.name).trim(), slug: slugListado(l.name), ciudad: String(l.city_code ?? '') }));
  const listaCiudades = conSlug(ciudades).sort((a, b) => b.slug.length - a.slug.length);

  const ciudad =
    (datos.ciudadSlug && listaCiudades.find((c) => c.slug === datos.ciudadSlug)) ||
    listaCiudades.find((c) => c.slug && (datos.zonaSlug === c.slug || datos.zonaSlug.endsWith(`-${c.slug}`)));
  if (!ciudad) return {};

  const barrioSlug = datos.zonaSlug === ciudad.slug ? '' : datos.zonaSlug.replace(new RegExp(`-${ciudad.slug}$`), '');
  const barrio = barrioSlug ? conSlug(barrios).find((b) => b.ciudad === ciudad.codigo && b.slug === barrioSlug) : undefined;
  const lugar = ({ codigo, nombre, slug }: LugarRetirado) => ({ codigo, nombre, slug });
  return { ciudad: lugar(ciudad), barrio: barrio ? lugar(barrio) : undefined };
}

export interface BusquedaRetirado {
  /** Filtros con las claves de GET /properties/. */
  filtros: Record<string, string | number>;
  /** Hasta dónde llega el listado de "Ver todos" con esta búsqueda. */
  nivel: 'barrio' | 'ciudad' | 'negocio';
}

/** Búsquedas de la más parecida a la más amplia; la página las recorre hasta reunir suficientes inmuebles. */
export function busquedasRetirado(datos: InmuebleRetirado, ciudad?: LugarRetirado, barrio?: LugarRetirado): BusquedaRetirado[] {
  const base: Record<string, string | number> = { biz: BIZ_DE_NEGOCIO[datos.negocio] };
  if (datos.tipo) base['type'] = datos.tipo.codigo;
  const precio = datos.categoria ? RANGOS[datos.negocio][datos.categoria] : null;

  const busquedas: BusquedaRetirado[] = [];
  const agregar = (filtros: Record<string, string | number>, nivel: BusquedaRetirado['nivel']) => {
    const clave = JSON.stringify(filtros);
    if (!busquedas.some((b) => JSON.stringify(b.filtros) === clave)) busquedas.push({ filtros, nivel });
  };
  if (barrio) {
    if (precio) agregar({ ...base, neighborhood_code: barrio.codigo, ...precio }, 'barrio');
    agregar({ ...base, neighborhood_code: barrio.codigo }, 'barrio');
  }
  if (ciudad) {
    if (precio) agregar({ ...base, city: ciudad.codigo, ...precio }, 'ciudad');
    agregar({ ...base, city: ciudad.codigo }, 'ciudad');
  }
  if (precio) agregar({ ...base, ...precio }, 'negocio');
  agregar(base, 'negocio');
  return busquedas;
}
