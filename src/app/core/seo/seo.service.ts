import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ESTADO_HTTP } from './estado-http';

export interface DatosSeo {
  titulo: string;
  descripcion: string;
  /** Ruta de la página sin dominio ni parámetros, por ejemplo '/quienes-somos'. Se usa para el canonical. */
  ruta: string;
  /** URL absoluta de la imagen para redes sociales. Si no se envía se usa la imagen general del portal. */
  imagen?: string;
  /** true para páginas que no deben aparecer en buscadores. */
  noindex?: boolean;
  tipo?: 'website' | 'article';
  /** Imagen principal de la página (la que se ve al abrir). Se precarga para que aparezca antes. */
  precarga?: string;
  /** Bloques schema.org (JSON-LD) de la página. Si no se envían se elimina el bloque anterior. */
  datosEstructurados?: object[];
}

export const SEO_DOMINIO = 'https://rentaraiz.co';
export const SEO_SUFIJO = ' | Renta Raíz';
const IMAGEN_POR_DEFECTO = `${SEO_DOMINIO}/assets/images/vistaInicial-slider-redimensiando.png`;

const ID_AGENCIA = `${SEO_DOMINIO}/#agencia`;
const ID_JSON_LD = 'seo-json-ld';
const ID_PRECARGA = 'seo-precarga';

/** Referencia corta a la agencia para usarla como autor, vendedor o editor en otros bloques. */
export const SEO_REF_AGENCIA = { '@type': 'RealEstateAgent', '@id': ID_AGENCIA, name: 'Renta Raíz' };

/** Datos de la empresa tal como aparecen en el pie de página y en la página de contacto. */
export const SEO_AGENCIA = {
  '@type': 'RealEstateAgent',
  '@id': ID_AGENCIA,
  name: 'Renta Raíz',
  legalName: 'Renta Raíz S.A.S.',
  url: SEO_DOMINIO,
  logo: `${SEO_DOMINIO}/assets/images/RR%20DORADO.png`,
  image: IMAGEN_POR_DEFECTO,
  telephone: '+576043227088',
  contactPoint: [
    { '@type': 'ContactPoint', contactType: 'customer service', telephone: '+576043227088', areaServed: 'CO', availableLanguage: 'es' },
    { '@type': 'ContactPoint', contactType: 'sales', telephone: '+573145438665', areaServed: 'CO', availableLanguage: 'es' },
  ],
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Carrera 43A #9 Sur - 234, Square Trade and Home P.H.',
    addressLocality: 'Medellín',
    addressRegion: 'Antioquia',
    addressCountry: 'CO',
  },
  areaServed: ['Medellín', 'Envigado', 'Sabaneta', 'Itagüí', 'La Estrella', 'Rionegro', 'La Ceja'].map((name) => ({
    '@type': 'City',
    name,
  })),
  sameAs: [
    'https://www.instagram.com/rentaraiz/',
    'https://www.facebook.com/rentaraizsas',
    'https://x.com/renta_raiz',
    'https://www.youtube.com/@rentaraiz',
  ],
};

export const SEO_SITIO_WEB = {
  '@type': 'WebSite',
  '@id': `${SEO_DOMINIO}/#sitio`,
  url: SEO_DOMINIO,
  name: 'Renta Raíz',
  inLanguage: 'es-CO',
  publisher: { '@id': ID_AGENCIA },
};

/** Ruta de navegación (BreadcrumbList). Cada elemento es [nombre, ruta sin dominio]. */
export function seoMigas(elementos: [string, string][]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: elementos.map(([name, ruta], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: `${SEO_DOMINIO}${ruta === '/' ? '' : ruta}`,
    })),
  };
}

export const SEO_POR_DEFECTO = {
  titulo: 'Renta Raíz | Inmobiliaria en Medellín y el Valle de Aburrá',
  descripcion:
    'Apartamentos, casas, oficinas y locales para arrendar o comprar en Medellín, Envigado, Sabaneta, Itagüí y el Oriente antioqueño. Asesoría experta.',
};

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);
  private estadoHttp = inject(ESTADO_HTTP, { optional: true });

  /**
   * Código HTTP de la respuesta del servidor (404 no existe, 503 fallo temporal). En el navegador no hace nada.
   * No pisa un código de error ya fijado, para que la página 404 no oculte un 503.
   */
  responderCon(codigo: number) {
    if (this.estadoHttp && this.estadoHttp.codigo === 200) this.estadoHttp.codigo = codigo;
  }

  actualizar(datos: DatosSeo) {
    const descripcion = this.recortar(datos.descripcion, 160);
    const url = `${SEO_DOMINIO}${datos.ruta === '/' ? '' : datos.ruta}`;
    const imagen = datos.imagen || IMAGEN_POR_DEFECTO;

    this.title.setTitle(datos.titulo);
    this.meta.updateTag({ name: 'description', content: descripcion });
    this.meta.updateTag({ name: 'robots', content: datos.noindex ? 'noindex, follow' : 'index, follow' });

    this.meta.updateTag({ property: 'og:type', content: datos.tipo || 'website' });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:title', content: datos.titulo });
    this.meta.updateTag({ property: 'og:description', content: descripcion });
    this.meta.updateTag({ property: 'og:image', content: imagen });
    // Las dimensiones fijas de index.html solo valen para la imagen general del portal.
    if (datos.imagen) {
      this.meta.removeTag("property='og:image:type'");
      this.meta.removeTag("property='og:image:width'");
      this.meta.removeTag("property='og:image:height'");
    }

    this.meta.updateTag({ name: 'twitter:title', content: datos.titulo });
    this.meta.updateTag({ name: 'twitter:description', content: descripcion });
    this.meta.updateTag({ name: 'twitter:image', content: imagen });

    this.actualizarCanonical(url);
    this.actualizarDatosEstructurados(datos.datosEstructurados);
    this.actualizarPrecarga(datos.precarga);
  }

  private actualizarCanonical(url: string) {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private actualizarPrecarga(imagen?: string) {
    let link = this.document.getElementById(ID_PRECARGA);
    if (!imagen) {
      link?.remove();
      return;
    }
    if (!link) {
      link = this.document.createElement('link');
      link.id = ID_PRECARGA;
      link.setAttribute('rel', 'preload');
      link.setAttribute('as', 'image');
      link.setAttribute('fetchpriority', 'high');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', imagen);
  }

  private actualizarDatosEstructurados(bloques?: object[]) {
    let script = this.document.getElementById(ID_JSON_LD);
    if (!bloques?.length) {
      script?.remove();
      return;
    }
    if (!script) {
      script = this.document.createElement('script');
      script.id = ID_JSON_LD;
      script.setAttribute('type', 'application/ld+json');
      this.document.head.appendChild(script);
    }
    // Se escapa "<" para que ningún texto (p. ej. la descripción de un inmueble) pueda cerrar la etiqueta script.
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': bloques }).replace(/</g, '\\u003c');
  }

  /** Deja el texto en una sola línea y lo corta en un espacio si supera el máximo. */
  private recortar(texto: string, maximo: number): string {
    const limpio = (texto || '').replace(/\s+/g, ' ').trim();
    if (limpio.length <= maximo) return limpio;
    const corte = limpio.slice(0, maximo - 1);
    return `${corte.slice(0, corte.lastIndexOf(' '))}…`;
  }
}
