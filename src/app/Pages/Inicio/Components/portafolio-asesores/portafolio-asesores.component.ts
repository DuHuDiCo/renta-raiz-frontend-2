import { Component, ElementRef, HostListener, inject, OnInit, ViewChild } from '@angular/core';

import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { InmueblesService } from '../../../../core/Inmuebles/inmuebles.service';
import { NavbarComponent2 } from '../../../../shared/navbar-2/navbar-2.component';
import { PortafolioEnum } from '../../../../core/enums/PortafolioEnum';
import { FooterComponent } from '../../../../shared/footer/footer.component';
import { BotonesFlotantesComponent } from '../../../../shared/botones-flotantes/botones-flotantes.component';
import { FooterPortafolioComponent } from '../../../../shared/footer-portafolio/footer-portafolio.component';
import { WishlistServiceService } from '../../../../core/wishlist/wishlist-service.service';
import { OffcanvasWishlistComponent } from '../offcanvas-wishlist/offcanvas-wishlist.component';
import { ModalWishlistComponent } from '../../../../shared/modal-wishlist/modal-wishlist.component';


@Component({
  selector: 'app-portafolio-asesores',
  standalone: true,
  imports: [CommonModule, NavbarComponent2, FooterPortafolioComponent,
    BotonesFlotantesComponent, OffcanvasWishlistComponent, ModalWishlistComponent],
  templateUrl: './portafolio-asesores.component.html',
  styleUrl: './portafolio-asesores.component.scss'
})
export class PortafolioAsesoresComponent implements OnInit {

  @ViewChild('carruselVenta') carruselVenta!: ElementRef;
  @ViewChild('carruselArriendo') carruselArriendo!: ElementRef;

  mostrarModalRecorrido = false

  mostrarOffcanvas: boolean = false;
  minimizarOffcanvas: boolean = true;

  paginacionVenta: any = {};
  paginacionArriendo: any = {};
  mostrarContenido = false;
  asesorId!: string;
  filtrosSeleccionados: Map<string, any> = new Map();
  totalDatosVenta = 0;
  totalDatosArriendo = 0;
  totalPaginasVenta = 0;
  totalPaginasArriendo = 0;
  paginaActualVenta: number = 1;
  paginaActualArriendo: number = 1;
  elementsPerPage = 8;
  bloqueActualVenta: number = 0;
  bloqueActualArriendo: number = 0;
  inmueblesVisiblesArriendo: any[] = [];
  inmueblesVisiblesVenta: any[] = [];
  loadingResultadosVenta: boolean = false;
  loadingResultadosArriendo: boolean = false;
  isDrawerOpen: boolean = false;
  resultadosVenta: any[] = [];
  resultadosArriendo: any[] = [];
  paginasVenta: (number | string)[] = [];
  paginasArriendo: (number | string)[] = [];
  isSmallScreen = false;

  activatedRoute = inject(ActivatedRoute);
  router = inject(Router);
  // router = inject(Router);
  inmubeService = inject(InmueblesService);
  favService = inject(WishlistServiceService);



  ngOnInit(): void {


    this.asesorId = this.activatedRoute.snapshot.paramMap.get('asesor')!;


    // var tamano = window.innerWidth <= 1024 && window.innerWidth >= 1000;
    // var elementsPerPage = tamano ? 4 : 3;

    this.obtenerPropiedadesVenta(Number(this.asesorId), 1, this.elementsPerPage);
    this.obtenerPropiedadesArriendo(Number(this.asesorId), 1, this.elementsPerPage);

    this.toggleOffcanvas()

  }

  agregarFavorito(propiedad: any) {


    this.favService.agregar(propiedad);
    // this.toggleOffcanvas()

  }


  sincronizarCierre() {
    console.log("El hijo me avisó que se cerró. Sincronizando variables...");

    // Forzamos las variables a FALSE (no usamos toggle/signo de exclamación aquí)
    this.mostrarOffcanvas = false;
    this.minimizarOffcanvas = false;
    console.log(this.minimizarOffcanvas);

  }

