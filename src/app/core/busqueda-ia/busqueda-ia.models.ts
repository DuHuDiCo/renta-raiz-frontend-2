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
  | 'stratum';

/** Valores tal como se mandan a GET /properties/. */
export type FiltrosIa = Partial<Record<ClaveFiltroIa, string>>;

export interface InterpretarBusquedaRequest {
  /** Frase del usuario, recortada, de máximo LONGITUD_MAXIMA_CONSULTA caracteres. */
  consulta: string;
  /** UUID del navegador, el mismo del chat del asistente. */
  sesionId: string;
  /** Filtros ya aplicados; si viene, la frase se toma como refinamiento ("más barato"). */
  filtrosActuales?: FiltrosIa;
}

export interface InterpretarBusquedaResponse {
  filtros: FiltrosIa;
  /** Nombres legibles de los códigos: { type: 'Apartamento', neighborhood_code: 'El Poblado' }. */
  etiquetas: Partial<Record<ClaveFiltroIa, string>>;
  /** Partes de la frase que no son filtro o lugares que no existen en Domus. */
  noEntendido: string[];
  /** true si la IA falló; entonces `filtros` viene vacío. */
  degradado: boolean;
}

export const LONGITUD_MAXIMA_CONSULTA = 300;
