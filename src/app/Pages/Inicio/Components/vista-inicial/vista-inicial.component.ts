import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Inject,
  inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NavbarComponent } from '../../../../shared/navbar/navbar.component';
import { InmueblesService } from '../../../../core/Inmuebles/inmuebles.service';
import { Router, RouterLink } from '@angular/router';
import { FooterComponent } from '../../../../shared/footer/footer.component';
import { BotonesFlotantesComponent } from '../../../../shared/botones-flotantes/botones-flotantes.component';
import { BarraFiltrosComponent } from '../../../../shared/barra-filtros/barra-filtros.component';
import { BehaviorSubject, of } from 'rxjs';
import { WishlistServiceService } from '../../../../core/wishlist/wishlist-service.service';
import { OffcanvasWishlistComponent } from '../offcanvas-wishlist/offcanvas-wishlist.component';
import { ModalWishlistComponent } from '../../../../shared/modal-wishlist/modal-wishlist.component';
var document: any;
declare const Carousel: any;

@Component({
  selector: 'app-vista-inicial',
  standalone: true,
  imports: [
    RouterLink,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NavbarComponent,
    FooterComponent,
    BotonesFlotantesComponent,
    BarraFiltrosComponent,
    OffcanvasWishlistComponent,
    ModalWishlistComponent
  ],
  templateUrl: './vista-inicial.component.html',
  styleUrls: ['./vista-inicial.component.scss'],
})
export class VistaInicialComponent implements OnInit {
  @ViewChild('dropdownContainer') dropdownContainer!: ElementRef | undefined;

  @ViewChild(ModalWishlistComponent)
  modalCrearContacto!: ModalWishlistComponent;

  intervalId: any;
  currentSlide = 0;
  elementsPerPage = 12;
  searchTerm: string = '';
  elementsPerPageInicial = 3;
  filtrosSeleccionados: Map<string, any> = new Map();
  filtrosInmueblesVenta: Map<string, any> = new Map();
  filtrosInmueblesArriendo: Map<string, any> = new Map();

  filtros: any = {};
  aliadosPorGrupo: string[][] = [];
  inmueblesVentasArray: any[] = [];
  inmueblesDestacadosArray: any[] = [];
  inmueblesArriendosArray: any[] = [];

  aliados: string[] = [
    'assets/images/sura.png',
    'assets/images/experian.png',
    'assets/images/fianzacredito.png',
    'assets/images/libertador.png',
    'assets/images/lonja.png',
    'assets/images/finca-raiz.png',
    'assets/images/metro-cuadrado.png',
    'assets/images/signio.png',
    'assets/images/Unifianza.png',
  ];

  sliderFotos: string[] = [
    'assets/images/vistaInicial-slider-1.png',
    'assets/images/vistaInicial-slider-2.png',
    'assets/images/vistaInicial-slider-3.png',
  ];

  cargando = false;
  isLoading = true;
  loadingDestacados: boolean = false;
  loadingVentas: boolean = false;
  loadingArriendos: boolean = false;

  // Injectaciones
  router = inject(Router);
  elementRef = inject(ElementRef);
  formBuilder = inject(FormBuilder);
  inmueblesService = inject(InmueblesService);
  favService = inject(WishlistServiceService);

  // PAGINACION
  totalPaginasArriendo = 0;
  paginaActualArriendo = 1;
  bloqueActualArriendo: number = 0;
  paginasArriendo: (number | string)[] = [];

  totalPaginasVentas = 0;
  paginaActualVentas = 1;
  bloqueActualVentas: number = 0;
  paginasVentas: (number | string)[] = [];

  totalPaginasDestacados = 0;
  paginaActualDestacados = 1;
  bloqueActualDestacados: number = 0;
  paginasDestacados: (number | string)[] = [];

  offcanvasVisible: boolean = false;
  offcanvasMinimizado: boolean = true;

  mostrarModalRecorrido = false

  mostrarOffcanvas: boolean = false;
  minimizarOffcanvas: boolean = true;

  cd = inject(ChangeDetectorRef);


  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  ngOnInit(): void {
    this.getDatos();
    this.mostrarOffcanvas = false;
    this.minimizarOffcanvas = true;
  }