  toggleOffcanvas() {
    this.mostrarOffcanvas = !this.mostrarOffcanvas;
    setTimeout(() => {
      this.minimizarOffcanvas = !this.minimizarOffcanvas;
    }, 100);

    console.log("minimizado" + this.minimizarOffcanvas);

  }


  recibirValorModalRecorrido() {
    this.mostrarModalRecorrido = true;
  }

  @HostListener('window:resize', [])
  onResize() {
    this.checkScreenSize();

    this.actualizarInmueblesVisiblesArriendo();
    this.actualizarInmueblesVisiblesVenta();
  }


  scrollCarrusel(tipo: 'venta' | 'arriendo', direccion: 'left' | 'right') {
    const carrusel = tipo === 'venta' ? this.carruselVenta : this.carruselArriendo;
    const scrollAmount = 350; // cantidad de píxeles que se moverá

    if (direccion === 'left') {
      carrusel.nativeElement.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      carrusel.nativeElement.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }


  /** En el servidor (SSR) no existe window: se asume escritorio. */
  private get anchoVentana(): number {
    return typeof window !== 'undefined' ? window.innerWidth : 1280;
  }

  private checkScreenSize() {
    this.isSmallScreen = this.anchoVentana <= 1024 && this.anchoVentana >= 800; // lg breakpoint de Tailwind


  }

  // get inmueblesVisiblesVenta() {

  //   return this.isSmallScreen
  //     ? window.innerWidth <= 1000 ? this.resultadosVenta.slice(0, 4) : this.resultadosVenta.slice(0, 3)
  //     : this.resultadosVenta.slice(0, 4);
  // }

  // get inmueblesVisiblesArriendo() {
  //   return this.isSmallScreen
  //     ? window.innerWidth <= 1000 ? this.resultadosArriendo.slice(0, 4) : this.resultadosArriendo.slice(0, 3)
  //     : this.resultadosArriendo.slice(0, 4);
  // }


  actualizarInmueblesVisiblesArriendo() {
    this.isSmallScreen = this.anchoVentana <= 1024 && this.anchoVentana >= 800; // lg breakpoint de Tailwind

    if (this.isSmallScreen) {
      this.inmueblesVisiblesArriendo =
        this.anchoVentana <= 1000
          ? this.resultadosArriendo.slice(0, this.elementsPerPage - 4)
          : this.resultadosArriendo.slice(0, this.elementsPerPage - 2);
    } else {

      this.inmueblesVisiblesArriendo = this.resultadosArriendo.slice(0, this.elementsPerPage);

    }

  }

  async actualizarInmueblesVisiblesVenta() {
    this.isSmallScreen = this.anchoVentana <= 1024 && this.anchoVentana >= 800; // lg breakpoint de Tailwind
    if (this.isSmallScreen) {
      this.inmueblesVisiblesVenta =
        this.anchoVentana <= 1000
          ? this.resultadosVenta.slice(0, this.elementsPerPage - 4)
          : this.resultadosVenta.slice(0, this.elementsPerPage - 2);
    } else {
      this.inmueblesVisiblesVenta = this.resultadosVenta.slice(0, this.elementsPerPage);
    }
  }


  verPropiedad(codPro: number) {
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/ver-propiedad', codPro, 0])
    );
    window.open(url, '_blank');
  }


