/**
 * Contrato entre el chat del asistente y el backend del portal:
 * POST {environment.baseUrl}/asistente/mensajes
 *
 * Chat de servicio al cliente, solo preguntas y respuestas: no capta datos personales ni
 * escala a un asesor. El backend arma el prompt, llama a la IA y devuelve la respuesta validada.
 * Cuando el visitante pide inmuebles (parecidos al que ve o según lo que busca), el backend los
 * consulta en Domus y los devuelve como tarjetas en `inmuebles`. También responde por código de
 * inmueble escrito en el mensaje ("inmueble 6945") y sobre los de "Mi recorrido" (`contexto.recorrido`).
 * Ver docs/contrato-asistente.md.
 */

/** Qué página estaba viendo el usuario al escribir. Le permite a la IA responder sobre ella. */
export type PaginaAsistente =
  | 'inicio'
  | 'propiedad'
  | 'listado'
  | 'blog'
  | 'contacto'
  | 'publicar-inmueble'
  | 'avaluos'
  | 'nosotros'
  | 'otra';

export interface ContextoAsistente {
  /** Ruta sin parámetros de campaña: "/inmueble/apartamento-arriendo-laureles-medellin-7434". */
  ruta: string;
  pagina: PaginaAsistente;
  /** Título de la página tal como lo ve el usuario (lo arma el SeoService). */
  titulo: string;
  /** Código Domus del inmueble cuando `pagina` es 'propiedad'. */
  codpro?: number;
  /**
   * Cuando `pagina` es 'listado': los filtros aplicados, con las claves de GET /properties/ (los de la barra
   * "Filtros activos"). Si la página de resultados no los publica, los de la URL (sin utm_* ni fbclid).
   */
  filtros?: Record<string, string>;
  /** Cuando `pagina` es 'listado': códigos (codpro) de la página de resultados abierta, en orden. */
  inmueblesVisibles?: number[];
  /** Cuando `pagina` es 'listado': número de esa página. */
  numeroPagina?: number;
  /**
   * Códigos (codpro) de "Mi recorrido", en el orden en que se agregaron, sin repetir y como máximo
   * MAXIMO_RECORRIDO_ASISTENTE. Ausente si está vacío. Con ellos el backend responde "¿cuál de mi recorrido…?".
   */
  recorrido?: number[];
  /** Atribución de campaña que el sitio ya guarda en localStorage. */
  utm?: Partial<Record<'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_content' | 'utm_term', string>>;
}

/** Lo que la página de resultados publica para el asistente; se lee en cada mensaje. */
export interface ListadoVisibleAsistente {
  filtros: Record<string, string>;
  inmueblesVisibles: number[];
  numeroPagina: number;
}

export interface AsistenteMensajeRequest {
  /** UUID generado en el navegador; identifica la conversación en el backend. */
  sesionId: string;
  /** Texto del usuario, recortado y de máximo LONGITUD_MAXIMA_MENSAJE caracteres. */
  mensaje: string;
  /** 'sugerencia' cuando el usuario tocó un botón de respuesta rápida en vez de escribir. */
  origen: 'texto' | 'sugerencia';
  contexto: ContextoAsistente;
}

/** Tarjeta de un inmueble en el chat. Los nombres son los de Domus, así sirve `rutaFicha` tal cual. */
export interface InmuebleChat {
  codpro: number;
  type: string;
  biz: string;
  biz_code: number;
  neighborhood: string;
  city: string;
  /** Canon de arriendo; 0 si no aplica. */
  rent: number;
  /** Precio de venta; 0 si no aplica. */
  saleprice: number;
  bedrooms: number;
  bathrooms: number;
  area_cons: number;
  image1: string;
}

export interface AsistenteMensajeResponse {
  sesionId: string;
  /** Uno o varios globos, en orden. */
  mensajes: string[];
  /** Respuestas rápidas para el siguiente turno. */
  sugerencias?: string[];
  /** Tarjetas que van debajo del último globo; ausente o null si no se buscaron inmuebles. */
  inmuebles?: InmuebleChat[] | null;
  /** Solo cuando las tarjetas salen de una búsqueda por filtros: permite verlas todas en el listado. */
  busqueda?: BusquedaAsistente | null;
}

/** Búsqueda con la que el asistente sacó las tarjetas, con las claves de GET /properties/. */
export interface BusquedaAsistente {
  filtros: Record<string, string>;
  /** Nombres para los chips: { type: 'Apartamento', city: 'Medellín' }. */
  etiquetas: Record<string, string>;
}

/** Mensaje tal como lo pinta el chat (y como queda guardado en el navegador). */
export interface MensajeChat {
  id: string;
  autor: 'usuario' | 'asistente' | 'sistema';
  texto: string;
  fecha: number;
  /** Mensaje de sistema por un fallo: muestra "Reintentar". */
  error?: boolean;
  /** Tarjetas de inmuebles que acompañan a este globo del asistente. */
  inmuebles?: InmuebleChat[];
  /** Búsqueda de esas tarjetas: muestra "Ver todos en el listado". */
  busqueda?: BusquedaAsistente;
}

export const LONGITUD_MAXIMA_MENSAJE = 1000;
/** Códigos de "Mi recorrido" que se envían en el contexto (los mismos que acepta POST /recorridos). */
export const MAXIMO_RECORRIDO_ASISTENTE = 20;
