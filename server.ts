import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';
import compression from 'compression';
import { ESTADO_HTTP, EstadoHttp } from './src/app/core/seo/estado-http';
import { obtenerSitemap } from './sitemap';

// Configuración básica de caché
const CACHE_SIZE_LIMIT = 100; // Solo guardar las últimas 100 páginas
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 Hora de vida

// Parámetros de campaña/seguimiento: no cambian el HTML, así que no forman parte de la clave de caché.
const PARAMETROS_SEGUIMIENTO = /^(utm_.+|fbclid|gclid|gbraid|wbraid|msclkid|_gl)$/i;

function claveDeCache(originalUrl: string): string {
  const [ruta, consulta = ''] = originalUrl.split('?');
  const parametros = new URLSearchParams(consulta);
  for (const nombre of [...parametros.keys()]) {
    if (PARAMETROS_SEGUIMIENTO.test(nombre)) parametros.delete(nombre);
  }
  parametros.sort();
  const resto = parametros.toString();
  return resto ? `${ruta}?${resto}` : ruta;
}

interface CacheEntry {
  html: string;
  timestamp: number;
}

export function app(): express.Express {
  const server = express();

  // OPTIMIZACIÓN: No comprimir respuestas que ya son pequeñas o binarias
  server.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false; // Permitir bypass
      }
      // El filtro por defecto de compression maneja bien text/html, json, etc.
      return compression.filter(req, res);
    }
  }));

  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // CACHE EN MEMORIA (Seguro)
  const pageCache = new Map<string, CacheEntry>();

  // Sitemap generado desde el inventario real. Va antes de los estáticos porque '*.*' también captura esta ruta.
  server.get('/sitemap.xml', async (req, res) => {
    const xml = await obtenerSitemap();
    if (!xml) {
      res.setHeader('Retry-After', '300');
      res.status(503).send('Sitemap no disponible temporalmente');
      return;
    }
    res.type('application/xml').send(xml);
  });

  // Servir archivos estáticos
  server.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y',
    etag: false // Deshabilita etag para ahorrar procesamiento en estáticos cacheados
  }));

  // Rutas Angular
  server.get('*', async (req, res, next) => {
    try {
      const { protocol, originalUrl, baseUrl, headers } = req;
      
      // SEGURIDAD: Nunca cachear si hay cookies de sesión o auth headers
      // Ajusta 'Authorization' o el nombre de tu cookie de sesión
      const hasAuth = headers['authorization'] || headers['cookie']?.includes('token');

      const urlKey = claveDeCache(originalUrl);

      // 1. Intentar servir desde caché
      if (!hasAuth && pageCache.has(urlKey)) {
        const entry = pageCache.get(urlKey)!;
        // Verificar expiración (TTL)
        if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
          return res.send(entry.html);
        } else {
          pageCache.delete(urlKey); // Borrar si expiró
        }
      }

      // 2. Renderizar (SSR). La app fija aquí el código de respuesta (404, 503) cuando corresponde.
      const estadoHttp: EstadoHttp = { codigo: 200 };
      const html = await commonEngine.render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [
          { provide: APP_BASE_HREF, useValue: baseUrl },
          { provide: ESTADO_HTTP, useValue: estadoHttp },
        ],
      });

      // 3. Guardar en caché solo las páginas correctas y si no es usuario autenticado
      if (!hasAuth && estadoHttp.codigo === 200) {
        // Limpieza preventiva de memoria
        if (pageCache.size > CACHE_SIZE_LIMIT) {
            pageCache.clear(); // O estrategia más compleja, pero clear() evita el crash
        }
        
        pageCache.set(urlKey, {
          html,
          timestamp: Date.now()
        });
      }

      if (estadoHttp.codigo === 503) res.setHeader('Retry-After', '300');
      res.status(estadoHttp.codigo).send(html);
      return;
    } catch (err) {
      next(err);
      return;
    }
  });

  return server;
}

function run(): void {
  // IMPORTANTE: Usar variable de entorno para el puerto (necesario en nubes como Azure/Heroku/Google Cloud)
  const port = process.env['PORT'] || 4000;

  const server = app();
  // Deja el sitemap listo desde el arranque para que la primera consulta no tenga que esperar a la API.
  void obtenerSitemap();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();