  obtenerPropiedadesVenta(asesorID: number, page: number, elementsPerPage: number) {
    // this.loadingResultadosVenta = true
    this.filtrosSeleccionados.clear();
    this.filtrosSeleccionados.set('broker', asesorID);
    this.filtrosSeleccionados.set('biz', 2);



    const filtrosObj = Object.fromEntries(this.filtrosSeleccionados);


    const obj = {
      ...filtrosObj,
      page: page,
    };
    console.log(obj);

    this.inmubeService.getFiltrosEnviar(obj, elementsPerPage).subscribe(
      (data: any) => {
        this.resultadosVenta = data.data;
        this.actualizarInmueblesVisiblesVenta();
        this.totalDatosVenta = data.total;
        this.paginaActualVenta = data.current_page || 1;
        this.paginacionVenta = data;
        this.totalPaginasVenta = data.last_page || 1;
        this.paginasVenta = Array.from(
          { length: this.totalPaginasVenta },
          (_, i) => i + 1
        );



        this.generarPaginas(PortafolioEnum.VENTA);
        console.log(this.resultadosVenta);
        // this.loadingResultadosVenta = false
      },
      (error: any) => {
        console.error('Error al obtener las propiedades:', error);
      }
    );


  }

  obtenerPropiedadesArriendo(asesorID: number, page: number, elementsPerPage: number) {
    // this.loadingResultadosArriendo = true
    this.filtrosSeleccionados.clear();
    this.filtrosSeleccionados.set('broker', asesorID);
    this.filtrosSeleccionados.set('biz', 1);




    const filtrosObj = Object.fromEntries(this.filtrosSeleccionados);


    const obj = {
      ...filtrosObj,
      page: page,
    };
    console.log(obj);
    this.inmubeService.getFiltrosEnviar(obj, elementsPerPage).subscribe(
      (data: any) => {
        this.resultadosArriendo = data.data;

        this.actualizarInmueblesVisiblesArriendo();

        this.totalDatosArriendo = data.total;
        this.paginaActualArriendo = data.current_page || 1;
        this.paginacionArriendo = data;
        this.totalPaginasArriendo = data.last_page || 1;
        this.paginasArriendo = Array.from(
          { length: this.totalPaginasArriendo },
          (_, i) => i + 1
        );
        this.generarPaginas(PortafolioEnum.ARRIENDO);

        console.log(this.resultadosArriendo);
        // this.loadingResultadosArriendo = false
      },
      (error: any) => {
        console.error('Error al obtener las propiedades:', error);
      }
    );


  }




  generarPaginas(tipo: string) {
    if (tipo == PortafolioEnum.VENTA) {
      this.paginasVenta = [];
      const paginasPorBloque = 3;
      const inicio = this.bloqueActualVenta * paginasPorBloque + 1;
      const fin = Math.min(inicio + paginasPorBloque - 1, this.totalPaginasVenta);

      for (let i = inicio; i <= fin; i++) {
        this.paginasVenta.push(i);
      }

      if (fin < this.totalPaginasVenta - 1) {
        this.paginasVenta.push('...');
      }

      if (this.totalPaginasVenta > 1 && !this.paginasVenta.includes(this.totalPaginasVenta)) {
        this.paginasVenta.push(this.totalPaginasVenta);
      }

      console.log(this.paginasVenta);
    }

    if (tipo == PortafolioEnum.ARRIENDO) {
      this.paginasArriendo = [];
      const paginasPorBloque = 3;
      const inicio = this.bloqueActualArriendo * paginasPorBloque + 1;
      const fin = Math.min(inicio + paginasPorBloque - 1, this.totalPaginasArriendo);

      for (let i = inicio; i <= fin; i++) {
        this.paginasArriendo.push(i);
      }

      if (fin < this.totalPaginasArriendo - 1) {
        this.paginasArriendo.push('...');
      }

      if (this.totalPaginasArriendo > 1 && !this.paginasArriendo.includes(this.totalPaginasArriendo)) {
        this.paginasArriendo.push(this.totalPaginasArriendo);
      }

      console.log(this.paginasArriendo);
    }
  }