  toggleOffcanvas() {
    this.mostrarOffcanvas = !this.mostrarOffcanvas;

    setTimeout(() => {
      this.minimizarOffcanvas = !this.minimizarOffcanvas;
      console.log("minimizado: " + this.minimizarOffcanvas);

      // 3. ¡LA MAGIA! Forzamos a Angular a pintar el cambio en la pantalla
      this.cd.detectChanges();
    }, 100);

  }

  getDatos() {
    this.getFiltros();
    this.getAliadosPorGrupo();
    this.getInmueblesVentas(1);
    this.getInmueblesArriendos(1);
    this.getInmueblesDestacados(1);
  }


  sincronizarCierre() {
    console.log("El hijo me avisó que se cerró. Sincronizando variables...");

    // Forzamos las variables a FALSE (no usamos toggle/signo de exclamación aquí)
    this.mostrarOffcanvas = false;
    this.minimizarOffcanvas = false;
    console.log(this.minimizarOffcanvas);

  }

  agregarFavorito(propiedad: any) {


    this.favService.agregar(propiedad);

    // this.toggleOffcanvas()

  }


  recibirValorModalRecorrido() {
    this.mostrarModalRecorrido = !this.mostrarModalRecorrido;
  }



  recibirDato(valor: boolean) {
    this.offcanvasVisible = valor;
    console.log('Valor que llegó desde el hijo:', valor);
  }

  getInmueblesVentas(page: number) {
    this.loadingVentas = true;
    this.filtrosInmueblesVenta.clear();
    this.filtrosInmueblesVenta.set('biz', 2);

    const filtrosObj = Object.fromEntries(this.filtrosInmueblesVenta);
    const obj = {
      ...filtrosObj,
      page: page,
    };
    this.inmueblesService
      .getFiltrosEnviar(obj, this.elementsPerPageInicial)
      .subscribe({
        next: (response: any) => {
          console.log(response.data);

          var respuesta = response.data;

          console.log(response);

          this.inmueblesVentasArray = respuesta;

          this.inmueblesVentasArray = respuesta.filter(
            (inm: any) => inm.images1 != ''
          );

          this.totalPaginasVentas = response.last_page || 1;
          this.paginasVentas = Array.from(
            { length: this.totalPaginasVentas },
            (_, i) => i + 1
          );
          this.paginaActualVentas = response.current_page || 1;

          this.generarPaginas('VENTAS');

          console.log(this.inmueblesVentasArray);
        },
        error: (error: any) => {
          console.error('Error al obtener los inmuebles:', error);
        },
        complete: () => {
          this.loadingVentas = false;
        },
      });
  }

  getInmueblesArriendos(page: number) {
    this.loadingArriendos = true;
    this.filtrosInmueblesArriendo.clear();
    this.filtrosInmueblesArriendo.set('biz', 1);

    const filtrosObj = Object.fromEntries(this.filtrosInmueblesArriendo);
    const obj = {
      ...filtrosObj,
      page: page,
    };
    this.inmueblesService
      .getFiltrosEnviar(obj, this.elementsPerPageInicial)
      .subscribe({
        next: (response: any) => {
          var respuesta = response.data;

          console.log(response);

          this.inmueblesArriendosArray = respuesta.filter(
            (inm: any) => inm.image1 != ''
          );

          this.totalPaginasArriendo = response.last_page || 1;
          this.paginasArriendo = Array.from(
            { length: this.totalPaginasArriendo },
            (_, i) => i + 1
          );
          this.paginaActualArriendo = response.current_page || 1;

          this.generarPaginas('ARRIENDO');
          console.log(this.inmueblesArriendosArray);
        },
        error: (error: any) => {
          console.error('Error al obtener los inmuebles:', error);
        },
        complete: () => {
          this.loadingArriendos = false;
        },
      });
  }

