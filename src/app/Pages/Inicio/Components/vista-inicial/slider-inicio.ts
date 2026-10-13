import { PrecargaImagen } from '../../../../core/seo/seo.service';

/**
 * Fotos del slider del inicio. Cada una tiene varias versiones para que el navegador descargue
 * solo la que necesita:
 *  - `movil`: recorte central (el slider en vertical solo muestra el centro de la foto).
 *  - `srcset`: la foto completa en 1400, 1920 y 2878 px de ancho.
 */
export interface FotoSlider {
  /** Foto completa a tamaño original; respaldo para navegadores sin `srcset`. */
  base: string;
  srcset: string;
  movil: string;
  alt: string;
}

/** Celulares y tabletas en vertical: el slider es casi cuadrado y recorta los lados de la foto. */
export const SLIDER_MEDIA_MOVIL = '(max-width: 1023px) and (orientation: portrait)';
/** Lo contrario de SLIDER_MEDIA_MOVIL. */
export const SLIDER_MEDIA_ESCRITORIO = '(min-width: 1024px), (orientation: landscape)';
/** El slider ocupa todo el ancho y el 60 % del alto; la foto (casi 3:1) se ajusta al mayor de los dos. */
export const SLIDER_SIZES = 'max(100vw, 178vh)';

function fotoSlider(numero: number, alt: string): FotoSlider {
  const ruta = `/assets/images/vistaInicial-slider-${numero}`;
  return {
    base: `${ruta}.webp`,
    srcset: `${ruta}-1400.webp 1400w, ${ruta}-1920.webp 1920w, ${ruta}.webp 2878w`,
    movil: `${ruta}-movil.webp`,
    alt,
  };
}

export const SLIDER_INICIO: FotoSlider[] = [
  fotoSlider(1, 'Familia buscando inmueble en un portátil desde la sala de su casa'),
  fotoSlider(2, 'Pareja frente a una casa moderna de lujo'),
  fotoSlider(3, 'Asesor inmobiliario entregando las llaves de una casa'),
];

/** Precarga de la primera foto: una entrada por versión, para que cada dispositivo pida solo la suya. */
export const SLIDER_PRECARGA: PrecargaImagen[] = [
  { href: SLIDER_INICIO[0].movil, media: SLIDER_MEDIA_MOVIL },
  { href: SLIDER_INICIO[0].base, srcset: SLIDER_INICIO[0].srcset, sizes: SLIDER_SIZES, media: SLIDER_MEDIA_ESCRITORIO },
];
