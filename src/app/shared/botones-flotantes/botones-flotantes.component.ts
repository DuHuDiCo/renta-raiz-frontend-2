import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WishlistServiceService } from '../../core/wishlist/wishlist-service.service';

@Component({
  selector: 'app-botones-flotantes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './botones-flotantes.component.html',
  styleUrl: './botones-flotantes.component.scss'
})
export class BotonesFlotantesComponent implements OnInit {
  /** false: "Mi recorrido" desactivado temporalmente (environment.recorridoActivo). */
  readonly recorridoActivo = environment.recorridoActivo;

  @Input() hideWhatsApp: boolean = false;

  @Output() abrir = new EventEmitter<void>();

  favService = inject(WishlistServiceService);

  router = inject(ActivatedRoute)

  mostrarBotonWhatsapp: boolean = false;

  routeValidatedbotomWhatsapp: string[] = ["prioritarios"]
  cantidadInmuebles:number = 0

  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  ngOnInit(): void {
    this.mostrarBotonWhatsapp = this.routeValidatedbotomWhatsapp.includes(
      this.router.snapshot.url.toString()
    );
   
  }

  vistaAnterior(): void {
    window.history.back();
  }


  abrirOffcanvas() {
    this.abrir.emit()
  }
}
