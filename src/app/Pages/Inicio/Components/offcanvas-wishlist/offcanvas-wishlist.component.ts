import { Component, EventEmitter, Input, Output } from '@angular/core';
import { WishlistServiceService } from '../../../../core/wishlist/wishlist-service.service';
import { CommonModule } from '@angular/common';

/** Clave del navegador donde se recuerda si el panel quedó retraído ('1') o desplegado ('0'). */
const CLAVE_MINIMIZADO = 'recorrido_minimizado';

@Component({
  selector: 'app-offcanvas-wishlist',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './offcanvas-wishlist.component.html',
  styleUrl: './offcanvas-wishlist.component.scss'
})
export class OffcanvasWishlistComponent {

  favoritos: any[] = [];
  @Input() visible = false;

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
      // Al agregar un inmueble se despliega para mostrarlo; al cargar la página se respeta lo guardado.
      const agregoUno = cantidadAnterior !== null && favs.length > cantidadAnterior;
      if (favs.length > 0) this.visible = true;
      if (agregoUno) this.cambiarMinimizado(false);
      cantidadAnterior = favs.length;
      this.favoritos = favs;
    });
  }



  abrirModalRecorrido(){
    this.visibleModalRecorrido.emit()

  }

  cerrar(): void {
    this.visible = false;
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
    this.cerrar();
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
