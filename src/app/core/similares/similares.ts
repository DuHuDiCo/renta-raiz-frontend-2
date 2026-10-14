/**
 * "Inmuebles similares" de la ficha: misma ciudad, mismo negocio, mismo tipo y precio parecido.
 * La API solo filtra; el orden por parecido (barrio, precio, habitaciones, área) se calcula aquí.
 */

/** Cuántos similares se muestran en la ficha. */
export const CANTIDAD_SIMILARES = 3;
/** Cuántos candidatos se piden en cada búsqueda para poder elegir los más parecidos. */
export const CANDIDATOS_SIMILARES = 12;
/** Márgenes de precio, del más estricto al más amplio; solo se amplía si faltan resultados. */
const MARGENES_PRECIO = [0.25, 0.5];

/** Un inmueble en "arriendo/venta" (biz 3) se compara como arriendo. */
const esVenta = (inmueble: any) => Number(inmueble?.biz_code) === 2;

const precioDe = (inmueble: any, venta: boolean) => Number(venta ? inmueble?.saleprice : inmueble?.rent) || 0;

/**
 * Filtros de cada búsqueda, de la más estricta a la más amplia. La ficha las recorre en orden
 * y se detiene en cuanto reúne suficientes similares.
 */
export function busquedasSimilares(inmueble: any): Record<string, string | number>[] {
  if (!inmueble?.city_code) return [];

  const venta = esVenta(inmueble);
  const base: Record<string, string | number> = { city: inmueble.city_code, biz: venta ? 2 : 1 };
  if (inmueble.type_code) base['type'] = inmueble.type_code;

  const precio = precioDe(inmueble, venta);
  const [minimo, maximo] = venta ? ['pvmin', 'pvmax'] : ['pcmin', 'pcmax'];
  const conPrecio = precio > 0
    ? MARGENES_PRECIO.map((margen) => ({
        ...base,
        [minimo]: Math.round(precio * (1 - margen)),
        [maximo]: Math.round(precio * (1 + margen)),
      }))
    : [];

  return [...conPrecio, base];
}

/** Qué tan distinto es un candidato del inmueble de la ficha: 0 es idéntico; a mayor valor, menos parecido. */
function distancia(inmueble: any, candidato: any): number {
  const venta = esVenta(inmueble);
  const relativa = (a: number, b: number) => (a > 0 && b > 0 ? Math.abs(a - b) / a : 0);

  const otroBarrio = inmueble.neighborhood_code && inmueble.neighborhood_code == candidato.neighborhood_code ? 0 : 1;
  const precio = relativa(precioDe(inmueble, venta), precioDe(candidato, venta));
  const habitaciones = Math.min(Math.abs((Number(inmueble.bedrooms) || 0) - (Number(candidato.bedrooms) || 0)), 3) * 0.15;
  const area = Math.min(relativa(Number(inmueble.area_cons), Number(candidato.area_cons)), 1) * 0.5;

  return otroBarrio + precio + habitaciones + area;
}

/** Los candidatos más parecidos al inmueble, sin el propio inmueble ni repetidos. */
export function mejoresSimilares(inmueble: any, candidatos: any[]): any[] {
  const vistos = new Set<unknown>([inmueble?.idpro]);
  const unicos = (candidatos ?? []).filter((candidato) => {
    if (!candidato || vistos.has(candidato.idpro)) return false;
    vistos.add(candidato.idpro);
    return true;
  });

  return unicos
    .map((candidato) => ({ candidato, distancia: distancia(inmueble, candidato) }))
    .sort((a, b) => a.distancia - b.distancia)
    .slice(0, CANTIDAD_SIMILARES)
    .map(({ candidato }) => candidato);
}
