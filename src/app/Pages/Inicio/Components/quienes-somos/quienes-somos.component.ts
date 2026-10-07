import { Component, inject, OnInit } from '@angular/core';
import { NavbarComponent } from '../../../../shared/navbar/navbar.component';
import { BotonesFlotantesComponent } from "../../../../shared/botones-flotantes/botones-flotantes.component";
import { FooterComponent } from "../../../../shared/footer/footer.component";
import { VolverComponent } from "../../../../shared/volver/volver.component";
import { BarraFiltrosComponent } from "../../../../shared/barra-filtros/barra-filtros.component";
import { OffcanvasWishlistComponent } from '../offcanvas-wishlist/offcanvas-wishlist.component';
import { ModalWishlistComponent } from '../../../../shared/modal-wishlist/modal-wishlist.component';
import { WishlistServiceService } from '../../../../core/wishlist/wishlist-service.service';

@Component({
  selector: 'app-quienes-somos',
  standalone: true,
  imports: [NavbarComponent, BotonesFlotantesComponent, FooterComponent, VolverComponent, BarraFiltrosComponent, OffcanvasWishlistComponent, ModalWishlistComponent],
  templateUrl: './quienes-somos.component.html',
  styleUrl: './quienes-somos.component.scss'
})
export class QuienesSomosComponent implements OnInit {

  mostrarModalRecorrido = false

  mostrarOffcanvas: boolean = false;
  minimizarOffcanvas: boolean = true;

  favService = inject(WishlistServiceService);

  ngOnInit(): void {
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }

  abrirPestana(url: string) {
    window.open(url, '_blank');
  }

  agregarFavorito(propiedad: any) {


    this.favService.agregar(propiedad);


  }

  sincronizarCierre() {
    console.log("El hijo me avisó que se cerró. Sincronizando variables...");

    // Forzamos las variables a FALSE (no usamos toggle/signo de exclamación aquí)
    this.mostrarOffcanvas = false;
    this.minimizarOffcanvas = false;
    console.log(this.minimizarOffcanvas);

  }

  recibirValorModalRecorrido() {
    this.mostrarModalRecorrido = true;
  }

    toggleOffcanvas() {
    this.mostrarOffcanvas = !this.mostrarOffcanvas;
    setTimeout(() => {
      this.minimizarOffcanvas = !this.minimizarOffcanvas;
    }, 100);

    console.log("minimizado"+this.minimizarOffcanvas);
    
  }


}
