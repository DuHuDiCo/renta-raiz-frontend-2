import { Component, DestroyRef, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WishlistServiceService } from '../../core/wishlist/wishlist-service.service';

/**
 * Botón de la ficha para agregar el inmueble al recorrido (la misma lista del carrito de los listados).
 * Si ya está, lo indica y deja quitarlo o ir directo a agendar la visita.
 */
@Component({
  selector: 'app-boton-recorrido',
  standalone: true,
  templateUrl: './boton-recorrido.component.html',
  host: { class: 'block' },
})
export class BotonRecorridoComponent implements OnInit {
  private favoritos = inject(WishlistServiceService);
  private destruir = inject(DestroyRef);

  /** El inmueble tal como llega de la ficha (GET /properties/:codpro). */
  @Input({ required: true }) inmueble: any;
  /** Pide a la página que abra el formulario de disponibilidad. */
  @Output() agendar = new EventEmitter<void>();

  enRecorrido = false;
  cantidad = 0;
  /** Texto breve tras agregar, para que se note que entró. */
  recienAgregado = false;
  private ocultarAviso?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.favoritos.favoritos$.pipe(takeUntilDestroyed(this.destruir)).subscribe((lista) => {
      this.cantidad = lista.length;
      this.enRecorrido = lista.some((f: any) => Number(f.codpro) === Number(this.inmueble?.codpro));
    });
  }

  agregar(): void {
    if (!this.inmueble?.codpro) return;
    // Las tarjetas del recorrido usan la foto principal (image1); la ficha trae las fotos en `images`.
    const foto = this.inmueble.image1 || this.inmueble.images?.find((i: any) => i?.imageurl)?.imageurl || '';
    this.favoritos.agregar({ ...this.inmueble, image1: foto });
    this.recienAgregado = true;
    clearTimeout(this.ocultarAviso);
    this.ocultarAviso = setTimeout(() => (this.recienAgregado = false), 2500);
    this.registrar('recorrido_agregar_ficha');
  }

  quitar(): void {
    this.favoritos.eliminar(this.inmueble.codpro);
    this.recienAgregado = false;
    this.registrar('recorrido_quitar_ficha');
  }

  /** Evento para Google Tag Manager. */
  private registrar(evento: string): void {
    const capa = ((window as any).dataLayer = (window as any).dataLayer || []);
    capa.push({ event: evento, codpro: this.inmueble?.codpro });
  }
}
