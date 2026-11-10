/**
 * Atribución de campaña (utm_* y fbclid): se guarda en el navegador cuando el visitante llega con ellos en la
 * dirección, para que los formularios sepan de qué campaña vino aunque ya haya navegado a otra página.
 *
 * - No se vuelven a pegar en la dirección: así no se comparten enlaces "marcados" ni se ensucian las URL.
 * - Vencen a los VIGENCIA_CAMPANA_DIAS: una visita vieja desde un anuncio no marca las visitas nuevas.
 * - Una llegada con parámetros nuevos reemplaza todos los anteriores (no se mezclan dos campañas).
 *
 * Quien necesite el valor lo lee de localStorage con su mismo nombre (localStorage.getItem('utm_source')).
 */

export const PARAMETROS_CAMPANA = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'fbclid'];
export const VIGENCIA_CAMPANA_DIAS = 30;
/** Momento (ms) en que se guardó la campaña vigente. */
const CLAVE_FECHA = 'utm_guardado';
const VIGENCIA_MS = VIGENCIA_CAMPANA_DIAS * 24 * 60 * 60 * 1000;

/** Guarda la campaña de la dirección actual o, si no trae, borra la guardada cuando ya venció. */
export function registrarCampana(url: URL, almacen: Storage, ahora = Date.now()): void {
  try {
    const presentes = PARAMETROS_CAMPANA.filter((clave) => url.searchParams.get(clave));
    if (presentes.length) {
      PARAMETROS_CAMPANA.forEach((clave) => almacen.removeItem(clave));
      presentes.forEach((clave) => almacen.setItem(clave, url.searchParams.get(clave)!));
      almacen.setItem(CLAVE_FECHA, String(ahora));
      return;
    }

    const hayGuardada = PARAMETROS_CAMPANA.some((clave) => almacen.getItem(clave) !== null);
    const fecha = Number(almacen.getItem(CLAVE_FECHA));
    if (!hayGuardada) return;
    if (!fecha) {
      // Guardada por la versión anterior del sitio, sin fecha: empieza a contar desde ahora.
      almacen.setItem(CLAVE_FECHA, String(ahora));
    } else if (ahora - fecha > VIGENCIA_MS) {
      PARAMETROS_CAMPANA.forEach((clave) => almacen.removeItem(clave));
      almacen.removeItem(CLAVE_FECHA);
    }
  } catch {
    // Almacenamiento bloqueado (navegación privada estricta): sin atribución, el sitio sigue igual.
  }
}
