import { Component, EventEmitter, Input, Output } from '@angular/core';
import { WishlistServiceService } from '../../../../core/wishlist/wishlist-service.service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RutaFichaPipe } from '../../../../shared/pipes/ruta-ficha.pipe';

/** Clave del navegador donde se recuerda si el panel quedó retraído ('1') o desplegado ('0'). */
const CLAVE_MINIMIZADO = 'recorrido_minimizado';

@Component({
  selector: 'app-offcanvas-wishlist',
  standalone: true,
  imports: [CommonModule, RouterLink, RutaFichaPipe],
  templateUrl: './offcanvas-wishlist.component.html',
  styleUrl: './offcanvas-wishlist.component.scss'
})
export class OffcanvasWishlistComponent {

  favoritos: any[] = [];

  /**
   * La página cambia este valor cada vez que se toca el carrito del menú (es un interruptor y puede quedar desfasado
   * de lo que se ve). Por eso cada cambio se toma como un clic: si el panel no está abierto lo abre, y si lo está lo
   * retrae a la píldora. Abrirlo también deshace el "ocultar" de la píldora.
   */
  @Input() set visible(valor: boolean) {
    if (this.inicializado && valor !== this.ultimoValorPagina) {
      if (this.panelAbierto) {
        this.cambiarMinimizado(true);
      } else {
        this.oculto = false;
        this.visibleInterno = true;
        this.cambiarMinimizado(false);
      }
    } else if (valor) {
      this.visibleInterno = true;
    }
    this.ultimoValorPagina = valor;
  }
  get visible(): boolean {
    return this.visibleInterno;
  }
  private visibleInterno = false;
  private ultimoValorPagina = false;
  private inicializado = false;

  /** La píldora se ocultó con su X: vuelve al agregar un inmueble o al tocar el carrito del menú. */
  oculto = false;

  /**
   * Estado retraído en computador. La página puede sugerirlo, pero si el usuario ya eligió uno
   * (queda guardado en el navegador) se respeta su elección.
   */
  @Input() set minimizado(valor: boolean) {
    this._minimizado = this.leerPreferencia() ?? valor;
  }
  get minimizado(): boolean {
    return this._minimizado;
  }
  private _minimizado = false;

  @Output() visibleModalRecorrido = new EventEmitter<void>();

  @Output() visiblePadre = new EventEmitter<boolean>();

  @Output() cerrarNotificacion = new EventEmitter<void>();


  constructor(private favService: WishlistServiceService) { }

  ngOnInit(): void {
    let cantidadAnterior: number | null = null;
    this.favService.favoritos$.subscribe(favs => {
      // Al agregar un inmueble, en computador se despliega para mostrarlo; en celular el panel taparía la
      // pantalla, así que solo reaparece la píldora. Al cargar la página se respeta lo guardado.
      const agregoUno = cantidadAnterior !== null && favs.length > cantidadAnterior;
      if (favs.length > 0) this.visibleInterno = true;
      if (agregoUno) {
        this.oculto = false;
        if (!this.esCelular()) this.cambiarMinimizado(false);
        else if (!this.panelAbierto) this.cambiarMinimizado(true);
      }
      cantidadAnterior = favs.length;
      this.favoritos = favs;
    });
    this.inicializado = true;
  }

  /** La X de la píldora: la quita de la pantalla sin borrar el recorrido. */
  ocultar(): void {
    this.oculto = true;
  }

  /** Panel completo a la vista (en celular a pantalla completa; en computador como ventana abajo a la derecha). */
  get panelAbierto(): boolean {
    return this.visible && !this.oculto && !this.minimizado;
  }

  /** Píldora retraída: solo si hay inmuebles en el recorrido. */
  get pildoraVisible(): boolean {
    return this.visible && !this.oculto && this.minimizado && this.favoritos.length > 0;
  }



  abrirModalRecorrido(){
    this.visibleModalRecorrido.emit()

  }

  /** En celular el panel tapa toda la pantalla: al abrir un inmueble se retrae para que se vea la ficha. */
  alAbrirInmueble(): void {
    if (this.esCelular()) this.cambiarMinimizado(true);
  }

  /** Pantallas donde el panel abierto ocupa toda la pantalla. */
  private esCelular(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 1023.98px)').matches;
  }

  cerrar(): void {
    // Con inmuebles en el recorrido se retrae a la píldora; sin ellos desaparece.
    if (this.favoritos.length) this.cambiarMinimizado(true);
    else this.visibleInterno = false;
    this.cerrarNotificacion.emit();
  }

  toggleMinimizado() {
    this.cambiarMinimizado(!this.minimizado);
  }

  eliminar(codigo: string): void {
    this.favService.eliminar(codigo);
  }

  limpiar(): void {
    this.favService.eliminarAll();
    this.favoritos = [];
    this.visibleInterno = false;
    this.cerrarNotificacion.emit();
  }

  private cambiarMinimizado(valor: boolean): void {
    this._minimizado = valor;
    try {
      localStorage.setItem(CLAVE_MINIMIZADO, valor ? '1' : '0');
    } catch {
      // Servidor o navegador sin almacenamiento: el estado solo dura en esta página.
    }
  }

  private leerPreferencia(): boolean | null {
    try {
      const guardado = localStorage.getItem(CLAVE_MINIMIZADO);
      return guardado === null ? null : guardado === '1';
    } catch {
      return null;
    }
  }

}
