/**
 * Listados con URL propia: /arriendo, /venta/casas, /arriendo/apartamentos/medellin/el-poblado.
 * Este archivo no depende de Angular porque también lo usa el servidor (sitemap.ts).
 */

export type Negocio = 'arriendo' | 'venta';

/** Código `biz` de la API. Arriendo y venta incluyen también los inmuebles en "arriendo/venta". */
export const BIZ_DE_NEGOCIO: Record<Negocio, string> = { arriendo: '1', venta: '2' };

export interface TipoListado {
  /** Código `type` de la API. */
  codigo: string;
  slug: string;
  plural: string;
}

/** Tipos de inmueble de la API. Un tipo nuevo no tendrá URL propia hasta que se añada aquí. */
export const TIPOS_LISTADO: TipoListado[] = [
  { codigo: '1', slug: 'apartamentos', plural: 'Apartamentos' },
  { codigo: '2', slug: 'casas', plural: 'Casas' },
  { codigo: '3', slug: 'apartaestudios', plural: 'Apartaestudios' },
  { codigo: '4', slug: 'locales', plural: 'Locales' },
  { codigo: '5', slug: 'bodegas', plural: 'Bodegas' },
  { codigo: '6', slug: 'oficinas', plural: 'Oficinas' },
  { codigo: '7', slug: 'lotes', plural: 'Lotes' },
  { codigo: '8', slug: 'fincas', plural: 'Fincas' },
  { codigo: '9', slug: 'edificios', plural: 'Edificios' },
  { codigo: '10', slug: 'casalotes', plural: 'Casalotes' },
  { codigo: '11', slug: 'parqueaderos', plural: 'Parqueaderos' },
  { codigo: '12', slug: 'casas-campestres', plural: 'Casas campestres' },
  { codigo: '20', slug: 'hoteles', plural: 'Hoteles' },
  { codigo: '22', slug: 'casas-comerciales', plural: 'Casas comerciales' },
];

/** Segmento que ocupa el lugar del tipo cuando se filtra por ciudad sin tipo: /arriendo/inmuebles/medellin. */
export const SLUG_SIN_TIPO = 'inmuebles';

/** Un listado de barrio con menos inmuebles que estos no se indexa ni se enlaza: sería una página casi vacía. */
export const MINIMO_BARRIO = 3;

export const INMUEBLES_POR_PAGINA = 12;

export function esNegocio(valor: string): valor is Negocio {
  return valor === 'arriendo' || valor === 'venta';
}

