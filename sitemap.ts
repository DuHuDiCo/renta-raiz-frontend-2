import * as CryptoJS from 'crypto-js';
import { DataasesoresService } from './src/app/core/dataAsesores/dataasesores.service';
import { IndiceListados, calcularIndiceListados, enlacesDeIndice } from './src/app/core/listados/listados';
import { SEO_DOMINIO } from './src/app/core/seo/seo.service';
import { Login, environment } from './src/environments/environment';

const SITEMAP_TTL_MS = 1000 * 60 * 60; // 1 hora, igual que la caché de páginas
const PAGINAS_EN_PARALELO = 4;
const MAXIMO_PAGINAS = 400; // tope de seguridad por si la API devuelve un last_page disparatado

// Páginas indexables. No van aquí las marcadas con noindex en las rutas (mapa, prioritarios, formulario enviado).
const RUTAS_FIJAS = [
  '/',
  '/filtros',
  '/quienes-somos',
  '/nuestro-equipo',
  '/contacto',
  '/blogs',
  '/publicar-inmueble',
  '/avaluos-comerciales',
  '/politicas-de-privacidad',
  '/politicas-de-acoso-sexual',
];

// Los artículos están escritos en la plantilla de ver-blog: al añadir uno hay que añadirlo también aquí.
const ARTICULOS_BLOG = [
  'medellin-brilla-en-los-stella-awards-2025-la-ciudad-que-enamora-al-mundo-y-se-vuelve-epicentro-de-inversion-inmobiliaria',
  'medellin-el-nuevo-epicentro-del-lujo-en-america-latina-para-invertir-rentar-o-comprar-propiedades-exclusivas',
  'por-que-medellin-se-ha-convertido-en-el-lugar-ideal-para-vivir-e-invertir-en-tiempos-de-cambio',
  'quien-toma-realmente-las-decisiones-sobre-un-inmueble-rentado-el-propietario-o-la-inmobiliaria',
];

interface EntradaSitemap {
  ruta: string;
  /** Fecha AAAA-MM-DD. Solo se envía cuando es real; una fecha inventada hace que Google las ignore todas. */
  modificado?: string;
}

let cache: { xml: string; timestamp: number } | null = null;
let indiceListados: IndiceListados | null = null;
let enCurso: Promise<string> | null = null;

function tokenApi(): string {
  return CryptoJS.AES.encrypt(Login.token, CryptoJS.enc.Utf8.parse(Login.tokenEncrypt), {
    iv: CryptoJS.enc.Utf8.parse(Login.ivEncrypted),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
}

async function pedirPagina(pagina: number, token: string): Promise<any> {
  const respuesta = await fetch(`${environment.baseUrl}/properties/?elementsPerPage=50&page=${pagina}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!respuesta.ok) throw new Error(`La API respondió ${respuesta.status} en la página ${pagina} de inmuebles`);
  return respuesta.json();
}

async function pedirCatalogo(nombre: 'ciudades' | 'barrios', token: string): Promise<any[]> {
  const respuesta = await fetch(`${environment.baseUrl}/properties/${nombre}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!respuesta.ok) throw new Error(`La API respondió ${respuesta.status} al pedir ${nombre}`);
  return (await respuesta.json()).data || [];
}

/** Recorre todas las páginas del inventario. Si una falla se lanza el error: no se publica un sitemap parcial. */
async function obtenerInmuebles(token: string): Promise<any[]> {
  const primera = await pedirPagina(1, token);
  const totalPaginas = Math.min(Number(primera.last_page) || 1, MAXIMO_PAGINAS);
  const paginas: any[] = [primera];

  for (let inicio = 2; inicio <= totalPaginas; inicio += PAGINAS_EN_PARALELO) {
    const lote = [];
    for (let pagina = inicio; pagina < inicio + PAGINAS_EN_PARALELO && pagina <= totalPaginas; pagina++) {
      lote.push(pedirPagina(pagina, token));
    }
    paginas.push(...(await Promise.all(lote)));
  }

  const vistos = new Set<number>();
  const inmuebles: any[] = [];
  for (const pagina of paginas) {
    for (const inmueble of pagina.data || []) {
      const codigo = Number(inmueble.codpro);
      if (!Number.isInteger(codigo) || codigo <= 0 || vistos.has(codigo)) continue;
      vistos.add(codigo);
      inmuebles.push(inmueble);
    }
  }
  if (!inmuebles.length) throw new Error('La API no devolvió inmuebles');
  return inmuebles;
}

async function generarSitemap(): Promise<string> {
  const token = tokenApi();
  const [inventario, ciudades, barrios] = await Promise.all([
    obtenerInmuebles(token),
    pedirCatalogo('ciudades', token),
    pedirCatalogo('barrios', token),
  ]);

  const inmuebles: EntradaSitemap[] = inventario.map((inmueble) => {
    const fecha = String(inmueble.registry_date || '').slice(0, 10);
    return {
      ruta: `/ver-propiedad/${Number(inmueble.codpro)}/0`,
      modificado: /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : undefined,
    };
  });

  // Listados con URL propia (/arriendo/apartamentos/medellin) que tienen inmuebles ahora mismo.
  const indice = calcularIndiceListados(inventario, ciudades, barrios);
  indiceListados = indice;
  const listados = enlacesDeIndice(indice).map((enlace) => enlace.ruta);
  const portafolios = new DataasesoresService()
    .getAsesores()
    .filter((asesor) => asesor.id)
    .map((asesor) => `/portafolio/${asesor.id}`);

  const entradas: EntradaSitemap[] = [
    ...[...RUTAS_FIJAS, ...listados, ...ARTICULOS_BLOG.map((id) => `/ver-blog/${id}`), ...portafolios].map((ruta) => ({ ruta })),
    ...inmuebles,
  ];

  const urls = entradas
    .map(({ ruta, modificado }) => {
      const loc = `${SEO_DOMINIO}${ruta === '/' ? '/' : ruta}`;
      return `  <url><loc>${loc}</loc>${modificado ? `<lastmod>${modificado}</lastmod>` : ''}</url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** Consulta la API y guarda el resultado. Varias llamadas simultáneas comparten la misma consulta. */
function regenerar(): Promise<string | null> {
  enCurso ??= generarSitemap().finally(() => (enCurso = null));
  return enCurso.then(
    (xml) => {
      cache = { xml, timestamp: Date.now() };
      return xml;
    },
    (error) => {
      console.error('No se pudo generar el sitemap:', error);
      return null;
    }
  );
}

/**
 * Devuelve el sitemap, que se regenera como mucho una vez por hora.
 * Si ya hay una versión, se responde con ella al instante y se actualiza en segundo plano; así una API lenta
 * o caída nunca deja a los buscadores esperando. Solo devuelve null si todavía no se pudo generar ninguna.
 */
/** Listados con inmuebles según la última generación del sitemap; null si todavía no se ha generado ninguna. */
export function obtenerIndiceListados(): IndiceListados | null {
  return indiceListados;
}

export async function obtenerSitemap(): Promise<string | null> {
  if (!cache) return regenerar();
  if (Date.now() - cache.timestamp >= SITEMAP_TTL_MS) void regenerar();
  return cache.xml;
}