  irAlSiguienteBloque(tipo: string) {
    if (tipo == PortafolioEnum.VENTA) {
      const maxBloques = Math.floor((this.totalPaginasVenta - 1) / 3);
      console.log(this.bloqueActualVenta < maxBloques);
      console.log(this.bloqueActualVenta);


      if (this.bloqueActualVenta < maxBloques) {
        console.log('bloque sig');

        this.bloqueActualVenta++;
        this.generarPaginas(PortafolioEnum.VENTA);
      }
    }


    if (tipo == PortafolioEnum.ARRIENDO) {
      const maxBloques = Math.floor((this.totalPaginasArriendo - 1) / 3);
      console.log(this.bloqueActualArriendo < maxBloques);
      console.log(this.bloqueActualArriendo);


      if (this.bloqueActualArriendo < maxBloques) {
        console.log('bloque sig');

        this.bloqueActualArriendo++;
        this.generarPaginas(PortafolioEnum.ARRIENDO);
      }
    }

  }

  irAlBloqueAnterior(tipo: string) {
    if (tipo == PortafolioEnum.VENTA) {
      const paginasPorBloque = 3;
      console.log('bloque ant');

      if (this.bloqueActualVenta > 0) {
        const nuevoBloque = this.bloqueActualVenta - 1;
        const inicioNuevoBloque = nuevoBloque * paginasPorBloque + 1;
        const finNuevoBloque = Math.min(
          inicioNuevoBloque + paginasPorBloque - 1,
          this.totalPaginasVenta
        );

        if (this.paginaActualVenta >= inicioNuevoBloque) {
          this.bloqueActualVenta = nuevoBloque;
        } else {
          this.bloqueActualVenta = nuevoBloque;
          this.paginaActualVenta = finNuevoBloque;
        }



        this.generarPaginas(PortafolioEnum.ARRIENDO);

      }
    }

    if (tipo == PortafolioEnum.ARRIENDO) {
      const paginasPorBloque = 3;
      console.log('bloque ant');

      if (this.bloqueActualArriendo > 0) {
        const nuevoBloque = this.bloqueActualArriendo - 1;
        const inicioNuevoBloque = nuevoBloque * paginasPorBloque + 1;
        const finNuevoBloque = Math.min(
          inicioNuevoBloque + paginasPorBloque - 1,
          this.totalPaginasArriendo
        );

        if (this.paginaActualArriendo >= inicioNuevoBloque) {
          this.bloqueActualArriendo = nuevoBloque;
        } else {
          this.bloqueActualArriendo = nuevoBloque;
          this.paginaActualArriendo = finNuevoBloque;
        }

        this.generarPaginas(PortafolioEnum.ARRIENDO);

      }
    }
  }

  cambiarPagina(pagina: number | string, tipo: string) {

    if (tipo == PortafolioEnum.VENTA) {

      console.log(pagina);
      console.log('primer elemento', this.paginasVenta[0]);
      console.log('pagina', this.paginaActualVenta);


      if (pagina === '...') {
        this.irAlSiguienteBloque(tipo);
        return;
      }
      this.loadingResultadosVenta = true

      if (typeof pagina === 'number') {

        const primerElemento = this.paginasVenta[0];

        if (typeof primerElemento === 'number' && pagina < primerElemento) {
          this.irAlBloqueAnterior(tipo);
          return;
        }

        console.log(typeof pagina);


        this.obtenerPropiedadesVenta(Number(this.asesorId), pagina, this.elementsPerPage);
        this.actualizarInmueblesVisiblesVenta();
        setTimeout(() => {
          this.loadingResultadosVenta = false
        }, 1000);

        const nuevoBloque = Math.floor((pagina - 1) / 3);
        if (nuevoBloque !== this.bloqueActualVenta) {

          this.bloqueActualVenta = nuevoBloque;
          this.generarPaginas(tipo);
        }


      }
    }

    if (tipo == PortafolioEnum.ARRIENDO) {
      this.loadingResultadosArriendo = true
      console.log(pagina);
      console.log('primer elemento', this.paginasArriendo[0]);
      console.log('pagina', this.paginaActualArriendo);


      if (pagina === '...') {
        this.irAlSiguienteBloque(tipo);
        return;
      }

      if (typeof pagina === 'number') {

        const primerElemento = this.paginasArriendo[0];

        if (typeof primerElemento === 'number' && pagina < primerElemento) {
          this.irAlBloqueAnterior(tipo);
          return;
        }

        console.log(typeof pagina);


        this.obtenerPropiedadesArriendo(Number(this.asesorId), pagina, this.elementsPerPage);
        this.actualizarInmueblesVisiblesVenta();

        setTimeout(() => {
          this.loadingResultadosArriendo = false
        }, 1000);

        const nuevoBloque = Math.floor((pagina - 1) / 3);
        if (nuevoBloque !== this.bloqueActualArriendo) {

          this.bloqueActualArriendo = nuevoBloque;
          this.generarPaginas(tipo);
        }



      }
    }
  }