  getInmueblesDestacados(page: number) {
    this.loadingDestacados = true;

    this.inmueblesService.getInmueblesDestacados(page).subscribe({
      next: (data: any) => {
        const respuesta = data.data.filter((inm: any) => inm.image1 != '');
        this.inmueblesDestacadosArray = respuesta;
        this.totalPaginasDestacados = data.last_page || 1;
        this.paginaActualDestacados = data.current_page || 1;
        this.generarPaginas('DESTACADOS');
        console.log(this.inmueblesDestacadosArray);
      },
      error: (error: any) => {
        console.error('Error al obtener los inmuebles:', error);
      },
      complete: () => {
        this.loadingDestacados = false;
      },
    });
  }

  redirigirVerBlog(id: string) {
    const url = this.router.createUrlTree(['/ver-blog', id]).toString();
    window.open(url, '_blank');
  }

  redirigirAvaluosComerciales() {
    const url = this.router.createUrlTree(['/avaluos-comerciales']).toString();
    window.open(url, '_blank');
  }

  redirigirFiltros() {
    this.cargando = true;
    this.filtrosSeleccionados.clear();
    this.filtrosSeleccionados.set('biz', '1');

    const filtrosObj = Object.fromEntries(this.filtrosSeleccionados);
    const obj = {
      ...filtrosObj,
      page: 1,
    };

    this.inmueblesService.getFiltrosEnviar(obj, this.elementsPerPage).subscribe(
      (response: any) => {
        this.router.navigate(['/filtros'], {
          state: {
            resultados: response.data,
            paginacion: response,
            filtros: obj,
          },
        });
        this.cargando = false;
      },
      (error: any) => {
        console.error('Error al enviar los filtros:', error);
      }
    );
  }

  redirigirPublicarPropiedad() {
    const url = this.router.createUrlTree(['/publicar-inmueble']).toString();
    window.open(url, '_blank');
  }

  getAliadosPorGrupo(): void {
    // Verificamos si estamos en el navegador antes de acceder a window
    const isMobile =
      isPlatformBrowser(this.platformId) && window.innerWidth < 768;
    const grupoSize = isMobile ? 3 : 4;
    console.log(isMobile);

    this.aliadosPorGrupo = [];

    // Agrupamos los aliados
    for (let i = 0; i <= this.aliados.length - grupoSize; i++) {
      this.aliadosPorGrupo.push(this.aliados.slice(i, i + grupoSize));
    }
    console.log(this.aliadosPorGrupo);
  }

  redirigirContactanos() {
    this.router.navigate(['/contacto']);
  }


  abrirBrochure() {
    const url = 'https://oferta.rentaraiz.co/flipbook/brochure-renta-raiz/';
    window.open(url, '_blank');
  }

  redirigirRentasCortas() {
    const url = 'https://nomalux.com.co';
    window.open(url, '_blank');
  }

  // PAGINACION
  generarPaginas(inmueble: string) {
    if (inmueble === 'ARRIENDO') {
      this.paginasArriendo = [];
      const paginasPorBloque = 3;
      const inicio = this.bloqueActualArriendo * paginasPorBloque + 1;
      const fin = Math.min(
        inicio + paginasPorBloque - 1,
        this.totalPaginasArriendo - 1
      );

      for (let i = inicio; i <= fin; i++) {
        this.paginasArriendo.push(i);
      }

      if (fin < this.totalPaginasArriendo - 1) {
        this.paginasArriendo.push('...');
      }

      if (this.totalPaginasArriendo > 1) {
        this.paginasArriendo.push(this.totalPaginasArriendo);
      }
      console.log(this.paginasArriendo);

    } else if (inmueble === 'VENTAS') {
      this.paginasVentas = [];
      const paginasPorBloque = 3;
      const inicio = this.bloqueActualVentas * paginasPorBloque + 1;
      const fin = Math.min(
        inicio + paginasPorBloque - 1,
        this.totalPaginasVentas - 1
      );

      for (let i = inicio; i <= fin; i++) {
        this.paginasVentas.push(i);
      }

      if (fin < this.totalPaginasVentas - 1) {
        this.paginasVentas.push('...');
      }

      if (this.totalPaginasVentas > 1) {
        this.paginasVentas.push(this.totalPaginasVentas);
      }
    } else {
      this.paginasDestacados = [];
      const paginasPorBloque = 3;
      const inicio = this.bloqueActualDestacados * paginasPorBloque + 1;
      const fin = Math.min(
        inicio + paginasPorBloque - 1,
        this.totalPaginasDestacados - 1
      );

      for (let i = inicio; i <= fin; i++) {
        this.paginasDestacados.push(i);
      }

      if (fin < this.totalPaginasDestacados - 1) {
        this.paginasDestacados.push('...');
      }

      if (this.totalPaginasDestacados > 1) {
        this.paginasDestacados.push(this.totalPaginasDestacados);
      }
    }
  }

