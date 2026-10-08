declare var fbq: Function;
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { NavbarComponent } from '../../../../shared/navbar/navbar.component';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InmueblesService } from '../../../../core/Inmuebles/inmuebles.service';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin, map, Observable, startWith } from 'rxjs';
import { GeolocalizacionService } from '../../../../core/Geolocalizacion/geolocalizacion.service';
import { VolverComponent } from '../../../../shared/volver/volver.component';
import { FooterComponent } from '../../../../shared/footer/footer.component';
import { UrlParamService } from '../../../../core/configs/url-param.service';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { WishlistServiceService } from '../../../../core/wishlist/wishlist-service.service';
import { ModalWishlistComponent } from '../../../../shared/modal-wishlist/modal-wishlist.component';
import { OffcanvasWishlistComponent } from '../offcanvas-wishlist/offcanvas-wishlist.component';
import { BotonesFlotantesComponent } from '../../../../shared/botones-flotantes/botones-flotantes.component';

@Component({
  selector: 'app-filtros',
  standalone: true,
  imports: [
    RouterLink,
    NavbarComponent,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    VolverComponent,
    FooterComponent,
    MatAutocompleteModule,
    MatInputModule,
    ModalWishlistComponent,
    OffcanvasWishlistComponent,
    BotonesFlotantesComponent
  ],
  templateUrl: './filtros.component.html',
  styleUrl: './filtros.component.scss',
})
export class FiltrosComponent implements OnInit {
  private scrollTimeout: any;

  precioMinimoCtrl = new FormControl('');
  precioMaximoCtrl = new FormControl('');
  precioVentaMinimoCtrl = new FormControl('');
  precioVentaMaximoCtrl = new FormControl('');

  filteredMin!: Observable<number[]>;
  filteredMax!: Observable<number[]>;
  filteredVentaMin!: Observable<number[]>;
  filteredVentaMax!: Observable<number[]>;

  totalDatos = 0;
  totalPaginas = 0;
  paginaActual: number = 1;
  elementsPerPage = 12;
  bloqueActual: number = 0;
  isDesktopView = typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
  isSticky = false;

  seleccion = {
    estrato: [] as number[],
    banos: [] as (number | string)[],
    parqueadero: [] as (number | string)[],
    habitaciones: [] as (number | string)[],
  };

  filtrosInmueblesArriendo: Map<string, any> = new Map();
  searchTerm: string = '';
  ubicacion: string = '';
  niveles: any = ['diamante', 'oro', 'plata'];
  cargando = false;
  isDrawerOpen: boolean = false;
  drawerMapAbierto: boolean = false;
  loadingResultados: boolean = false;

  paginacion: any = {};
  ciudades: any[] = [];
  resultados: any[] = [];
  filteredBarrios: any[] = [];
  filtrosVistaInicial: any = {};
  filtrosDesdeNavbar: any = {};
  categoriasInmuebles: any[] = [];
  estrato: number[] = [1, 2, 3, 4, 5, 6];
  paginas: (number | string)[] = [];
  barrios: { data: any[] } = { data: [] };
  banos: (number | string)[] = [1, 2, 3, 4, 5, '+6'];
  filtrosSeleccionados: Map<string, any> = new Map();
  parqueadero: (number | string)[] = [1, 2, 3, 4, 5, '+6'];
  habitaciones: (number | string)[] = [1, 2, 3, 4, 5, '+6'];

  // Para los Rangos de Precios
  selectedPriceRange: { min: number; max: number | null } | null = null;
  selectedPriceRangeVentas: { min: number; max: number | null } | null = null;
  priceRangesArriendos = [
    { min: 2000000, max: 8000000, displayName: '2.000.000 - 8.000.000' },
    { min: 8000001, max: 15000000, displayName: '8.000.000 - 15.000.000' },
    { min: 15000001, max: 0, displayName: '15.000.000 +' },
  ];

  priceRangesVentas = [
    {
      min: 100000000,
      max: 1000000000,
      displayName: '100.000.000 - 1.000.000.000',
    },
    {
      min: 1000000001,
      max: 2000000000,
      displayName: '1.000.000.001 - 2.000.000.000',
    },
    { min: 2000000001, max: 0, displayName: '2.000.000.000 +' },
  ];

  // Para Tipo de Propiedad
  isPropertyDropdownOpen = false;
  propertyOptions: { code: string; name: string; displayName?: string }[] = [];
  selectedProperty: {
    code: string;
    name: string;
    displayName?: string;
  } | null = null;

  // Para Inmueble
  isEstateDropdownOpen = false;
  isMobileView = typeof window !== 'undefined' && window.innerWidth < 768;
  estateOptions: { code: string; name: string }[] = [];
  selectedEstates: { code: string; name: string }[] = [];

  //geolocalizacion
  coordinates: { latitude: number; longitude: number } | null = null;
  error: string | null = null;
  loading = false;

  private readonly icons = {
    property: {
      '': 'fas fa-list-ul',
      '1': 'fas fa-building',
      '2': 'fas fa-dollar-sign',
      '3': 'fas fa-home',
    } as Record<string, string>,
    estate: {
      '1': 'fas fa-building',
      '2': 'fas fa-home',
      '3': 'fas fa-home-user',
      '4': 'fas fa-store',
      '5': 'fas fa-warehouse',
      '6': 'fas fa-briefcase',
      '7': 'fas fa-map-marked-alt',
      '8': 'fas fa-tractor',
      '10': 'fas fa-home',
      '11': 'fas fa-car',
      '12': 'fas fa-umbrella-beach',
      '13': 'fas fa-store',
      '14': 'fas fa-home',
    } as Record<string, string>,
  };


  mostrarModalRecorrido = false

  mostrarOffcanvas: boolean = false;
  minimizarOffcanvas: boolean = true;

  // Injectaciones
  router = inject(Router);
  cdRef = inject(ChangeDetectorRef);
  formBuilder = inject(FormBuilder);
  inmueblesService = inject(InmueblesService);
  geolocalizacionService = inject(GeolocalizacionService);
  activatedRoute = inject(ActivatedRoute);
  urlParamService = inject(UrlParamService);
  favService = inject(WishlistServiceService);
  

  mostrarMapa = false;
  address: string | null = null;

