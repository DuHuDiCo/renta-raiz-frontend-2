import { Component, Input } from '@angular/core';

/**
 * Botón para compartir la ficha de un inmueble o el perfil de un asesor. En celulares y tabletas abre el menú nativo del sistema
 * (WhatsApp, Instagram, correo…); donde no existe, muestra WhatsApp, Facebook y "Copiar enlace".
 */
@Component({
  selector: 'app-compartir-inmueble',
  standalone: true,
  templateUrl: './compartir-inmueble.component.html',
})
export class CompartirInmuebleComponent {
  /** Dirección pública y limpia de la ficha (sin parámetros de campaña). */
  @Input({ required: true }) url = '';
  /** Encabezado de la ficha: "Apartamento en arriendo en El Poblado, Medellín". */
  @Input() titulo = '';
  /** Texto del botón. */
  @Input() etiqueta = 'Compartir inmueble';
  /** Mensaje que acompaña el enlace. Por defecto, el de la ficha de un inmueble. */
  @Input() mensaje = '';
  /** Nombre del evento en Google Tag Manager. */
  @Input() evento = 'compartir_inmueble';
  /** 'oscuro' para fondos azul marino (perfil del asesor). */
  @Input() variante: 'claro' | 'oscuro' = 'claro';

  opcionesAbiertas = false;
  copiado = false;

  get textoMensaje(): string {
    return this.mensaje || `Mira este inmueble de Renta Raíz: ${this.titulo}`.trim();
  }

  get enlaceWhatsapp(): string {
    return `https://wa.me/?text=${encodeURIComponent(`${this.textoMensaje}\n${this.url}`)}`;
  }

  get enlaceFacebook(): string {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.url)}`;
  }

  async compartir(): Promise<void> {
    const nav = navigator as Navigator & { share?: (datos: ShareData) => Promise<void> };
    // Solo en pantallas táctiles: en Windows y Mac el menú nativo es poco práctico.
    const tactil = window.matchMedia('(pointer: coarse)').matches;
    if (tactil && nav.share) {
      try {
        await nav.share({ title: this.titulo, text: this.textoMensaje, url: this.url });
        this.registrar('nativo');
      } catch {
        // El usuario cerró el menú del sistema: no es un error.
      }
      return;
    }
    this.opcionesAbiertas = !this.opcionesAbiertas;
  }

  async copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.url);
    } catch {
      // Navegadores sin permiso al portapapeles: se copia con un campo temporal.
      const campo = document.createElement('textarea');
      campo.value = this.url;
      document.body.appendChild(campo);
      campo.select();
      document.execCommand('copy');
      campo.remove();
    }
    this.copiado = true;
    this.registrar('copiar');
    setTimeout(() => (this.copiado = false), 2500);
  }

  /** Evento para Google Tag Manager. */
  registrar(medio: string): void {
    const capa = ((window as any).dataLayer = (window as any).dataLayer || []);
    capa.push({ event: this.evento, medio, url: this.url });
  }
}
