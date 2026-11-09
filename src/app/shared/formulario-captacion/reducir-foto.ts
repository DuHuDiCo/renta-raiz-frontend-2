import { CALIDAD_FOTO, LADO_MAXIMO_FOTO } from '../../core/captaciones/captaciones.models';

/** La foto no se pudo leer (p. ej. HEIC en un navegador que no lo decodifica) o no es una imagen. */
export class FotoNoLegibleError extends Error {}

type Fuente = { imagen: CanvasImageSource; ancho: number; alto: number; liberar: () => void };

/**
 * Decodifica la foto respetando la orientación EXIF. Primero con createImageBitmap(…, { imageOrientation:
 * 'from-image' }); si el navegador no lo soporta o no lo logra, con un <img> (que ya aplica la orientación).
 */
async function decodificar(archivo: Blob): Promise<Fuente> {
  if (typeof createImageBitmap === 'function') {
    try {
      const mapa = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
      return { imagen: mapa, ancho: mapa.width, alto: mapa.height, liberar: () => mapa.close() };
    } catch {
      // Navegadores sin la opción, o formatos que solo <img> decodifica: se intenta abajo.
    }
  }
  const url = URL.createObjectURL(archivo);
  const img = new Image();
  try {
    img.src = url;
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new FotoNoLegibleError('No se pudo leer la imagen.');
  }
  if (!img.naturalWidth || !img.naturalHeight) {
    URL.revokeObjectURL(url);
    throw new FotoNoLegibleError('La imagen está vacía.');
  }
  return { imagen: img, ancho: img.naturalWidth, alto: img.naturalHeight, liberar: () => URL.revokeObjectURL(url) };
}

/**
 * Reduce la foto en el navegador: lado mayor a LADO_MAXIMO_FOTO (sin agrandar las pequeñas) y JPEG con
 * calidad CALIDAD_FOTO. Así pesan cientos de KB en lugar de varios MB y suben rápido desde el celular.
 */
export async function reducirFoto(archivo: File): Promise<Blob> {
  const fuente = await decodificar(archivo);
  try {
    const escala = Math.min(1, LADO_MAXIMO_FOTO / Math.max(fuente.ancho, fuente.alto));
    const ancho = Math.max(1, Math.round(fuente.ancho * escala));
    const alto = Math.max(1, Math.round(fuente.alto * escala));

    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    const contexto = lienzo.getContext('2d');
    if (!contexto) throw new FotoNoLegibleError('El navegador no pudo procesar la imagen.');
    // JPEG no tiene transparencia: un PNG con fondo transparente quedaría negro.
    contexto.fillStyle = '#ffffff';
    contexto.fillRect(0, 0, ancho, alto);
    contexto.imageSmoothingQuality = 'high';
    contexto.drawImage(fuente.imagen, 0, 0, ancho, alto);

    const blob = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, 'image/jpeg', CALIDAD_FOTO));
    if (!blob || !blob.size) throw new FotoNoLegibleError('No se pudo convertir la imagen.');
    return blob;
  } finally {
    fuente.liberar();
  }
}
