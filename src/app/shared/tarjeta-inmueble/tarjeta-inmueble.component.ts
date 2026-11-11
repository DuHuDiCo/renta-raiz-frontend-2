import { environment } from '../../../environments/environment';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RutaFichaPipe } from '../pipes/ruta-ficha.pipe';
import { WishlistServiceService } from '../../core/wishlist/wishlist-service.service';
import { resumenInmueble } from '../../core/listados/listados';
import { SEO_DOMINIO } from '../../core/seo/seo.service';
import { CompartirInmuebleComponent } from '../compartir-inmueble/compartir-inmueble.component';
import { InmueblesEnPantallaService } from '../../core/asistente/inmuebles-en-pantalla.service';

/** Nivel de la propiedad según su precio, para el distintivo de la tarjeta. */
interface NivelInmueble {
  icono: string;
  titulo: string;
}

/**
 * Tarjeta de un inmueble en los listados (resultados, destacados del inicio): foto, precio, barrio,
 * descripción y características. Toda la tarjeta lleva a la ficha; el carrito lo maneja quien la usa.
 * Sobre la foto lleva el botón para compartir la ficha.
 */
@Component({
  selector: 'app-tarjeta-inmueble',
  standalone: true,
  imports: [RouterLink, TitleCasePipe, RutaFichaPipe, CompartirInmuebleComponent],
  templateUrl: './tarjeta-inmueble.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
})
export class TarjetaInmuebleComponent implements OnInit, OnDestroy {
  /** false: "Mi recorrido" desactivado temporalmente (environment.recorridoActivo). */
  readonly recorridoActivo = environment.recorridoActivo;
  @Input({ required: true }) inmueble: any;

  /** Avisa al asistente qué inmuebles hay en pantalla ("¿cuál de estos es el más barato?"). */
  private enPantalla = inject(InmueblesEnPantallaService);
  private codigoRegistrado: unknown = null;

  ngOnInit(): void {
    this.codigoRegistrado = this.inmueble?.codpro;
    this.enPantalla.registrar(this.codigoRegistrado);
  }

  ngOnDestroy(): void {
    this.enPantalla.quitar(this.codigoRegistrado);
  }
  /** Marca la tarjeta con un borde dorado (p. ej., la respuesta del chat con IA). */
  @Input() resaltado = false;
  /** Muestra la cinta "Destacado" junto al tipo de negocio. */
  @Input() destacado = false;
  /** Tamaño más amplio para secciones de pocas tarjetas, como los destacados del inicio. */
  @Input() grande = false;
  /** Abre la ficha en otra pestaña (perfil del asesor, prioritarios, blog). */
  @Input() nuevaPestana = false;

  @Output() agregarCarrito = new EventEmitter<any>();

  /** Inmuebles del recorrido; al ser una señal, la tarjeta (OnPush) se repinta cuando cambia. */
  private recorrido = toSignal(inject(WishlistServiceService).favoritos$, { initialValue: [] as any[] });

  /** Ya está en el recorrido: el carrito no se muestra. */
  enRecorrido(): boolean {
    const codigo = String(this.inmueble?.codpro ?? '');
    return !!codigo && this.recorrido().some((favorito) => String(favorito?.codpro) === codigo);
  }

  get nivel(): NivelInmueble | null {
    const venta = Number(this.inmueble?.saleprice) || 0;
    const arriendo = Number(this.inmueble?.rent) || 0;
    if (venta > 2_000_000_000 || arriendo > 15_000_000) return { icono: 'fa-gem text-blue-500', titulo: 'Propiedad diamante' };
    if (venta > 1_000_000_000 || arriendo >= 8_000_000) return { icono: 'fa-crown text-yellow-500', titulo: 'Propiedad oro' };
    if (venta >= 100_000_000 || arriendo >= 2_000_000) return { icono: 'fa-medal text-gray-400', titulo: 'Propiedad plata' };
    return null;
  }

  get esArriendo(): boolean {
    return String(this.inmueble?.biz || '').trim().toLowerCase() === 'arriendo';
  }

  /** "2.600.000.000" → "$2.600.000.000"; sin precio, null. */
  get precio(): string | null {
    const formateado = String(this.inmueble?.price_format || '').trim();
    if (formateado) return formateado.startsWith('$') ? formateado : `$${formateado}`;
    const valor = Number(this.inmueble?.price);
    return valor ? `$${valor.toLocaleString('es-CO')}` : null;
  }

  /** Título y dirección pública de la ficha para compartir: los mismos que usa el botón de la ficha. */
  get compartir(): { titulo: string; url: string } {
    const resumen = resumenInmueble(this.inmueble, SEO_DOMINIO);
    return { titulo: resumen.titulo, url: resumen.url };
  }

  /** El botón del carrito solo aparece si quien usa la tarjeta escucha `agregarCarrito`. */
  get conCarrito(): boolean {
    return this.agregarCarrito.observed;
  }

  carrito(evento: Event): void {
    evento.preventDefault();
    evento.stopPropagation();
    this.agregarCarrito.emit(this.inmueble);
  }
}
