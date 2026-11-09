/**
 * Contrato del formulario "Consigna tu propiedad" con el backend del portal (contrato A):
 * POST {environment.baseUrl}/captaciones, multipart/form-data con una parte `datos` (application/json)
 * y de 0 a MAXIMO_FOTOS partes `fotos`. Ver docs/contrato-captaciones.md.
 *
 * El backend lo pasa a lia-service (módulo de captaciones), que contacta al propietario por WhatsApp.
 */
import { TIPOS_LISTADO } from '../listados/listados';

/** Slugs de TIPOS_LISTADO: "apartamentos", "casas-campestres"… */
export type TipoCaptacion =
  | 'apartamentos'
  | 'casas'
  | 'apartaestudios'
  | 'locales'
  | 'bodegas'
  | 'oficinas'
  | 'lotes'
  | 'fincas'
  | 'edificios'
  | 'casalotes'
  | 'parqueaderos'
  | 'casas-campestres'
  | 'hoteles'
  | 'casas-comerciales';

export type NegocioCaptacion = 'arriendo' | 'venta' | 'arriendo_venta';

/** Nombre en singular de cada tipo, para el selector. */
const SINGULAR: Record<string, string> = {
  apartamentos: 'Apartamento',
  casas: 'Casa',
  apartaestudios: 'Apartaestudio',
  locales: 'Local',
  bodegas: 'Bodega',
  oficinas: 'Oficina',
  lotes: 'Lote',
  fincas: 'Finca',
  edificios: 'Edificio',
  casalotes: 'Casalote',
  parqueaderos: 'Parqueadero',
  'casas-campestres': 'Casa campestre',
  hoteles: 'Hotel',
  'casas-comerciales': 'Casa comercial',
};

export interface OpcionTipo {
  valor: TipoCaptacion;
  nombre: string;
}

/** Tipos del selector: valor = slug de TIPOS_LISTADO, etiqueta en singular. */
export const TIPOS_CAPTACION: OpcionTipo[] = TIPOS_LISTADO.map((tipo) => ({
  valor: tipo.slug as TipoCaptacion,
  nombre: SINGULAR[tipo.slug] ?? tipo.plural,
}));

export const NEGOCIOS_CAPTACION: { valor: NegocioCaptacion; nombre: string }[] = [
  { valor: 'arriendo', nombre: 'Arriendo' },
  { valor: 'venta', nombre: 'Venta' },
  { valor: 'arriendo_venta', nombre: 'Arriendo y venta' },
];

export function incluyeArriendo(negocio: NegocioCaptacion | ''): boolean {
  return negocio === 'arriendo' || negocio === 'arriendo_venta';
}

export function incluyeVenta(negocio: NegocioCaptacion | ''): boolean {
  return negocio === 'venta' || negocio === 'arriendo_venta';
}

/** Sugerencias del campo ciudad (se puede escribir cualquier otra). */
export const CIUDADES_SUGERIDAS = [
  'Medellín',
  'Envigado',
  'Sabaneta',
  'Itagüí',
  'Bello',
  'La Estrella',
  'Caldas',
  'Copacabana',
  'Girardota',
  'Rionegro',
  'La Ceja',
  'El Retiro',
  'Guarne',
  'Marinilla',
  'Llanogrande',
];

export interface InmuebleCaptacion {
  tipo: TipoCaptacion;
  negocio: NegocioCaptacion;
  ciudad: string;
  barrio: string;
  /** > 0 si el negocio incluye arriendo; si no, null. */
  precioArriendo: number | null;
  /** > 0 si el negocio incluye venta; si no, null. */
  precioVenta: number | null;
  administracion: number | null;
  /** m². */
  area: number | null;
  habitaciones: number | null;
  banos: number | null;
  parqueaderos: number | null;
  estrato: number | null;
  amoblado: boolean | null;
  /** "AAAA-MM-DD", hora de Colombia. */
  disponibleDesde: string | null;
  descripcion: string | null;
}

/** Parte `datos` del multipart. */
export interface DatosCaptacion {
  nombre: string;
  /** Con indicativo: "+573001234567". */
  telefono: string;
  email: string | null;
  inmueble: InmuebleCaptacion;
  aceptaPolitica: true;
  /** Dirección absoluta de la página desde la que se envió. */
  urlOrigen: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}

export interface CaptacionResponse {
  /** "CAP-XXXXXXXX". */
  id: string;
}

/** Lo que emite el envío: el avance de la subida y, al final, la respuesta. */
export type EventoEnvioCaptacion =
  | { tipo: 'progreso'; porcentaje: number }
  | { tipo: 'listo'; respuesta: CaptacionResponse };

export const MAXIMO_FOTOS = 10;
/** Tamaño máximo por foto que acepta el backend. */
export const TAMANO_MAXIMO_FOTO = 6 * 1024 * 1024;
export const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
/** Las fotos se reducen en el navegador a este lado mayor, en JPEG con esta calidad. */
export const LADO_MAXIMO_FOTO = 1600;
export const CALIDAD_FOTO = 0.8;

export const LONGITUD_MAXIMA_DESCRIPCION = 1000;
export const LONGITUD_MAXIMA_UBICACION = 80;
export const AREA_MAXIMA = 100000;
export const CANTIDAD_MAXIMA = 50;
export const DIAS_MAXIMOS_DISPONIBLE = 365;
export const PATRON_TELEFONO = /^\+[0-9]{8,18}$/;
