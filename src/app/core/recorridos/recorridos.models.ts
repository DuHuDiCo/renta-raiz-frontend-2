/**
 * Contrato del formulario "Agenda tu recorrido" con el backend del portal:
 * POST {environment.baseUrl}/recorridos
 *
 * El visitante no reserva una cita: deja los rangos de fechas en los que tiene disponibilidad y el equipo
 * comercial organiza el recorrido (propietarios, rutas, asesores) y lo contacta para confirmar día y hora.
 */

/**
 * Horario de recorridos: lunes a viernes de 8:00 a. m. a 5:00 p. m.; sábados de 9:00 a 11:00 a. m.; domingos no.
 * 'manana' y 'tarde' son de lunes a viernes; 'sabado' es la única franja cuando el rango es solo un sábado.
 */
export type FranjaRecorrido = 'manana' | 'tarde' | 'sabado';

export interface OpcionFranja {
  valor: FranjaRecorrido;
  nombre: string;
  horas: string;
  icono: string;
}

/** Franjas de lunes a viernes. */
export const FRANJAS_RECORRIDO: OpcionFranja[] = [
  { valor: 'manana', nombre: 'Mañana', horas: '8:00 a 12:00', icono: 'fa-sun' },
  { valor: 'tarde', nombre: 'Tarde', horas: '12:00 a 5:00', icono: 'fa-cloud-sun' },
];

/** Única franja de un rango que es solo sábado. */
export const FRANJA_SABADO: OpcionFranja = { valor: 'sabado', nombre: 'Sábado', horas: '9:00 a 11:00 a. m.', icono: 'fa-calendar-day' };

/** Hora (24 h) en que termina la atención: después ya no se puede proponer el mismo día. */
export const CIERRE_ENTRE_SEMANA = 17;
export const CIERRE_SABADO = 11;

export const TEXTO_HORARIO =
  'Atendemos de lunes a viernes de 8:00 a. m. a 5:00 p. m. y los sábados de 9:00 a 11:00 a. m. Los domingos no hay recorridos.';

/** Un rango de fechas con disponibilidad. Las fechas van en formato ISO "AAAA-MM-DD", hora de Colombia. */
export interface RangoDisponibilidad {
  desde: string;
  hasta: string;
  /** Al menos una franja. */
  franjas: FranjaRecorrido[];
}

/** El equipo confirma los recorridos solo por WhatsApp. */
export type CanalRecorrido = 'whatsapp';

export interface SolicitudRecorridoRequest {
  nombre: string;
  /** Con indicativo: "+573001234567". */
  telefono: string;
  /** Opcional. */
  email: string | null;
  canalPreferido: CanalRecorrido;
  /** Códigos Domus (codpro) de los inmuebles del recorrido, en el orden en que los agregó. */
  inmuebles: number[];
  /** Entre 1 y MAXIMO_RANGOS rangos, sin repetir. Son una sugerencia, no una reserva. */
  disponibilidad: RangoDisponibilidad[];
  comentarios: string | null;
  aceptaPolitica: true;
  /** Página desde la que se envió. */
  urlOrigen: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
}

export interface SolicitudRecorridoResponse {
  /** Identificador de la solicitud, para que el asesor la ubique. */
  id: string;
}

export const MAXIMO_RANGOS = 5;
/** Hasta cuántos días hacia adelante se puede proponer disponibilidad. */
export const DIAS_MAXIMOS_ADELANTE = 60;
export const LONGITUD_MAXIMA_COMENTARIOS = 500;