  paginaAnterior(tipo: string) {
    if (tipo == PortafolioEnum.VENTA) {
      if (this.paginaActualVenta > 1) {
        this.loadingResultadosVenta = true
        const nuevaPagina = this.paginaActualVenta - 1;
        const paginasPorBloque = 3;
        const nuevoBloque = Math.floor((nuevaPagina - 1) / paginasPorBloque);

        this.obtenerPropiedadesVenta(Number(this.asesorId), nuevaPagina, this.elementsPerPage);
        this.actualizarInmueblesVisiblesVenta();
        setTimeout(() => {
          this.loadingResultadosVenta = false
        }, 1000);

        if (nuevoBloque !== this.bloqueActualVenta) {
          this.bloqueActualVenta = nuevoBloque;
          this.generarPaginas(tipo);
        }

      }
    }

    if (tipo == PortafolioEnum.ARRIENDO) {
      if (this.paginaActualArriendo > 1) {
        this.loadingResultadosArriendo = true
        const nuevaPagina = this.paginaActualArriendo - 1;
        const paginasPorBloque = 3;
        const nuevoBloque = Math.floor((nuevaPagina - 1) / paginasPorBloque);

        this.obtenerPropiedadesArriendo(Number(this.asesorId), nuevaPagina, this.elementsPerPage);
        this.actualizarInmueblesVisiblesVenta();

        setTimeout(() => {
          this.loadingResultadosArriendo = false
        }, 1000);

        if (nuevoBloque !== this.bloqueActualArriendo) {
          this.bloqueActualArriendo = nuevoBloque;
          this.generarPaginas(tipo);
        }

      }
    }
  }

  paginaSiguiente(tipo: string) {


    if (tipo == PortafolioEnum.VENTA) {
      if (this.paginaActualVenta < this.totalPaginasVenta) {
        this.loadingResultadosVenta = true
        const nuevaPagina = this.paginaActualVenta + 1;


        this.obtenerPropiedadesVenta(Number(this.asesorId), nuevaPagina, this.elementsPerPage);
        this.actualizarInmueblesVisiblesVenta();
        setTimeout(() => {
          this.loadingResultadosVenta = false
        }, 1000);


        const paginasPorBloque = 3;
        const bloqueActual = Math.floor((nuevaPagina - 1) / paginasPorBloque);

        if (bloqueActual !== this.bloqueActualVenta) {
          this.bloqueActualVenta = bloqueActual;
          this.generarPaginas(tipo);
        }

      }
    }

    if (tipo == PortafolioEnum.ARRIENDO) {
      if (this.paginaActualArriendo < this.totalPaginasArriendo) {
        this.loadingResultadosArriendo = true
        const nuevaPagina = this.paginaActualArriendo + 1;



        this.obtenerPropiedadesArriendo(Number(this.asesorId), nuevaPagina, this.elementsPerPage);
        this.actualizarInmueblesVisiblesVenta();

        setTimeout(() => {
          this.loadingResultadosArriendo = false
        }, 1000);
        const paginasPorBloque = 3;
        const bloqueActual = Math.floor((nuevaPagina - 1) / paginasPorBloque);

        if (bloqueActual !== this.bloqueActualArriendo) {
          this.bloqueActualArriendo = bloqueActual;
          this.generarPaginas(tipo);
        }

      }
    }
  }

  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

}