  formRangos = this.formBuilder.group({
    AreaMinima: [''],
    AreaMaxima: [''],
    precioVentaMinimo: [''],
    precioVentaMaximo: [''],
    precioMinimo: [''],
    precioMaximo: [''],
  });

  formFiltrosSelect = this.formBuilder.group({
    opcion: [''],
  });

  @ViewChild('closeButton') closeButton!: ElementRef<HTMLButtonElement>;

  /** En el servidor (SSR) no existe window. */
  private urlActual(): string {
    return typeof window !== 'undefined' ? window.location.href : '';
  }

  private estadoHistorial(): any {
    return typeof window !== 'undefined' ? window.history.state : null;
  }

  async ngOnInit(): Promise<void> {
    
    var data = this.urlParamService.obtenerParamLocalStorage('data');
    if (data) {
      var obj = JSON.parse(data);
      if (obj.url === "") {

        obj.url = this.urlActual();
        this.urlParamService.guardarParamLocalStorage('data', JSON.stringify(obj));
      }
    }

    this.filteredMin = this.initAutoComplete(this.precioMinimoCtrl);
    this.filteredMax = this.initAutoComplete(this.precioMaximoCtrl);
    this.filteredVentaMin = this.initAutoComplete(this.precioVentaMinimoCtrl);
    this.filteredVentaMax = this.initAutoComplete(this.precioVentaMaximoCtrl);

    if (typeof window !== 'undefined') window.scrollTo(0, 0);
    const state = this.estadoHistorial();


    if (!state?.paginacion && !state?.resultados) {
      var data = this.urlParamService.obtenerParamLocalStorage('data');

      if (data) {
        var obj = JSON.parse(data);
        state.resultados = obj.state.resultados;
        state.paginacion = obj.state.paginacion;
        state.filtros = obj.state.filtros;


      }

    }


    await this.getDatos();

    const queryParams = this.activatedRoute.snapshot.queryParams;
    console.log(queryParams);

    if (queryParams['utm_source']) {
      this.urlParamService.guardarParamLocalStorage(
        'utm_source',
        queryParams['utm_source']
      );
    }

    if (queryParams['fbclid']) {
      this.urlParamService.guardarParamLocalStorage(
        'fbclid',
        queryParams['fbclid']
      );
    }

    if (this.isDesktopView) {
      this.isDrawerOpen = true;
    }

    this.obtenerParametrosFiltros(1, queryParams, state);


    //-----------------------------------------------------


  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.isSticky = window.scrollY > 45;
      this.cdRef.detectChanges();
    }, 16);
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

  recibirValorModalRecorrido() {
    this.mostrarModalRecorrido = true;
  }

  toggleOffcanvas() {
    this.mostrarOffcanvas = !this.mostrarOffcanvas;
    setTimeout(() => {
      this.minimizarOffcanvas = !this.minimizarOffcanvas;
       this.cdRef.detectChanges();
    }, 100);

    console.log("minimizado" + this.minimizarOffcanvas);

  }

  obtenerParametrosFiltros(pagina: number, queryParams: any, state: any) {
    const { utm_source, ...filteredParams } = queryParams;
    this.isDrawerOpen = this.isDesktopView;

    this.filtrosSeleccionados.clear();
    this.selectedProperty = null;
    this.selectedEstates = [];
    this.seleccion = {
      habitaciones: [],
      banos: [],
      parqueadero: [],
      estrato: [],
    };
    this.formRangos.patchValue({
      AreaMinima: null,
      AreaMaxima: null,
      precioVentaMinimo: null,
      precioVentaMaximo: null,
      precioMinimo: null,
      precioMaximo: null,
    });

    const nivelParam = queryParams['tipo'];
    if (nivelParam) {
      const nivelValido = this.niveles.find((x: any) => x === nivelParam);
      if (nivelValido) {
        if (!state.filtros) {
          this.getDatos();
          if (nivelParam === 'diamante') {
            this.filtrosSeleccionados.set('pcmin', 15000000);
          } else if (nivelParam === 'oro') {
            this.filtrosSeleccionados.set('pcmin', 8000000);
            this.filtrosSeleccionados.set('pcmax', 15000000);
          } else if (nivelParam === 'plata') {
            this.filtrosSeleccionados.set('pcmin', 2000000);
            this.filtrosSeleccionados.set('pcmax', 8000000);
          }

          this.filtrosSeleccionados.set('order', 'consignation_date');
          this.filtrosSeleccionados.set('sort', 'desc');

          this.enviarFiltros(pagina, false);

          const filtrosObj = Object.fromEntries(this.filtrosSeleccionados);
          const newState = {
            resultados: this.resultados,
            paginacion: this.paginacion,
            filtros: filtrosObj,
          };

          this.cargarDesdeState(newState);
          this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
              this.cargarDesdeState(this.estadoHistorial());
            }
          });

        } else {
          this.cargarDesdeState(state);
          this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {

              this.cargarDesdeState(this.estadoHistorial());
            }
          });

        }
        return;
      }
    }

    const biz = queryParams['biz'];
    const elementsPerPage = queryParams['elementsPerPage'];

    if (biz && elementsPerPage) {
      this.filtrosSeleccionados.set('biz', biz);
      this.filtrosSeleccionados.set('elementsPerPage', elementsPerPage);

      const city = queryParams['city'];
      if (city) {
        this.filtrosSeleccionados.set('city', city);
      }

      const barrio = queryParams['neighborhood_code'];
      if (barrio) {
        this.filtrosSeleccionados.set('neighborhood_code', barrio);
      }



      //this.enviarFiltros(pagina, false);
      const filtrosObj = Object.fromEntries(this.filtrosSeleccionados);
      console.log('filtrosObj', filtrosObj);
      const obj = {
        ...filtrosObj,
        page: pagina,
      };

      console.log('Obj', obj);

      this.inmueblesService
        .getFiltrosEnviar(obj, this.elementsPerPage)
        .subscribe({
          next: (response: any) => {
            console.log('response', response);

            this.resultados = response.data;
            this.totalDatos = response.total;
            this.paginaActual = response.current_page || 1;
            this.paginacion = response;
            this.totalPaginas = response.last_page || 1;
            this.paginas = Array.from(
              { length: this.totalPaginas },
              (_, i) => i + 1
            );

            this.generarPaginas();
            this.cargando = false;
            console.log(this.isDrawerOpen);
            console.log(response);

            var data = {
              "url": this.urlActual(),
              "state": {
                resultados: response.data,
                paginacion: response,
                filtros: obj,
              },
            }

            this.urlParamService.guardarParamLocalStorage('data', JSON.stringify(data));

          },
          error: (error: any) => {
            console.error('Error al obtener los inmuebles:', error);
          },
          complete: () => {
            this.loadingResultados = false;

            if (this.isMobileView && this.isDrawerOpen) {
              this.closeDrawer();
              console.log(this.isDrawerOpen);
            }
          },
        });

      const filtrosObje = Object.fromEntries(this.filtrosSeleccionados);
      const newState = {
        resultados: this.resultados,
        paginacion: this.paginacion,
        filtros: filtrosObje,
      };

      this.cargarDesdeState(newState);
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.cargarDesdeState(this.estadoHistorial());
        }
      });

      return;
    }

    if (state?.filtros) {
      this.cargarDesdeState(state);
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.cargarDesdeState(this.estadoHistorial());
        }
      });
    } else {
      // En SSR no hay history.state: no se redirige para no servir el inicio bajo la URL /filtros.
      if (typeof window !== 'undefined') this.router.navigate(['']);
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.isDesktopView = window.innerWidth >= 768;

    if (!this.isDesktopView) {
      this.isDrawerOpen = false;
    }
  }

  buildPolygon(lat: any, lng: any, delta = 0.001) {
    return [
      [
        [lat + delta, lng - delta],
        [lat + delta, lng + delta],
        [lat - delta, lng + delta],
        [lat - delta, lng - delta],
      ],
    ];
  }

  async getLocation() {
    this.loading = true;
    this.error = null;
    this.coordinates = null;

    try {
      this.coordinates = await this.geolocalizacionService.getCurrentPosition();
      console.log('Coordenadas:', this.coordinates);

      this.geolocalizacionService
        .getAddress(this.coordinates.latitude, this.coordinates.longitude)
        .subscribe((response: any) => {
          if (response.results[0]) {
            this.address = response.results[0].formatted_address;
            console.log('Dirección:', this.address);
          }
        });
    } catch (err) {
      this.error = err as string;
    } finally {
      this.loading = false;
    }
  }

  async getDatos(): Promise<void> {
    try {
      const [categoriasResponse, tipoPropiedadResponse] = (await firstValueFrom(
        forkJoin([
          this.inmueblesService.getCategoriasInmuebles(),
          this.inmueblesService.getTipoPropiedad(),
        ])
      )) as [any, any];

      this.categoriasInmuebles = categoriasResponse.data;
      this.propertyOptions = this.categoriasInmuebles.map((cat: any) => {
        if (cat.code === '3') {
          return { ...cat, displayName: 'Arriendo/venta' };
        }
        return cat;
      });

      this.selectedProperty =
        this.propertyOptions.find((cat) => cat.code === '3') ||
        this.propertyOptions[0];

      this.estateOptions = tipoPropiedadResponse.data;

      if (!this.filtrosVistaInicial?.type) {
        this.selectedEstates = [];
      } else {
        const estateCodes = this.filtrosVistaInicial.type.split(',');
        this.selectedEstates = this.estateOptions.filter((opt) =>
          estateCodes.includes(opt.code)
        );
      }

      this.getBarrios();
      this.generarPaginas();
    } catch (error) {
      console.error('Error al obtener datos:', error);
    }
  }

  toggleDrawer() {
    this.isDrawerOpen = !this.isDrawerOpen;

    const drawer = document.getElementById('right-map-drawer');
    if (drawer) {
      drawer.classList.remove('translate-x-0');
      drawer.classList.add('translate-x-full');
    }
    setTimeout(() => {
      this.mostrarMapa = true;
    }, 500);
    console.log(this.isDrawerOpen);
  }

  generarPaginas() {
    this.paginas = [];
    const paginasPorBloque = 3;
    const inicio = this.bloqueActual * paginasPorBloque + 1;
    const fin = Math.min(inicio + paginasPorBloque - 1, this.totalPaginas);

    for (let i = inicio; i <= fin; i++) {
      this.paginas.push(i);
    }

    if (fin < this.totalPaginas - 1) {
      this.paginas.push('...');
    }

    if (this.totalPaginas > 1 && !this.paginas.includes(this.totalPaginas)) {
      this.paginas.push(this.totalPaginas);
    }

    console.log(this.paginas);
  }

  irAlSiguienteBloque() {
    const maxBloques = Math.floor((this.totalPaginas - 1) / 3);
    console.log(this.bloqueActual < maxBloques);
    console.log(this.bloqueActual);


    if (this.bloqueActual < maxBloques) {
      console.log('bloque sig');

      this.bloqueActual++;
      this.generarPaginas();
    }
  }

  irAlBloqueAnterior() {
    const paginasPorBloque = 3;
    console.log('bloque ant');

    if (this.bloqueActual > 0) {
      const nuevoBloque = this.bloqueActual - 1;
      const inicioNuevoBloque = nuevoBloque * paginasPorBloque + 1;
      const finNuevoBloque = Math.min(
        inicioNuevoBloque + paginasPorBloque - 1,
        this.totalPaginas
      );

      if (this.paginaActual >= inicioNuevoBloque) {
        this.bloqueActual = nuevoBloque;
      } else {
        this.bloqueActual = nuevoBloque;
        this.paginaActual = finNuevoBloque;
      }

      this.generarPaginas();
      this.enviarFiltros(this.paginaActual);
    }
  }

  cambiarPagina(pagina: number | string) {
    console.log(pagina);
    console.log('primer elemento', this.paginas[0]);
    console.log('pagina', this.paginaActual);


    if (pagina === '...') {
      this.irAlSiguienteBloque();
      return;
    }

    if (typeof pagina === 'number') {

      const primerElemento = this.paginas[0];

      if (typeof primerElemento === 'number' && this.paginaActual < primerElemento) {
        this.irAlBloqueAnterior();
        return;
      }

      console.log(typeof pagina);


      const nuevoBloque = Math.floor((pagina - 1) / 3);
      if (nuevoBloque !== this.bloqueActual) {

        this.bloqueActual = nuevoBloque;
        this.generarPaginas();
      }

      var queryParams = this.activatedRoute.snapshot.queryParams;
      const state = this.estadoHistorial();
      console.log(state)

      console.log();

      if (Object.keys(queryParams).length >= 1 && !queryParams['tipo']) {

        this.obtenerParametrosFiltros(pagina, queryParams, state);

      } else {
        console.log('no hay params');

        this.enviarFiltros(pagina);
      }
    }
  }

  paginaAnterior() {
    if (this.paginaActual > 1) {
      const nuevaPagina = this.paginaActual - 1;
      const paginasPorBloque = 3;
      const nuevoBloque = Math.floor((nuevaPagina - 1) / paginasPorBloque);

      if (nuevoBloque !== this.bloqueActual) {
        this.bloqueActual = nuevoBloque;
        this.generarPaginas();
      }

      this.enviarFiltros(nuevaPagina);
    }
  }

  paginaSiguiente() {
    if (this.paginaActual < this.totalPaginas) {
      const nuevaPagina = this.paginaActual + 1;
      var queryParams = this.activatedRoute.snapshot.queryParams;
      const state = this.estadoHistorial();

      if (Object.keys(queryParams).length >= 1) {
        this.paginaActual = nuevaPagina;

        if (queryParams['tipo']) {
          console.log(this.filtrosSeleccionados);

          const currentFilters = new Map(this.filtrosSeleccionados);
          this.enviarFiltros(nuevaPagina, false);

          setTimeout(() => {
            if (currentFilters.has('city')) {
              this.filtrosSeleccionados.set('city', currentFilters.get('city'));
            }
            if (currentFilters.has('neighborhood_code')) {
              this.filtrosSeleccionados.set(
                'neighborhood_code',
                currentFilters.get('neighborhood_code')
              );
            }
          }, 0);
        } else {
          this.obtenerParametrosFiltros(nuevaPagina, queryParams, state);
        }
      } else {
        const currentFilters = new Map(this.filtrosSeleccionados);
        this.enviarFiltros(nuevaPagina, true);

        setTimeout(() => {
          if (currentFilters.has('city')) {
            this.filtrosSeleccionados.set('city', currentFilters.get('city'));
          }
          if (currentFilters.has('neighborhood_code')) {
            this.filtrosSeleccionados.set(
              'neighborhood_code',
              currentFilters.get('neighborhood_code')
            );
          }
        }, 0);
      }

      const paginasPorBloque = 3;
      const bloqueActual = Math.floor((nuevaPagina - 1) / paginasPorBloque);

      if (bloqueActual !== this.bloqueActual) {
        this.bloqueActual = bloqueActual;
        this.generarPaginas();
      }
      this.cdRef.detectChanges();
    }
  }

  inicializarFiltrosDesdeVistaInicial() {
    const f = this.filtrosVistaInicial;
    if (f?.city) {
      this.filtrosSeleccionados.set('city', f.city);
    }
    if (f?.neighborhood_code) {
      this.filtrosSeleccionados.set('neighborhood_code', f.neighborhood_code);
    }

    if (f?.pcmin !== undefined && f?.pcmin !== null && f?.pcmin !== '') {
      const pcmin = Number(f.pcmin);
      const pcmax = (f.pcmax !== undefined && f.pcmax !== null && f.pcmax !== '') ? Number(f.pcmax) : null;

      this.selectedPriceRange = this.priceRangesArriendos.find((range) => {
        return (
          range.min === pcmin &&
          (range.max === pcmax || (range.max === 0 && (pcmax === null || pcmax === 0)))
        );
      }) || null;

      if (this.selectedPriceRange) {
        this.precioMinimoCtrl.setValue('');
        this.precioMaximoCtrl.setValue('');
        this.precioMinimoCtrl.disable();
        this.precioMaximoCtrl.disable();
      } else {
        this.precioMinimoCtrl.enable();
        this.precioMaximoCtrl.enable();
        this.precioMinimoCtrl.setValue(pcmin ? pcmin.toLocaleString('es-CO') : '');
        this.precioMaximoCtrl.setValue(pcmax ? pcmax.toLocaleString('es-CO') : '');
      }
      this.filtrosSeleccionados.set('pcmin', pcmin);
      if (pcmax) this.filtrosSeleccionados.set('pcmax', pcmax);
    } else {
      this.selectedPriceRange = null;
      this.precioMinimoCtrl.enable();
      this.precioMaximoCtrl.enable();
      this.precioMinimoCtrl.setValue('');
      this.precioMaximoCtrl.setValue('');
    }

    if (f?.pvmin !== undefined && f?.pvmin !== null && f?.pvmin !== '') {
      const pvmin = Number(f.pvmin);
      const pvmax = (f.pvmax !== undefined && f.pvmax !== null && f.pvmax !== '') ? Number(f.pvmax) : null;

      this.selectedPriceRangeVentas = this.priceRangesVentas.find((range) => {
        return (
          range.min === pvmin &&
          (range.max === pvmax || (range.max === 0 && (pvmax === null || pvmax === 0)))
        );
      }) || null;

      if (this.selectedPriceRangeVentas) {
        this.precioVentaMinimoCtrl.setValue('');
        this.precioVentaMaximoCtrl.setValue('');
        this.precioVentaMinimoCtrl.disable();
        this.precioVentaMaximoCtrl.disable();
      } else {
        this.precioVentaMinimoCtrl.enable();
        this.precioVentaMaximoCtrl.enable();
        this.precioVentaMinimoCtrl.setValue(pvmin ? pvmin.toLocaleString('es-CO') : '');
        this.precioVentaMaximoCtrl.setValue(pvmax ? pvmax.toLocaleString('es-CO') : '');
      }
      this.filtrosSeleccionados.set('pvmin', pvmin);
      if (pvmax) this.filtrosSeleccionados.set('pvmax', pvmax);
    } else {
      this.selectedPriceRangeVentas = null;
      this.precioVentaMinimoCtrl.enable();
      this.precioVentaMaximoCtrl.enable();
      this.precioVentaMinimoCtrl.setValue('');
      this.precioVentaMaximoCtrl.setValue('');
    }

    this.selectedProperty =
      this.propertyOptions.find((opt) => opt.code === f?.biz) ||
      this.selectedProperty;

    if (f?.type) {
      const estateCodes = f.type.split(',');
      this.selectedEstates = this.estateOptions.filter((opt) =>
        estateCodes.includes(opt.code)
      );
    }

    const convertirSoloNumeros = (valores: string | string[] | undefined) => {
      if (!valores) return [];
      const valoresArray = Array.isArray(valores)
        ? valores
        : valores.split(',');
      return valoresArray.map(Number).filter((v) => !isNaN(v));
    };

    const convertirConPlusSeis = (
      min: any,
      max: any,
      raw?: string | string[]
    ) => {
      const minVal = Number(min);
      const maxVal = Number(max);

      if (minVal === 6 && maxVal === 100) {
        return ['+6'];
      }

      const valores = Array.isArray(raw) ? raw : raw ? raw.split(',') : [];

      const valoresProcesados =
        valores
          .map((v) => (v === '+6' ? '+6' : Number(v)))
          .filter((v) => v || v === 0) || [];

      if (minVal === 6 && maxVal === 100) {
        valoresProcesados.push('+6');
      }

      return valoresProcesados;
    };

    this.seleccion = {
      habitaciones: convertirConPlusSeis(
        f?.minbedroom,
        f?.maxbedroom,
        f?.bedrooms
      ),
      banos: convertirConPlusSeis(f?.minbathroom, f?.maxbathroom, f?.bathrooms),
      parqueadero: convertirConPlusSeis(
        f?.minparking,
        f?.maxparking,
        f?.minparking
      ),
      estrato: convertirSoloNumeros(f?.stratum),
    };

    this.formRangos.value.AreaMinima = f?.minarea;
    this.formRangos.value.AreaMaxima = f?.maxarea;

    if (f?.type === '1' || f?.type === '3') {
      this.formRangos.value.precioMinimo = f?.pcmin;
      this.formRangos.value.precioMaximo = f?.pcmax;
    }

    if (f?.type === '2' || f?.type === '3') {
      this.formRangos.value.precioVentaMinimo =
        f?.type === '2' ? f?.pvmin : f?.pcmin;
      this.formRangos.value.precioVentaMaximo =
        f?.type === '2' ? f?.pvmax : f?.pcmax;
    }

    this.cdRef.detectChanges();

    console.log(this.filtrosSeleccionados);
  }

  async cargarDesdeState(state: any) {
    console.log('cargar desde state', state);

    if (state?.resultados) {
      this.resultados = [...state.resultados];
      this.filtrosVistaInicial = { ...state.filtros };
      console.log('inicial filtros', this.filtrosVistaInicial);

      this.paginacion = state.paginacion;
      this.totalDatos = this.paginacion.total;

      this.totalPaginas = this.paginacion.last_page || 1;
      this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
      this.paginaActual = this.filtrosVistaInicial.page || 1;

      this.inmueblesService.setPropiedades(this.resultados);
      console.log(this.resultados);

      await this.getCiudades();

      if (this.filtrosVistaInicial) {
        this.inicializarFiltrosDesdeVistaInicial();
        console.log('Filtros inicializados:', this.filtrosVistaInicial);
      }

      this.generarPaginas();
      this.cdRef.detectChanges();
    }
  }

  hasManualArriendoPrice(): boolean {
    return (
      this.getNumericValue(this.precioMinimoCtrl) > 0 ||
      this.getNumericValue(this.precioMaximoCtrl) > 0
    );
  }

  hasManualVentaPrice(): boolean {
    return (
      this.getNumericValue(this.precioVentaMinimoCtrl) > 0 ||
      this.getNumericValue(this.precioVentaMaximoCtrl) > 0
    );
  }

  enviarFiltros(pagina: number, prepararFiltros: boolean = true) {
    this.filtrosSeleccionados = new Map();
    this.cargando = true;
    this.loadingResultados = true;
    const savedCity = this.filtrosSeleccionados.get('city');
    const savedNeighborhood =
      this.filtrosSeleccionados.get('neighborhood_code');

    if (prepararFiltros) {
      this.prepararFiltros();
    }
    if (savedCity) {
      this.filtrosSeleccionados.set('city', savedCity);
    }
    if (savedNeighborhood) {
      this.filtrosSeleccionados.set('neighborhood_code', savedNeighborhood);
    }

    const filtrosObj = Object.fromEntries(this.filtrosSeleccionados);
    console.log('filtrosObj', filtrosObj);
    const obj = {
      ...filtrosObj,
      page: pagina,
    };

    console.log('Obj', obj);

    this.inmueblesService
      .getFiltrosEnviar(obj, this.elementsPerPage)
      .subscribe({
        next: (response: any) => {
          console.log('response', response);

          this.resultados = response.data;
          this.totalDatos = response.total;
          this.paginaActual = response.current_page || 1;
          this.paginacion = response;
          this.totalPaginas = response.last_page || 1;
          this.paginas = Array.from(
            { length: this.totalPaginas },
            (_, i) => i + 1
          );

          this.generarPaginas();
          this.cargando = false;
          console.log(this.isDrawerOpen);
          console.log(response);

          var data = {
            "url": this.urlActual(),
            "state": {
              resultados: response.data,
              paginacion: response,
              filtros: obj,
            },
          }

          this.urlParamService.guardarParamLocalStorage('data', JSON.stringify(data));

        },
        error: (error: any) => {
          console.error('Error al obtener los inmuebles:', error);
        },
        complete: () => {
          this.loadingResultados = false;

          if (this.isMobileView && this.isDrawerOpen) {
            this.closeDrawer();
            console.log(this.isDrawerOpen);
          }
        },
      });
  }

  closeDrawer() {
    if (this.closeButton?.nativeElement) {
      console.log('click');
      this.closeButton.nativeElement.click();
    }
  }

  prepararFiltros() {
    const skipUbicacion =
      this.filtrosSeleccionados.get('isManualSelection') === 'true';
    this.filtrosSeleccionados.delete('isManualSelection');

    if (!skipUbicacion && this.ubicacion) {
      const limpiarTexto = (texto: string) => {
        return (
          texto
            ?.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase() || ''
        );
      };

      const ubicacionValue = this.ubicacion;

      if (ubicacionValue) {
        if (this.barrios?.data) {
          const barrioEncontrado = this.barrios.data.find(
            (b) =>
              limpiarTexto(`${b.city_name},${b.name}`) ===
              limpiarTexto(ubicacionValue)
          );

          if (barrioEncontrado) {
            this.filtrosSeleccionados.set('city', barrioEncontrado.city_code);
            this.filtrosSeleccionados.set(
              'neighborhood_code',
              barrioEncontrado.code
            );
          }
        }

        if (!this.filtrosSeleccionados.has('city')) {
          const ciudad = this.ciudades.find(
            (c) => limpiarTexto(c.name) === limpiarTexto(ubicacionValue)
          );
          this.filtrosSeleccionados.set('city', ciudad?.code);
          this.filtrosSeleccionados.delete('neighborhood_code');
        }
      } else {
        this.filtrosSeleccionados.delete('city');
        this.filtrosSeleccionados.delete('neighborhood_code');
      }
    }

    if (this.selectedProperty) {
      this.filtrosSeleccionados.set('biz', this.selectedProperty.code);
    }

    if (this.selectedEstates.length > 0) {
      const estateCodes = this.selectedEstates.map((e) => e.code).join(',');
      this.filtrosSeleccionados.set('type', estateCodes);
    }

    if (this.seleccion.habitaciones.length > 0) {
      const values = this.seleccion.habitaciones;
      if (values.includes('+6')) {
        this.filtrosSeleccionados.set('maxbedroom', 100);
        this.filtrosSeleccionados.set('minbedroom', 6);
      } else {
        this.filtrosSeleccionados.set('bedrooms', values.join(','));
      }
    }

    if (this.seleccion.banos.length > 0) {
      const values = this.seleccion.banos;
      if (values.includes('+6')) {
        this.filtrosSeleccionados.set('maxbathroom', 100);
        this.filtrosSeleccionados.set('minbathroom', 6);
      } else {
        this.filtrosSeleccionados.set('bathrooms', values.join(','));
      }
    }

    if (this.seleccion.parqueadero.length > 0) {
      const values = this.seleccion.parqueadero;
      if (values.includes('+6')) {
        this.filtrosSeleccionados.set('maxparking', 100);
        this.filtrosSeleccionados.set('minparking', 6);
      } else {
        this.filtrosSeleccionados.set('maxparking', values.join(','));
        this.filtrosSeleccionados.set('minparking', values.join(','));
      }
    }

    if (this.seleccion.estrato.length > 0) {
      this.filtrosSeleccionados.set(
        'stratum',
        this.seleccion.estrato.join(',')
      );
    }

    if (this.formRangos.value.AreaMinima) {
      this.filtrosSeleccionados.set(
        'minarea',
        this.formRangos.value.AreaMinima
      );
    }

    if (this.formRangos.value.AreaMaxima) {
      this.filtrosSeleccionados.set(
        'maxarea',
        this.formRangos.value.AreaMaxima
      );
    }

    if (this.selectedProperty) {
      const propertyType = this.selectedProperty.code;

      if (propertyType === '1' || propertyType === '3') {
        if (this.selectedPriceRange) {
          this.filtrosSeleccionados.set('pcmin', this.selectedPriceRange.min);
          if (this.selectedPriceRange.max && this.selectedPriceRange.max > 0) {
            this.filtrosSeleccionados.set('pcmax', this.selectedPriceRange.max);
          } else {
            this.filtrosSeleccionados.delete('pcmax');
          }
        } else {
          const pcmin = this.getNumericValue(this.precioMinimoCtrl);
          const pcmax = this.getNumericValue(this.precioMaximoCtrl);
          if (pcmin > 0) {
            this.filtrosSeleccionados.set('pcmin', pcmin);
          } else {
            this.filtrosSeleccionados.delete('pcmin');
          }
          if (pcmax > 0) {
            this.filtrosSeleccionados.set('pcmax', pcmax);
          } else {
            this.filtrosSeleccionados.delete('pcmax');
          }
        }
      }

      if (propertyType === '2' || propertyType === '3') {
        if (this.selectedPriceRangeVentas) {
          this.filtrosSeleccionados.set('pvmin', this.selectedPriceRangeVentas.min);
          if (this.selectedPriceRangeVentas.max && this.selectedPriceRangeVentas.max > 0) {
            this.filtrosSeleccionados.set('pvmax', this.selectedPriceRangeVentas.max);
          } else {
            this.filtrosSeleccionados.delete('pvmax');
          }
        } else {
          const pvmin = this.getNumericValue(this.precioVentaMinimoCtrl);
          const pvmax = this.getNumericValue(this.precioVentaMaximoCtrl);
          if (pvmin > 0) {
            this.filtrosSeleccionados.set('pvmin', pvmin);
          } else {
            this.filtrosSeleccionados.delete('pvmin');
          }
          if (pvmax > 0) {
            this.filtrosSeleccionados.set('pvmax', pvmax);
          } else {
            this.filtrosSeleccionados.delete('pvmax');
          }
        }
      }
    }
  }

  enviarFiltrosSelect() {
    this.prepararFiltros();

    const opcion = this.formFiltrosSelect.value.opcion;

    if (opcion === 'order-mayor') {
      this.filtrosSeleccionados.set('order', 'pricemin');
    } else if (opcion === 'order-menor') {
      this.filtrosSeleccionados.set('order', 'pricemax');
    } else if (opcion === 'sort-asc') {
      this.filtrosSeleccionados.set('sort', 'asc');
      this.filtrosSeleccionados.set('order', 'consignation_date');
    } else if (opcion === 'sort-des') {
      this.filtrosSeleccionados.set('sort', 'desc');
      this.filtrosSeleccionados.set('order', 'consignation_date');
    }

    console.log(this.filtrosSeleccionados);

    this.cargando = true;
    this.loadingResultados = true;
    const savedCity = this.filtrosSeleccionados.get('city');
    const savedNeighborhood =
      this.filtrosSeleccionados.get('neighborhood_code');

    console.log(this.filtrosSeleccionados);

    if (savedCity) {
      this.filtrosSeleccionados.set('city', savedCity);
    }
    if (savedNeighborhood) {
      this.filtrosSeleccionados.set('neighborhood_code', savedNeighborhood);
    }
    const filtrosObj = Object.fromEntries(this.filtrosSeleccionados);
    console.log('filtrosObj', filtrosObj);
    const obj = {
      ...filtrosObj,
      page: 1,
    };

    console.log('Obj', obj);

    this.inmueblesService
      .getFiltrosEnviar(obj, this.elementsPerPage)
      .subscribe({
        next: (response: any) => {
          console.log('response', response);

          this.resultados = response.data;
          this.totalDatos = response.total;
          this.paginaActual = response.current_page || 1;
          this.paginacion = response;
          this.totalPaginas = response.last_page || 1;
          this.paginas = Array.from(
            { length: this.totalPaginas },
            (_, i) => i + 1
          );

          this.generarPaginas();
          this.cargando = false;
          console.log(this.isDrawerOpen);
          console.log(response);

          var data = {
            "url": this.urlActual(),
            "state": {
              resultados: response.data,
              paginacion: response,
              filtros: obj,
            },
          }

          this.urlParamService.guardarParamLocalStorage('data', JSON.stringify(data));

        },
        error: (error: any) => {
          console.error('Error al obtener los inmuebles:', error);
        },
        complete: () => {
          this.loadingResultados = false;

          if (this.isMobileView && this.isDrawerOpen) {
            this.closeDrawer();
            console.log(this.isDrawerOpen);
          }
        },
      });
  }

  selectPriceRange(
    range: { min: number; max: number | null },
    type: 'arriendo' | 'venta'
  ): void {
    if (type === 'arriendo') {
      if (this.hasManualArriendoPrice()) {
        return;
      }

      if (this.selectedPriceRange?.min === range.min) {
        this.selectedPriceRange = null;
        this.precioMinimoCtrl.enable();
        this.precioMaximoCtrl.enable();
        this.precioMinimoCtrl.setValue('');
        this.precioMaximoCtrl.setValue('');
        this.filtrosSeleccionados.delete('pcmin');
        this.filtrosSeleccionados.delete('pcmax');
      } else {
        this.selectedPriceRange = range;
        this.precioMinimoCtrl.setValue('');
        this.precioMaximoCtrl.setValue('');
        this.precioMinimoCtrl.disable();
        this.precioMaximoCtrl.disable();
        this.filtrosSeleccionados.set('pcmin', range.min.toString());
        if (range.max !== null && range.max > 0) {
          this.filtrosSeleccionados.set('pcmax', range.max.toString());
        } else {
          this.filtrosSeleccionados.delete('pcmax');
        }
      }
    } else if (type === 'venta') {
      if (this.hasManualVentaPrice()) {
        return;
      }

      if (this.selectedPriceRangeVentas?.min === range.min) {
        this.selectedPriceRangeVentas = null;
        this.precioVentaMinimoCtrl.enable();
        this.precioVentaMaximoCtrl.enable();
        this.precioVentaMinimoCtrl.setValue('');
        this.precioVentaMaximoCtrl.setValue('');
        this.filtrosSeleccionados.delete('pvmin');
        this.filtrosSeleccionados.delete('pvmax');
      } else {
        this.selectedPriceRangeVentas = range;
        this.precioVentaMinimoCtrl.setValue('');
        this.precioVentaMaximoCtrl.setValue('');
        this.precioVentaMinimoCtrl.disable();
        this.precioVentaMaximoCtrl.disable();
        this.filtrosSeleccionados.set('pvmin', range.min.toString());
        if (range.max !== null && range.max > 0) {
          this.filtrosSeleccionados.set('pvmax', range.max.toString());
        } else {
          this.filtrosSeleccionados.delete('pvmax');
        }
      }
    }
    this.cdRef.detectChanges();
  }

  seleccionar(categoria: keyof typeof this.seleccion, valor: number | string) {
    const arr = this.seleccion[categoria] as (number | string)[];
    const index = arr.indexOf(valor);
    index > -1 ? arr.splice(index, 1) : arr.push(valor);
  }

  isEstateSelected(option: any): boolean {
    return this.selectedEstates.some((o) => o.code === option.code);
  }

  filterLocations() {
    const search = this.searchTerm.toLowerCase().trim();

    const ciudadesFiltradas = this.ciudades.filter((ciudad) =>
      ciudad.name.toLowerCase().includes(search)
    );

    const barriosFiltrados = this.barrios.data.filter(
      (barrio: any) =>
        barrio.city_name.toLowerCase().includes(search) ||
        barrio.name.toLowerCase().includes(search)
    );

    this.filteredBarrios = [
      ...ciudadesFiltradas.map((c) => ({ ...c, isCity: true })),
      ...barriosFiltrados,
    ].filter(
      (item, index, self) =>
        index ===
        self.findIndex((i) =>
          i.isCity ? i.code === item.code : i.code === item.code
        )
    );

    this.filteredBarrios.sort((a: any, b: any) => {
      if (a.isCity && !b.isCity) return -1;
      if (!a.isCity && b.isCity) return 1;
      return 0;
    });
  }

  selectLocation(item: any) {
    if (item.isCity) {
      this.searchTerm = item.name;
      this.filtrosSeleccionados.set('city', item.code);
      this.filtrosSeleccionados.delete('neighborhood_code');
    } else {
      this.searchTerm = `${item.city_name}, ${item.name}`;
      this.filtrosSeleccionados.set('city', item.city_code);
      this.filtrosSeleccionados.set('neighborhood_code', item.code);
    }

    this.filteredBarrios = [];
    this.ubicacion = this.searchTerm;
    this.filtrosSeleccionados.set('isManualSelection', 'true');
    if (this.searchTerm != '') {
      this.enviarFiltros(1);
    }
  }

  selectOption(type: 'property' | 'estate', option: any): void {
    if (type === 'property') {
      this.selectedProperty =
        this.selectedProperty?.code === option.code ? null : option;
      this.isPropertyDropdownOpen = false;
    }

    if (type === 'estate') {
      const index = this.selectedEstates.findIndex(
        (o) => o.code === option.code
      );
      if (index > -1) {
        this.selectedEstates.splice(index, 1);
      } else {
        this.selectedEstates.push(option);
      }
    }
  }

  borrarFiltros() {
    this.filtrosSeleccionados.clear();
    this.selectedPriceRange = null;
    this.selectedPriceRangeVentas = null;

    this.precioMinimoCtrl.enable();
    this.precioMinimoCtrl.setValue('');
    this.precioMaximoCtrl.enable();
    this.precioMaximoCtrl.setValue('');

    this.precioVentaMinimoCtrl.enable();
    this.precioVentaMinimoCtrl.setValue('');
    this.precioVentaMaximoCtrl.enable();
    this.precioVentaMaximoCtrl.setValue('');

    this.seleccion = {
      habitaciones: [],
      banos: [],
      parqueadero: [],
      estrato: [],
    };

    this.formRangos.patchValue({
      AreaMinima: null,
      AreaMaxima: null,
      precioMinimo: null,
      precioMaximo: null,
      precioVentaMinimo: null,
      precioVentaMaximo: null,
    });

    this.cdRef.detectChanges();

    this.enviarFiltros(1);
  }

  clearSearch() {
    this.searchTerm = '';
    this.filteredBarrios = [];
  }

  toggleDropdown(type: 'property' | 'estate'): void {
    if (type === 'property') {
      this.isPropertyDropdownOpen = !this.isPropertyDropdownOpen;
      this.isEstateDropdownOpen = false;
    }
    if (type === 'estate') {
      this.isEstateDropdownOpen = !this.isEstateDropdownOpen;
      this.isPropertyDropdownOpen = false;
    }
  }

  getButtonClass(condition: boolean): string {
    const base = 'flex items-center px-3 py-2 text-sm rounded-md';
    return condition
      ? `${base} bg-[#080E36] text-white`
      : `${base} bg-blue-100 text-blue-700`;
  }

  getIcon(type: 'property' | 'estate', option: any): string {
    if (type === 'property') {
      if (!option) return 'fas fa-list-ul';
      const code = typeof option === 'object' ? option.code : '';
      return this.icons.property[code] || 'fas fa-home';
    } else {
      const code = typeof option === 'object' ? option.code : '';
      return this.icons.estate[code] || 'fas fa-question-circle';
    }
  }

  getCiudades() {
    this.inmueblesService.getCiudades().subscribe(
      (response: any) => {
        this.ciudades = response.data;
      },
      (error: any) => {
        console.error('Error al obtener las ciudades:', error);
      }
    );
  }

  getBarrios() {
    this.inmueblesService.getBarrios().subscribe(
      (data: any) => {
        this.barrios = data;
        console.log('Barrios:', this.barrios);
      },
      (error: any) => {
        console.log(error);
        console.error('Error al obtener los barrios:', error);
      }
    );
  }

  getCategoriasInmuebles() {
    this.inmueblesService.getCategoriasInmuebles().subscribe(
      (response: any) => {
        this.categoriasInmuebles = response.data;

        this.propertyOptions = response.data.map((cat: any) => {
          if (cat.code === '3') {
            return { ...cat, displayName: 'Arriendo/venta' };
          }
          return cat;
        });

        const defaultOption =
          this.propertyOptions.find((cat) => cat.code === '3') ||
          this.propertyOptions[0];
        this.selectedProperty = defaultOption;
      },
      (error: any) => {
        console.error('Error al obtener las categorias:', error);
      }
    );
  }

  getTipoPropiedad() {
    this.inmueblesService.getTipoPropiedad().subscribe(
      (response: any) => {
        this.estateOptions = response.data;

        this.selectedEstates = this.estateOptions.length
          ? [this.estateOptions[0]]
          : [];
      },
      (error: any) => {
        console.error('Error al obtener los tipos de propiedad:', error);
      }
    );
  }


  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  private initAutoComplete(ctrl: FormControl): Observable<number[]> {
    return ctrl.valueChanges.pipe(
      startWith(''),
      map(value => this.generateSuggestions(value))
    );
  }

  private generateSuggestions(value: string | number | null): number[] {
    const num = parseInt((value || '').toString().replace(/\D/g, ''), 10);
    if (!num || isNaN(num)) return [];

    const multipliers = [1, 10, 100, 1000, 10000];
    const suggestions = multipliers.map(m => num * m).filter(v => v <= 50000000000);

    return suggestions;
  }

  onMinSelected(event: any, trigger?: MatAutocompleteTrigger, type: 'arriendo' | 'venta' = 'arriendo') {
    const value = event.option.value;
    const ctrl = type === 'arriendo' ? this.precioMinimoCtrl : this.precioVentaMinimoCtrl;
    const num = typeof value === 'number' ? value : parseInt((value || '').toString().replace(/\D/g, ''), 10);

    if (!isNaN(num) && num > 0) {
      ctrl.setValue(num.toLocaleString('es-CO'), { emitEvent: true });
    }

    if (type === 'arriendo') {
      this.selectedPriceRange = null;
    } else {
      this.selectedPriceRangeVentas = null;
    }
    this.cdRef.detectChanges();
  }

  onMaxSelected(event: any, trigger?: MatAutocompleteTrigger, type: 'arriendo' | 'venta' = 'arriendo') {
    const value = event.option.value;
    const ctrl = type === 'arriendo' ? this.precioMaximoCtrl : this.precioVentaMaximoCtrl;
    const num = typeof value === 'number' ? value : parseInt((value || '').toString().replace(/\D/g, ''), 10);

    if (!isNaN(num) && num > 0) {
      ctrl.setValue(num.toLocaleString('es-CO'), { emitEvent: true });
    }

    if (type === 'arriendo') {
      this.selectedPriceRange = null;
    } else {
      this.selectedPriceRangeVentas = null;
    }
    this.cdRef.detectChanges();
  }

  formatCurrencyInput(ctrl: FormControl, type?: 'arriendo' | 'venta'): void {
    const rawValue = ctrl.value?.toString().replace(/\D/g, '') || '';
    if (!rawValue) {
      ctrl.setValue('', { emitEvent: false });
      return;
    }

    const numericValue = parseInt(rawValue, 10);
    const formattedValue = numericValue.toLocaleString('es-CO');

    ctrl.setValue(formattedValue, { emitEvent: false });

    if (type === 'arriendo' && this.selectedPriceRange) {
      this.selectedPriceRange = null;
    } else if (type === 'venta' && this.selectedPriceRangeVentas) {
      this.selectedPriceRangeVentas = null;
    }
  }

  getNumericValue(ctrl: FormControl): number {
    return parseInt(ctrl.value?.toString().replace(/\D/g, '') || '0', 10) || 0;
  }

  onInputBlur(trigger: MatAutocompleteTrigger): void {
    trigger.closePanel();
  }


}