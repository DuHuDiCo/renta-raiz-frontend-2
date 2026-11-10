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
  const enFoco = peticion.contexto.enFoco ?? [];
  // "ese", "esa", "el segundo", "más información"… sin código: se resuelve con el foco o la ficha abierta.
  const referencia = /\b(es[eao]s?|est[eao]s?|aquel(la)?|primer[oa]?|segund[oa]|m[aá]s informaci[oó]n|me interesa)\b/.test(texto);
  const comparacion = /m[aá]s (caro|car[ao]|barat[oa])/.test(texto);

  if (codigos.length) {
    respuesta = responderSobre(base, codigos);
  } else if (comparacion) {
    // Simula la comparación de lo que hay en pantalla: solo conoce los inmuebles de ejemplo.
    const visibles = peticion.contexto.inmueblesVisibles ?? [];
    const conocidos = INMUEBLES_DE_EJEMPLO.filter((i) => !visibles.length || visibles.includes(i.codpro));
    const candidatos = conocidos.length ? conocidos : INMUEBLES_DE_EJEMPLO;
    const precio = (i: InmuebleChat) => i.rent || i.saleprice;
    const masCaro = /car[oa]/.test(texto);
    const elegido = [...candidatos].sort((a, b) => (masCaro ? precio(b) - precio(a) : precio(a) - precio(b)))[0];
    respuesta = {
      ...base,
      mensajes: [
        `De los inmuebles que estás viendo, el ${masCaro ? 'más caro' : 'más barato'} es el ${elegido.codpro}, ` +
          `un ${elegido.type.toLowerCase()} en ${elegido.biz.toLowerCase()} en ${elegido.city}.`,
        '(Modo de prueba: solo comparo los inmuebles de ejemplo 7449 y 7453).',
      ],
      enFoco: [elegido.codpro],
    };
  } else if (referencia && (enFoco.length || peticion.contexto.codpro)) {
    const segundo = /segund[oa]/.test(texto);
    const codigo = (segundo ? enFoco[1] : enFoco[0]) ?? peticion.contexto.codpro!;
    respuesta = responderSobre(base, [codigo]);
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
        'Prueba con "requisitos", "pagos", "busco apartamento", "inmueble 7449", "inmueble 7453" (venta), "cuál es el más caro" y luego "dame más información de ese", o "mi recorrido".',
      ],
      sugerencias: ['Requisitos para arrendar', '¿Cómo pago el canon?', 'Quiero publicar mi inmueble'],
    };
  }

  return of(respuesta).pipe(delay(900));
}

/**
 * Respuesta sobre inmuebles concretos, como haría el backend tras consultarlos en Domus (aquí, los de ejemplo):
 * en arriendo da sus datos públicos con la tarjeta; en venta no da datos y ofrece el botón del asesor.
 */
function responderSobre(base: { sesionId: string }, codigos: number[]): AsistenteMensajeResponse {
  const encontrados = INMUEBLES_DE_EJEMPLO.filter((i) => codigos.includes(i.codpro));
  const faltantes = codigos.filter((c) => !encontrados.some((i) => i.codpro === c));
  const enVenta = encontrados.find((i) => i.biz_code === 2);
  const enArriendo = encontrados.filter((i) => i.biz_code !== 2);

  const mensajes = [
    ...enArriendo.map(
      (i) =>
        `El inmueble ${i.codpro} es un ${i.type.toLowerCase()} en ${i.biz.toLowerCase()} en ${i.neighborhood}, ${i.city}: ` +
        `${i.bedrooms} habitaciones, ${i.bathrooms} baños y ${i.area_cons} m², por ${pesos(i.rent)} al mes.`
    ),
    ...(enVenta
      ? [
          'Claro que si, con gusto te ayudo',
          'Nuestro asesor comercial te da toda la informacion de esta propiedad y tambien puede mostrarte otras opciones, toca el boton para escribirle por WhatsApp',
        ]
      : []),
    ...faltantes.map(
      (c) =>
        `No encontré disponible el inmueble con código ${c}. ` +
        `(Modo de prueba: solo conozco ${INMUEBLES_DE_EJEMPLO.map((i) => i.codpro).join(' y ')}).`
    ),
  ];

  return {
    ...base,
    mensajes,
    sugerencias: enArriendo.length ? ['¿Cómo agendo una visita?'] : encontrados.length ? [] : ['Busco opciones parecidas'],
    // El de venta va sin tarjeta: la tarjeta muestra el precio.
    inmuebles: enArriendo.length ? enArriendo : null,
    busqueda: null,
    enFoco: encontrados.map((i) => i.codpro),
    contactoAsesor: enVenta ? { codpro: enVenta.codpro } : null,
  };
}

function pesos(valor: number): string {
  return `$${Math.round(valor).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}
