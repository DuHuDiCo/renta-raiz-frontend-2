/**
 * Contrato entre la búsqueda con IA de la barra de filtros y el backend del portal:
 * POST {environment.baseUrl}/busqueda/interpretar
 *
 * El backend convierte la frase del usuario en los filtros que ya recibe GET /properties/ y los
 * devuelve; no busca inmuebles. El front hace la búsqueda de siempre con esos filtros.
 */

/** Claves de GET /properties/ que puede devolver la interpretación, con los nombres de Domus. */
export type ClaveFiltroIa =
  | 'biz'
  | 'type'
  | 'city'
  | 'neighborhood_code'
  | 'pcmin'
  | 'pcmax'
  | 'pvmin'
  | 'pvmax'
  | 'minarea'
  | 'maxarea'
  | 'minbed'
  | 'maxbed'
  | 'minbath'
  | 'maxbath'
  | 'minparking'
  | 'stratum'
  /** Códigos de características de Domus separados por coma ("23,41"). */
  | 'amenities';

/** Valores tal como se mandan a GET /properties/. */
export type FiltrosIa = Partial<Record<ClaveFiltroIa, string>>;

export interface InterpretarBusquedaRequest {
  /** Frase del usuario, recortada, de máximo LONGITUD_MAXIMA_CONSULTA caracteres. */
  consulta: string;
  /** UUID del navegador, el mismo del chat del asistente. */
  sesionId: string;
  /** Filtros ya aplicados; si viene, la frase se toma como refinamiento ("más barato"). */
  filtrosActuales?: FiltrosIa;
  /** Códigos (codpro) de la página de resultados abierta, en orden; [] si no hay resultados en pantalla. */
  inmueblesVisibles: number[];
  /** Número de esa página. */
  pagina?: number;
}

/** Lo que el visitante tiene en pantalla, para las preguntas sobre esos inmuebles. */
export interface PaginaVisibleIa {
  inmueblesVisibles: number[];
  pagina?: number;
}

/** El backend acepta hasta 24 inmuebles por página. */
export const MAXIMO_INMUEBLES_VISIBLES = 24;

/**
 * `pregunta_inmuebles` es sobre los inmuebles de la página ("¿cuál es el más barato?") y trae `respuesta`;
 * `pregunta` va al Asistente Renta Raíz; `otro` es un saludo o algo que no es búsqueda.
 */
export type IntencionBusquedaIa = 'busqueda' | 'pregunta_inmuebles' | 'pregunta' | 'otro';

export interface InterpretarBusquedaResponse {
  /** Filtros finales, ya combinados con `filtrosActuales`: reemplazan a los anteriores, no se mezclan. */
  filtros: FiltrosIa;
  /** Nombres legibles de los códigos: { type: 'Apartamento', neighborhood_code: 'El Poblado' }. */
  etiquetas: Partial<Record<ClaveFiltroIa, string>>;
  /** Partes de la frase que no son filtro, tal como las escribió el usuario. Incluye `lugaresNoEncontrados`. */
  noEntendido: string[];
  /** true si la IA falló; entonces `filtros` viene vacío y no se tocan los filtros actuales. */
  degradado: boolean;
  intencion: IntencionBusquedaIa;
  /** Ciudades o barrios nombrados que no existen en Domus. */
  lugaresNoEncontrados: string[];
  /** Explicaciones listas para mostrar ("Solo puedo buscar en un lugar a la vez…"); reemplazan el aviso genérico de `noEntendido`. */
  avisos: string[];
  /** Con `pregunta_inmuebles`: la respuesta lista para mostrar tal como llega. */
  respuesta?: string;
  /** Con `pregunta_inmuebles`: códigos de los inmuebles de la página que responden la pregunta. */
  inmueblesDestacados: number[];
  /** Solo lo pone el front cuando el backend responde 429: segundos para volver a intentar. */
  reintentarEn?: number;
}

export const LONGITUD_MAXIMA_CONSULTA = 300;

export const TEXTO_DEGRADADO = 'No pude interpretar eso ahora; usa los filtros.';
export const TEXTO_OTRO = 'Escríbeme qué buscas: zona, tipo, precio, habitaciones…';
export const TEXTO_PREGUNTA = 'Eso te lo responde el Asistente Renta Raíz.';
export const TEXTO_REVISANDO_PAGINA = 'Revisando los inmuebles de esta página…';
export const TEXTO_SIN_RESPUESTA_PAGINA = 'No pude revisar los inmuebles de esta página. Intenta de nuevo en un momento.';

export function textoEspera(segundos: number): string {
  const s = Math.max(1, Math.round(segundos));
  return `Espera un momento: puedes volver a intentarlo en ${s} ${s === 1 ? 'segundo' : 'segundos'}.`;
}

export function textoLugaresNoEncontrados(lugares: string[]): string {
  return `No encontré ${lugares.map((l) => `«${l}»`).join(', ')} en nuestras zonas.`;
}

/** Lo que no se entendió, sin los lugares no encontrados (esos tienen su propio aviso). */
/** Con avisos del backend no se repite lo mismo con el aviso genérico de lo no entendido. */
export function noEntendidoSinLugares(respuesta: Pick<InterpretarBusquedaResponse, 'noEntendido' | 'lugaresNoEncontrados' | 'avisos'>): string[] {
  if (respuesta.avisos?.length) return [];
  return respuesta.noEntendido.filter((parte) => !respuesta.lugaresNoEncontrados.includes(parte));
}
