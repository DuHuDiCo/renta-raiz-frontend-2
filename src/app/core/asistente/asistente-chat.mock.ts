import { delay, Observable, of } from 'rxjs';
import { AsistenteMensajeRequest, AsistenteMensajeResponse, InmuebleChat } from './asistente.models';

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

  if (/requisito|document|estudio/.test(texto)) {
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
        'Prueba con "requisitos", "pagos", "publicar mi inmueble" o "busco apartamento".',
      ],
      sugerencias: ['Requisitos para arrendar', '¿Cómo pago el canon?', 'Quiero publicar mi inmueble'],
    };
  }

  return of(respuesta).pipe(delay(900));
}
