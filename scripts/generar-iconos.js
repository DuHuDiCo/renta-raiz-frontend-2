/**
 * Genera src/styles/fontawesome.css con solo los iconos de FontAwesome que usa el sitio.
 * El CSS completo (all.min.css) trae unos 2.000 iconos; el build de producción usa este recorte.
 * Corre solo antes de `npm run build` (prebuild). En desarrollo se usa el CSS completo,
 * así que un icono nuevo se ve de inmediato y entra al recorte en el siguiente build.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ORIGEN = path.join(RAIZ, 'node_modules/@fortawesome/fontawesome-free/css/all.min.css');
const DESTINO = path.join(RAIZ, 'src/styles/fontawesome.css');
const FUENTES = '../../node_modules/@fortawesome/fontawesome-free/webfonts/';

/** Todas las clases fa-* escritas en el código (plantillas y TypeScript). */
function iconosUsados(carpeta, usados = new Set()) {
  for (const entrada of fs.readdirSync(carpeta, { withFileTypes: true })) {
    const ruta = path.join(carpeta, entrada.name);
    if (entrada.isDirectory()) iconosUsados(ruta, usados);
    else if (/\.(html|ts)$/.test(entrada.name)) {
      for (const clase of fs.readFileSync(ruta, 'utf8').match(/\bfa-[a-z0-9]+(?:-[a-z0-9]+)*/g) || []) usados.add(clase);
    }
  }
  return usados;
}

/** Separa el CSS en bloques de primer nivel: [selector, cuerpo]. */
function bloques(css) {
  const resultado = [];
  let inicio = 0, apertura = -1, nivel = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') { if (nivel++ === 0) apertura = i; }
    else if (css[i] === '}' && --nivel === 0) {
      resultado.push([css.slice(inicio, apertura).trim(), css.slice(apertura + 1, i)]);
      inicio = i + 1;
    }
  }
  return resultado;
}

const nombreClase = (selector) => selector.replace(/^\./, '').replace(/:.*$/, '');

const usados = iconosUsados(path.join(RAIZ, 'src'));
const css = fs.readFileSync(ORIGEN, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const salida = [];
const encontrados = new Set();

for (const [selector, cuerpo] of bloques(css)) {
  // Fuente de compatibilidad con FontAwesome 4: el sitio no usa esas clases.
  if (cuerpo.includes('fa-v4compatibility')) continue;

  // Reglas de un icono concreto: .fa-house,.fa-home{--fa:"\f015"}
  if (/^--fa:[^;]+$/.test(cuerpo.trim()) && !selector.startsWith('@')) {
    const enUso = selector.split(',').map((s) => s.trim()).filter((s) => usados.has(nombreClase(s)));
    if (!enUso.length) continue;
    enUso.forEach((s) => encontrados.add(nombreClase(s)));
    salida.push(`${enUso.join(',')}{${cuerpo}}`);
    continue;
  }

  // El resto (clases base, tamaños, animaciones, @font-face) se conserva tal cual.
  salida.push(`${selector}{${cuerpo.replace(/\.\.\/webfonts\//g, FUENTES)}}`);
}

const cabecera =
  '/* GENERADO por scripts/generar-iconos.js a partir de FontAwesome. No editar a mano:\n' +
  '   para sumar un icono basta con usar su clase fa-* en el código y volver a compilar. */\n';
fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
fs.writeFileSync(DESTINO, cabecera + salida.join('\n') + '\n');

const kB = (archivo) => (fs.statSync(archivo).size / 1024).toFixed(1);
console.log(`FontAwesome: ${encontrados.size} iconos en uso, ${kB(DESTINO)} kB (completo: ${kB(ORIGEN)} kB)`);