  irAlSiguienteBloque(inmueble: string) {
    if (inmueble === 'ARRIENDO') {
      const maxBloques = Math.floor((this.totalPaginasArriendo - 1) / 3);
      if (this.bloqueActualArriendo < maxBloques) {
        this.bloqueActualArriendo++;
        this.generarPaginas(inmueble);
      }
    } else if (inmueble === 'VENTAS') {
      const maxBloques = Math.floor((this.totalPaginasVentas - 1) / 3);
      if (this.bloqueActualVentas < maxBloques) {
        this.bloqueActualVentas++;
        this.generarPaginas(inmueble);
      }
    } else {
      const maxBloques = Math.floor((this.totalPaginasDestacados - 1) / 3);
      if (this.bloqueActualDestacados < maxBloques) {
        this.bloqueActualDestacados++;
        this.generarPaginas(inmueble);
      }
    }
  }

  irAlBloqueAnterior(inmueble: string) {
    const paginasPorBloque = 3;

    if (inmueble === 'ARRIENDO') {
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

        this.generarPaginas(inmueble);
        this.getInmueblesArriendos(this.paginaActualArriendo);
      }
    } else if (inmueble === 'VENTAS') {
      if (this.bloqueActualVentas > 0) {
        const nuevoBloque = this.bloqueActualVentas - 1;
        const inicioNuevoBloque = nuevoBloque * paginasPorBloque + 1;
        const finNuevoBloque = Math.min(
          inicioNuevoBloque + paginasPorBloque - 1,
          this.totalPaginasVentas
        );

        if (this.paginaActualVentas >= inicioNuevoBloque) {
          this.bloqueActualVentas = nuevoBloque;
        } else {
          this.bloqueActualVentas = nuevoBloque;
          this.paginaActualVentas = finNuevoBloque;
        }

        this.generarPaginas(inmueble);
        this.getInmueblesVentas(this.paginaActualVentas);
      }
    } else {
      if (this.bloqueActualDestacados > 0) {
        const nuevoBloque = this.bloqueActualDestacados - 1;
        const inicioNuevoBloque = nuevoBloque * paginasPorBloque + 1;
        const finNuevoBloque = Math.min(
          inicioNuevoBloque + paginasPorBloque - 1,
          this.totalPaginasDestacados
        );

        if (this.paginaActualDestacados >= inicioNuevoBloque) {
          this.bloqueActualDestacados = nuevoBloque;
        } else {
          this.bloqueActualDestacados = nuevoBloque;
          this.paginaActualDestacados = finNuevoBloque;
        }

        this.generarPaginas(inmueble);

        this.getInmueblesDestacados(this.paginaActualDestacados);
      }
    }
  }

  cambiarPagina(pagina: number | string, inmueble: string) {
    if (pagina === '...') {
      this.irAlSiguienteBloque(inmueble);
      return;
    }

    if (typeof pagina === 'number') {
      if (inmueble === 'ARRIENDO') {
        const primerElemento = this.paginasArriendo[0];
        if (typeof primerElemento === 'number' && pagina < primerElemento) {
          this.irAlBloqueAnterior(inmueble);
          return;
        }
        if (pagina !== this.paginaActualArriendo) {
          this.getInmueblesArriendos(pagina);
        }
      } else if (inmueble === 'VENTAS') {
        const primerElemento = this.paginasVentas[0];
        if (typeof primerElemento === 'number' && pagina < primerElemento) {
          this.irAlBloqueAnterior(inmueble);
          return;
        }
        if (pagina !== this.paginaActualVentas) {
          this.getInmueblesVentas(pagina);
        }
      } else {
        const primerElemento = this.paginasDestacados[0];
        if (typeof primerElemento === 'number' && pagina < primerElemento) {
          this.irAlBloqueAnterior(inmueble);
          return;
        }
        if (pagina !== this.paginaActualDestacados) {
          this.getInmueblesDestacados(pagina);
        }
      }
    }
  }

  paginaAnterior(inmueble: string) {
    if (inmueble === 'ARRIENDO') {
      if (this.paginaActualArriendo > 1) {
        this.paginaActualArriendo--;

        const maxPaginasPorBloque = 3;
        const inicioBloqueActual =
          this.bloqueActualArriendo * maxPaginasPorBloque + 1;

        if (this.paginaActualArriendo < inicioBloqueActual) {
          this.bloqueActualArriendo--;
        }

        this.generarPaginas(inmueble);
        this.getInmueblesArriendos(this.paginaActualArriendo);
      }
    } else if (inmueble === 'VENTAS') {
      if (this.paginaActualVentas > 1) {
        this.paginaActualVentas--;

        const maxPaginasPorBloque = 3;
        const inicioBloqueActual =
          this.bloqueActualVentas * maxPaginasPorBloque + 1;

        if (this.paginaActualVentas < inicioBloqueActual) {
          this.bloqueActualVentas--;
        }

        this.generarPaginas(inmueble);
        this.getInmueblesVentas(this.paginaActualVentas);
      }
    } else {
      if (this.paginaActualDestacados > 1) {
        this.paginaActualDestacados--;

        const maxPaginasPorBloque = 3;
        const inicioBloqueActual =
          this.bloqueActualDestacados * maxPaginasPorBloque + 1;

        if (this.paginaActualDestacados < inicioBloqueActual) {
          this.bloqueActualDestacados--;
        }

        this.generarPaginas(inmueble);
        this.getInmueblesDestacados(this.paginaActualDestacados);
      }
    }
  }

  paginaSiguiente(inmueble: string) {
    if (inmueble === 'ARRIENDO') {
      if (this.paginaActualArriendo < this.totalPaginasArriendo) {
        this.paginaActualArriendo++;

        const maxPaginasPorBloque = 3;
        const inicioBloqueActual =
          this.bloqueActualArriendo * maxPaginasPorBloque + 1;
        const finBloqueActual = inicioBloqueActual + maxPaginasPorBloque - 1;

        if (this.paginaActualArriendo > finBloqueActual) {
          this.bloqueActualArriendo++;
        }

        this.generarPaginas(inmueble);
        this.getInmueblesArriendos(this.paginaActualArriendo);
      }
    } else if (inmueble === 'VENTAS') {
      if (this.paginaActualVentas < this.totalPaginasVentas) {
        this.paginaActualVentas++;

        const maxPaginasPorBloque = 3;
        const inicioBloqueActual =
          this.bloqueActualVentas * maxPaginasPorBloque + 1;
        const finBloqueActual = inicioBloqueActual + maxPaginasPorBloque - 1;

        if (this.paginaActualVentas > finBloqueActual) {
          this.bloqueActualVentas++;
        }

        this.generarPaginas(inmueble);
        this.getInmueblesVentas(this.paginaActualVentas);
      }
    } else {
      if (this.paginaActualDestacados < this.totalPaginasDestacados) {
        this.paginaActualDestacados++;

        const maxPaginasPorBloque = 3;
        const inicioBloqueActual =
          this.bloqueActualDestacados * maxPaginasPorBloque + 1;
        const finBloqueActual = inicioBloqueActual + maxPaginasPorBloque - 1;

        if (this.paginaActualDestacados > finBloqueActual) {
          this.bloqueActualDestacados++;
        }

        this.generarPaginas(inmueble);
        this.getInmueblesDestacados(this.paginaActualDestacados);
      }
    }
  }

  getFiltros() {
    this.inmueblesService.getFiltros().subscribe({
      next: (response: any) => {
        this.filtros = response;
        console.log('Filtros obtenidos:', this.filtros);
      },
      error: (error: any) => {
        console.error('Error al obtener los filtros:', error);
      }
    });
  }
}
