/**
 * Contrato entre el chat del asistente y el backend del portal:
 * POST {environment.baseUrl}/asistente/mensajes
 *
 * Chat de servicio al cliente, solo preguntas y respuestas: no capta datos personales ni
 * escala a un asesor. El backend arma el prompt, llama a la IA y devuelve la respuesta validada.
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
  /** Filtros de la URL cuando `pagina` es 'listado' (sin utm_* ni fbclid). */
  filtros?: Record<string, string>;
  /** Atribución de campaña que el sitio ya guarda en localStorage. */
  utm?: Partial<Record<'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_content' | 'utm_term', string>>;
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

export interface AsistenteMensajeResponse {
  sesionId: string;
  /** Uno o varios globos, en orden. */
  mensajes: string[];
  /** Respuestas rápidas para el siguiente turno. */
  sugerencias?: string[];
}

/** Mensaje tal como lo pinta el chat (y como queda guardado en el navegador). */
export interface MensajeChat {
  id: string;
  autor: 'usuario' | 'asistente' | 'sistema';
  texto: string;
  fecha: number;
  /** Mensaje de sistema por un fallo: muestra "Reintentar". */
  error?: boolean;
}

export const LONGITUD_MAXIMA_MENSAJE = 1000;
