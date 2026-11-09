import { delay, Observable, of } from 'rxjs';
import { AsistenteMensajeRequest, AsistenteMensajeResponse, InmuebleChat } from './asistente.models';
import { codigosEnMensaje } from './asistente-codigos';

const INMUEBLES_DE_EJEMPLO: InmuebleChat[] = [
  { codpro: 7449, type: 'APARTAMENTO', biz: 'ARRIENDO', biz_code: 1, neighborhood: 'El Poblado', city: 'Medellín', rent: 3700000, saleprice: 0, bedrooms: 3, bathrooms: 2, area_cons: 81, image1: '' },
  { codpro: 7453, type: 'APARTAMENTO', biz: 'VENTA', biz_code: 2, neighborhood: 'Fontibón', city: 'Rionegro', rent: 0, saleprice: 370000000, bedrooms: 2, bathrooms: 2, area_cons: 78, image1: '' },
];

/**
 * Respuestas de prueba para ver y probar el chat sin el backend. Solo se usa con
 * `environment.asistenteMock` (configuración de desarrollo); imita el contrato real.
 */
export function responderSimulado(peticion: AsistenteMensajeRequest): Observable<AsistenteMensajeResponse> {
  const texto = peticion.mensaje.toLowerCase();
  const base = { sesionId: peticion.sesionId };
  let respuesta: AsistenteMensajeResponse;

  const codigos = codigosEnMensaje(peticion.mensaje);
  const recorrido = peticion.contexto.recorrido ?? [];

  if (codigos.length) {
    // Simula la consulta a Domus: solo conoce los inmuebles de ejemplo.
    const encontrados = INMUEBLES_DE_EJEMPLO.filter((i) => codigos.includes(i.codpro));
    const faltantes = codigos.filter((c) => !encontrados.some((i) => i.codpro === c));
    respuesta = {
      ...base,
      mensajes: [
        ...encontrados.map(
          (i) =>
            `El inmueble ${i.codpro} es un ${i.type.toLowerCase()} en ${i.biz.toLowerCase()} en ${i.neighborhood}, ${i.city}: ` +
            `${i.bedrooms} habitaciones, ${i.bathrooms} baños y ${i.area_cons} m², por ${pesos(i.rent || i.saleprice)}${i.rent ? ' al mes' : ''}.`
        ),
        ...faltantes.map(
          (c) =>
            `No encontré disponible el inmueble con código ${c}. ` +
            `(Modo de prueba: solo conozco ${INMUEBLES_DE_EJEMPLO.map((i) => i.codpro).join(' y ')}).`
        ),
      ],
      sugerencias: encontrados.length ? ['¿Cómo agendo una visita?'] : ['Busco opciones parecidas'],
      inmuebles: encontrados.length ? encontrados : null,
      busqueda: null,
    };
  } else if (/recorrido/.test(texto)) {
    respuesta = recorrido.length
      ? {
          ...base,
          mensajes: [
            `Tienes ${recorrido.length} inmueble${recorrido.length === 1 ? '' : 's'} en tu recorrido: ${recorrido.join(', ')}.`,
            'En modo de prueba no tengo sus precios; el asistente real los compara. Cuando quieras visitarlos, pulsa "Agendar visita" en "Mi recorrido".',
          ],
          sugerencias: ['¿Cómo agendo una visita?'],
        }
      : {
          ...base,
          mensajes: ['Aún no tienes inmuebles en tu recorrido. Agrégalos desde la ficha o las tarjetas de los inmuebles que te gusten.'],
          sugerencias: ['Busco apartamento en arriendo'],
        };
  } else if (/requisito|document|estudio/.test(texto)) {
    respuesta = {
      ...base,
      mensajes: [
        'Para arrendar normalmente se pide documento de identidad, soportes de ingresos y el estudio de la aseguradora.',
        'El estudio suele tardar entre 1 y 2 días hábiles.',
      ],
      sugerencias: ['¿Cuánto cuesta el estudio?', '¿Necesito codeudor?'],
    };
  } else if (/pag|canon|factura|pse/.test(texto)) {
    respuesta = {
      ...base,
      mensajes: ['Puedes pagar el canon por PSE desde el botón "Pagos" del sitio, o en las oficinas de Renta Raíz.'],
      sugerencias: ['¿Hasta qué día puedo pagar?', 'Horarios de atención'],
    };
  } else if (/parecid|similar|busco|opciones/.test(texto)) {
    respuesta = {
      ...base,
      mensajes: ['Estas son algunas opciones de ejemplo.'],
      sugerencias: ['¿Cómo agendo una visita?'],
      inmuebles: INMUEBLES_DE_EJEMPLO,
    };
  } else if (/public|consign|vender mi|arrendar mi/.test(texto)) {
    respuesta = {
      ...base,
      mensajes: [
        'Para publicar tu inmueble entra a "Publica tu propiedad" y llena el formulario.',
        'Un asesor revisa la información y te explica las condiciones de administración.',
      ],
      sugerencias: ['¿Qué comisión cobran?', '¿Hacen avalúos?'],
    };
  } else {
    respuesta = {
      ...base,
      mensajes: [
        'Estoy en modo de prueba, así que mis respuestas son de ejemplo.',
        'Prueba con "requisitos", "pagos", "publicar mi inmueble", "busco apartamento", "inmueble 7449" o "mi recorrido".',
      ],
      sugerencias: ['Requisitos para arrendar', '¿Cómo pago el canon?', 'Quiero publicar mi inmueble'],
    };
  }

  return of(respuesta).pipe(delay(900));
}

function pesos(valor: number): string {
  return `$${Math.round(valor).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}
