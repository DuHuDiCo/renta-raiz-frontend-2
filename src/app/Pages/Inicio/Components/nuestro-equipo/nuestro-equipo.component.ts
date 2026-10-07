import { Component, inject, OnInit } from '@angular/core';
import { NavbarComponent } from "../../../../shared/navbar/navbar.component";
import { BotonesFlotantesComponent } from "../../../../shared/botones-flotantes/botones-flotantes.component";
import { FooterComponent } from "../../../../shared/footer/footer.component";
import { VolverComponent } from "../../../../shared/volver/volver.component";
import { BarraFiltrosComponent } from "../../../../shared/barra-filtros/barra-filtros.component";
import { Router } from '@angular/router';
import { OffcanvasWishlistComponent } from '../offcanvas-wishlist/offcanvas-wishlist.component';
import { ModalWishlistComponent } from '../../../../shared/modal-wishlist/modal-wishlist.component';
import { WishlistServiceService } from '../../../../core/wishlist/wishlist-service.service';


@Component({
  selector: 'app-nuestro-equipo',
  standalone: true,
  imports: [NavbarComponent, FooterComponent, BotonesFlotantesComponent, VolverComponent, BarraFiltrosComponent, OffcanvasWishlistComponent, ModalWishlistComponent],
  templateUrl: './nuestro-equipo.component.html',
  styleUrl: './nuestro-equipo.component.scss'
})
export class NuestroEquipoComponent implements OnInit {

  asesoresCode = {
    "Juan Pablo Hoyos": "11370",
    "Sebastián Ospina": "41112",
    "Lenys Cuberos": "59504",
    "Andres Mejia": "67953",
    "David Peláez": "69627",
    "Juan Pablo Ospina": "45849"
  }

  mostrarModalRecorrido = false

  mostrarOffcanvas: boolean = false;
  minimizarOffcanvas: boolean = true;

  favService = inject(WishlistServiceService);

  router = inject(Router);


  ngOnInit(): void {
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
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

    console.log("minimizado" + this.minimizarOffcanvas);

  }

  abrirPestana(url: string) {
    window.open(url, '_blank');
  }

  abrirPortafolio(asesorCode: string) {
    this.router.navigate(['/portafolio', asesorCode]).then(() => {
      window.scrollTo(0, 0); // opcional: para que siempre inicie arriba
    });
  }

}