export function slugListado(texto: string): string {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function tipoPorSlug(slug: string): TipoListado | undefined {
  return TIPOS_LISTADO.find((tipo) => tipo.slug === slug);
}

export function tipoPorCodigo(codigo: string | number): TipoListado | undefined {
  return TIPOS_LISTADO.find((tipo) => tipo.codigo === String(codigo));
}

/** Negocio con el que se enlaza un inmueble. Los de "arriendo/venta" se enlazan por arriendo. */
export function negocioDeBiz(biz: string | number): Negocio {
  return String(biz) === '2' ? 'venta' : 'arriendo';
}

/** Segmentos de la ruta, listos para `routerLink`. */
export function segmentosListado(negocio: Negocio, tipoSlug?: string, ciudadSlug?: string, barrioSlug?: string): string[] {
  const segmentos = ['/', negocio];
  if (tipoSlug || ciudadSlug) segmentos.push(tipoSlug || SLUG_SIN_TIPO);
  if (ciudadSlug) segmentos.push(ciudadSlug);
  if (ciudadSlug && barrioSlug) segmentos.push(barrioSlug);
  return segmentos;
}

export function rutaListado(negocio: Negocio, tipoSlug?: string, ciudadSlug?: string, barrioSlug?: string): string {
  return `/${segmentosListado(negocio, tipoSlug, ciudadSlug, barrioSlug).slice(1).join('/')}`;
}

/** "Apartamentos en arriendo en El Poblado, Medellín". */
export function encabezadoListado(negocio: Negocio, tipoPlural?: string, ciudad?: string, barrio?: string): string {
  const lugar = [barrio, ciudad].filter(Boolean).join(', ');
  return `${tipoPlural || 'Inmuebles'} en ${negocio}${lugar ? ` en ${lugar}` : ''}`;
}

/**
 * Listados que tienen inmuebles ahora mismo. Lo calcula el servidor a partir del inventario y se usa para
 * el sitemap y para los bloques de enlaces entre listados.
 */
export interface IndiceListados {
  /** Código de ciudad → nombre. */
  ciudades: Record<string, string>;
  /** Código de barrio → nombre. */
  barrios: Record<string, string>;
  /** [negocio, código de tipo o '', código de ciudad o '', código de barrio o '', número de inmuebles] */
  listados: [Negocio, string, string, string, number][];
}

export interface EnlaceListado {
  negocio: Negocio;
  tipo: string;
  ciudad: string;
  barrio: string;
  total: number;
  ruta: string;
  texto: string;
}

export function enlacesDeIndice(indice: IndiceListados): EnlaceListado[] {
  return indice.listados.map(([negocio, tipo, ciudad, barrio, total]) => {
    const datosTipo = tipo ? tipoPorCodigo(tipo) : undefined;
    const nombreCiudad = indice.ciudades[ciudad];
    const nombreBarrio = indice.barrios[barrio];
    return {
      negocio,
      tipo,
      ciudad,
      barrio,
      total,
      ruta: rutaListado(negocio, datosTipo?.slug, slugListado(nombreCiudad), slugListado(nombreBarrio)),
      texto: encabezadoListado(negocio, datosTipo?.plural, nombreCiudad, nombreBarrio),
    };
  });
}

/**
 * Agrupa el inventario en listados. `ciudades` y `barrios` son los catálogos de la API: solo se usan los barrios
 * del catálogo, porque muchos inmuebles traen el barrio como texto libre y sin código.
 */
export function calcularIndiceListados(inmuebles: any[], ciudades: any[], barrios: any[]): IndiceListados {
  const nombreCiudad = new Map<string, string>(ciudades.map((c) => [String(c.code), String(c.name).trim()]));
  const barrioPorCodigo = new Map<string, any>(barrios.map((b) => [String(b.code), b]));
  const totales = new Map<string, number>();
  const sumar = (...clave: string[]) => totales.set(clave.join('|'), (totales.get(clave.join('|')) || 0) + 1);

  for (const inmueble of inmuebles) {
    const tipo = tipoPorCodigo(inmueble.type_code)?.codigo || '';
    const ciudad = nombreCiudad.has(String(inmueble.city_code)) ? String(inmueble.city_code) : '';
    const datosBarrio = barrioPorCodigo.get(String(inmueble.neighborhood_code));
    const barrio = ciudad && datosBarrio && String(datosBarrio.city_code) === ciudad ? String(datosBarrio.code) : '';
    const negocios: Negocio[] = String(inmueble.biz_code) === '3' ? ['arriendo', 'venta'] : [negocioDeBiz(inmueble.biz_code)];

    for (const negocio of negocios) {
      sumar(negocio, '', '', '');
      if (tipo) sumar(negocio, tipo, '', '');
      if (ciudad) sumar(negocio, '', ciudad, '');
      if (tipo && ciudad) sumar(negocio, tipo, ciudad, '');
      if (barrio) sumar(negocio, '', ciudad, barrio);
      if (tipo && barrio) sumar(negocio, tipo, ciudad, barrio);
    }
  }

  const indice: IndiceListados = { ciudades: {}, barrios: {}, listados: [] };
  for (const [clave, total] of totales) {
    const [negocio, tipo, ciudad, barrio] = clave.split('|');
    if (barrio && total < MINIMO_BARRIO) continue;
    if (ciudad) indice.ciudades[ciudad] = nombreCiudad.get(ciudad)!;
    if (barrio) indice.barrios[barrio] = String(barrioPorCodigo.get(barrio).name).trim();
    indice.listados.push([negocio as Negocio, tipo, ciudad, barrio, total]);
  }
  return indice;
}
