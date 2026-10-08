import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { InmueblesService } from '../../../../core/Inmuebles/inmuebles.service';
import { CommonModule } from '@angular/common';
import { CategoryEnum } from '../../../../core/enums/CategoryEnum';
import { TipoPropiedadEnum } from '../../../../core/enums/TipoPropiedadEnum';
import { NavbarComponent2 } from '../../../../shared/navbar-2/navbar-2.component';
import { catchError, forkJoin, of } from 'rxjs';
import { BarraFiltrosComponent } from '../../../../shared/barra-filtros/barra-filtros.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { BarraFiltrosPrioritariosComponent } from "../barra-filtros-prioritarios/barra-filtros-prioritarios.component";
import { WishlistServiceService } from '../../../../core/wishlist/wishlist-service.service';
import { OffcanvasWishlistComponent } from '../../../Inicio/Components/offcanvas-wishlist/offcanvas-wishlist.component';
import { ModalWishlistComponent } from '../../../../shared/modal-wishlist/modal-wishlist.component';
import { BotonesFlotantesComponent } from '../../../../shared/botones-flotantes/botones-flotantes.component';

@Component({
  selector: 'app-prioritarios',
  standalone: true,
  imports: [RouterLink, CommonModule, NavbarComponent2, BarraFiltrosPrioritariosComponent, OffcanvasWishlistComponent, ModalWishlistComponent, BotonesFlotantesComponent],
  templateUrl: './prioritarios.component.html',
  styleUrl: './prioritarios.component.scss'
})
export class PrioritariosComponent implements OnInit {

  @ViewChild('carruselVenta') carruselVenta!: ElementRef;

  reference = {
    code: "4025"
  }

  type: string = "";

  paramsFilter: any = {
    oro: "",
    plata: "",
    diamante: ""
  };

  isCargando!: boolean;


  paginacionCategory: any = {
    oro: {
      totalDatosVenta: "",
      paginaActualVenta: "",
      paginacionVenta: "",
      totalPaginasVenta: "",
      paginasVenta: ""
    },
    plata: {
      totalDatosVenta: "",
      paginaActualVenta: "",
      paginacionVenta: "",
      totalPaginasVenta: "",
      paginasVenta: ""
    },
    diamante: {
      totalDatosVenta: "",
      paginaActualVenta: "",
      paginacionVenta: "",
      totalPaginasVenta: "",
      paginasVenta: ""
    }
  };

  paginacionVenta: any = {};

  mostrarContenido = false;
  asesorId!: string;
  filtrosSeleccionadosOro: Map<string, any> = new Map();
  filtrosSeleccionadosPlata: Map<string, any> = new Map();
  filtrosSeleccionadosDiamante: Map<string, any> = new Map();
  totalDatosVenta = 0;

  totalPaginasVenta = 0;

  paginaActualVenta: number = 1;

  elementsPerPage = 12;
  bloqueActualVenta: number = 0;


  inmueblesVisiblesVenta: any[] = [];
  loadingResultadosVenta: boolean = false;

  isDrawerOpen: boolean = false;
  resultados: any[] = [];

  paginasVenta: (number | string)[] = [];


  mostrarModalRecorrido = false

  mostrarOffcanvas: boolean = false;
  minimizarOffcanvas: boolean = true;
  favService = inject(WishlistServiceService);



  isSmallScreen = false;

  activatedRoute = inject(ActivatedRoute);
  router = inject(Router);
  // router = inject(Router);
  inmubeService = inject(InmueblesService);

  biz!: string;
  category!: string;


  ngOnInit(): void {

    const queryParams = this.activatedRoute.snapshot.queryParams;

    if (queryParams['biz']) {
      this.biz = queryParams['biz'];

      this.getBiz(queryParams['biz'], null);


      if (this.biz === TipoPropiedadEnum.ARRIENDO) {
        if (queryParams['category']) {
          this.category = queryParams['category'];
          this.getBiz(queryParams['biz'], queryParams['category']);
        } else {

          this.category = 'DIAMANTE';
          this.router.navigate([], {
            queryParams: { category: this.category },
            queryParamsHandling: 'merge'
          });

          this.getBiz(queryParams['biz'], this.category);
          // this.getBiz(queryParams['biz'], null);
        }
      }


    }

    this.obtenerInmuebles(this.elementsPerPage, 1);

  }



   agregarFavorito(propiedad: any) {


    this.favService.agregar(propiedad);
    this.toggleOffcanvas()

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

  getBiz(type: string, category: string | null) {
    // this.filtrosSeleccionadosDiamante.clear();
    // this.filtrosSeleccionadosOro.clear();
    // this.filtrosSeleccionadosPlata.clear();

    this.filtrosSeleccionadosOro.set('reference', this.reference.code);

    this.filtrosSeleccionadosPlata.set('reference', this.reference.code);

    this.filtrosSeleccionadosDiamante.set('reference', this.reference.code);



    if (type === TipoPropiedadEnum.VENTA) {
      this.type = "Venta";

      this.filtrosSeleccionadosOro.set('biz', TipoPropiedadEnum.VENTA);
      this.filtrosSeleccionadosDiamante.set('biz', TipoPropiedadEnum.VENTA);
      this.filtrosSeleccionadosPlata.set('biz', TipoPropiedadEnum.VENTA);

      //oro
      this.filtrosSeleccionadosOro.set('pvmin', 1000000001);
      this.filtrosSeleccionadosOro.set('pvmax', 2000000000);

      //plata
      this.filtrosSeleccionadosPlata.set('pvmin', 100000000);
      this.filtrosSeleccionadosPlata.set('pvmax', 1000000000);

      //diamante
      this.filtrosSeleccionadosDiamante.set('pvmin', 2000000000);
      this.filtrosSeleccionadosDiamante.set('pvmax', 100000000000);






    }


    if (type === TipoPropiedadEnum.ARRIENDO) {


      this.type = "Arriendo";

      this.getCategory(category!);


    }

    this.paramsFilter.oro = this.filtrosSeleccionadosOro;
    this.paramsFilter.plata = this.filtrosSeleccionadosPlata;
    this.paramsFilter.diamante = this.filtrosSeleccionadosDiamante;


    console.log(this.filtrosSeleccionadosDiamante)
    console.log(this.filtrosSeleccionadosOro)
    console.log(this.filtrosSeleccionadosPlata)
  }

  getCategory(category: string) {
    if (category === CategoryEnum.ORO) {
      this.filtrosSeleccionadosOro.set('biz', TipoPropiedadEnum.ARRIENDO);
      //oro
      this.filtrosSeleccionadosOro.set('pcmin', 8000000);
      this.filtrosSeleccionadosOro.set('pcmax', 15000000);
    }

    if (category === CategoryEnum.PLATA) {
      this.filtrosSeleccionadosPlata.set('biz', TipoPropiedadEnum.ARRIENDO);
      //plata
      this.filtrosSeleccionadosPlata.set('pcmin', 2000000);
      this.filtrosSeleccionadosPlata.set('pcmax', 8000000);
    }

    if (category === CategoryEnum.DIAMANTE) {
      this.filtrosSeleccionadosDiamante.set('biz', TipoPropiedadEnum.ARRIENDO);
      //diamante
      this.filtrosSeleccionadosDiamante.set('pcmin', 15000000);
      this.filtrosSeleccionadosDiamante.set('pcmax', 100000000000);
    }
  }



  scrollCarrusel(tipo: 'venta' | 'arriendo', direccion: 'left' | 'right') {
    const carrusel = this.carruselVenta;
    const scrollAmount = 350; // cantidad de píxeles que se moverá

    if (direccion === 'left') {
      carrusel.nativeElement.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      carrusel.nativeElement.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  getFiltrosSeleccionados(filtros: [string, any][]) {

    this.loadingResultadosVenta = true

    this.isCargando = true;
    this.filtrosSeleccionadosDiamante.clear();
    this.filtrosSeleccionadosOro.clear();
    this.filtrosSeleccionadosPlata.clear();
    const filter = new Map<string, any>(filtros);
    console.log(filter);

    for (const [key, value] of filter) {
      this.filtrosSeleccionadosOro.set(key, value);
      this.filtrosSeleccionadosPlata.set(key, value);
      this.filtrosSeleccionadosDiamante.set(key, value);
    }


    const queryParams = this.activatedRoute.snapshot.queryParams;

    if (queryParams['biz']) {
      this.getBiz(queryParams['biz'], this.category);
    }

    this.obtenerInmuebles(this.elementsPerPage, 1);




  }



  obtenerInmuebles(elementsPerPage: number, page: number) {

    this.resultados = [];



    if (this.biz === TipoPropiedadEnum.VENTA) {
      //oro
      const filtrosObjOro = Object.fromEntries(this.filtrosSeleccionadosOro);
      const objOro = {
        ...filtrosObjOro,
        page: page,
      };

      //plata
      const filtrosObjPlata = Object.fromEntries(this.filtrosSeleccionadosPlata);
      const objPlata = {
        ...filtrosObjPlata,
        page: page,
      };

      //diamante
      const filtrosObjDiamante = Object.fromEntries(this.filtrosSeleccionadosDiamante);
      const objDiamante = {
        ...filtrosObjDiamante,
        page: page,
      };
      forkJoin({
        oro: this.inmubeService.getFiltrosEnviar(objOro, elementsPerPage).pipe(
          catchError(err => {
            console.error('Error al cargar usuarios:', err);
            return of([] as any[]);
          })
        ),
        plata: this.inmubeService.getFiltrosEnviar(objPlata, elementsPerPage).pipe(
          catchError(err => {
            console.error('Error al cargar productos:', err);
            return of([] as any[]);
          })
        ),
        diamante: this.inmubeService.getFiltrosEnviar(objDiamante, elementsPerPage).pipe(
          catchError(err => {
            console.error('Error al cargar pedidos:', err);
            return of([] as any[]);
          })
        )
      }).subscribe({
        next: ({ oro, plata, diamante }) => {






          console.log('✅ Datos cargados correctamente:', { oro, plata, diamante });

          this.isCargando = false;
          const o: any = oro;
          const p: any = plata;
          const d: any = diamante;





          //ORO

          this.paginacionCategory.oro.totalDatosVenta = o.total;
          this.paginacionCategory.oro.paginaActualVenta = o.current_page || 1;
          this.paginacionCategory.oro.paginacionVenta = o;
          this.paginacionCategory.oro.totalPaginasVenta = o.last_page || 1;
          this.paginacionCategory.oro.paginasVenta = Array.from(
            { length: this.paginacionCategory.oro.totalPaginasVenta },
            (_, i) => i + 1
          );
          var resultOro = {
            type: "Oro",
            data: oro,
            paginacion: this.paginacionCategory.oro
          }
          this.resultados.push(resultOro);


          //PLATA

          this.paginacionCategory.plata.totalDatosVenta = p.total;
          this.paginacionCategory.plata.paginaActualVenta = p.current_page || 1;
          this.paginacionCategory.plata.paginacionVenta = p;
          this.paginacionCategory.plata.totalPaginasVenta = p.last_page || 1;
          this.paginacionCategory.plata.paginasVenta = Array.from(
            { length: this.paginacionCategory.plata.totalPaginasVenta },
            (_, i) => i + 1
          );

          var resultPlata = {
            type: "Plata",
            data: plata,
            paginacion: this.paginacionCategory.plata
          }
          this.resultados.push(resultPlata);


          //DIAMANTE
          this.paginacionCategory.diamante.totalDatosVenta = d.total;
          this.paginacionCategory.diamante.paginaActualVenta = d.current_page || 1;
          this.paginacionCategory.diamante.paginacionVenta = d;
          this.paginacionCategory.diamante.totalPaginasVenta = d.last_page || 1;
          this.paginacionCategory.diamante.paginasVenta = Array.from(
            { length: this.paginacionCategory.diamante.totalPaginasVenta },
            (_, i) => i + 1
          );


          var resultDiamante = {
            type: "Diamante",
            data: diamante,
            paginacion: this.paginacionCategory.diamante
          }
          this.resultados.push(resultDiamante);
          console.log(this.resultados);

          this.isCargando = false
          console.log(this.isCargando);
          this.loadingResultadosVenta = false
        },
        error: (err) => {
          console.error('❌ Error general:', err);
        }
      });
    }

    if (this.biz === TipoPropiedadEnum.ARRIENDO) {
      var obj = {};
      if (this.category === CategoryEnum.ORO) {

        //oro
        const filtrosObjOro = Object.fromEntries(this.filtrosSeleccionadosOro);
        const objOro = {
          ...filtrosObjOro,
          page: page,
        };
        obj = objOro;
      }

      if (this.category === CategoryEnum.PLATA) {

        //plata
        const filtrosObjPlata = Object.fromEntries(this.filtrosSeleccionadosPlata);
        const objPlata = {
          ...filtrosObjPlata,
          page: page,
        };
        obj = objPlata;
      }

      if (this.category === CategoryEnum.DIAMANTE) {

        //diamante
        const filtrosObjDiamante = Object.fromEntries(this.filtrosSeleccionadosDiamante);
        const objDiamante = {
          ...filtrosObjDiamante,
          page: page,
        };
        obj = objDiamante;
      }


      if (JSON.stringify(obj) === "{}") {
        obj = {
          reference: this.reference.code,
          page: page,
        }
      }

      console.log(obj);


      this.inmubeService.getFiltrosEnviar(obj, elementsPerPage).subscribe(
        (data: any) => {

          console.log(data);


          var paginacion = {
            totalDatosVenta: data.total,
            paginaActualVenta: data.current_page || 1,
            paginacionVenta: data,
            totalPaginasVenta: data.last_page || 1,
            paginasVenta: Array.from(
              { length: data.last_page },
              (_, i) => i + 1
            )
          }

          var result = {
            type: this.transform(this.category),
            data: data,
            paginacion: paginacion
          }
          this.resultados.push(result)

          console.log(this.resultados);

          // this.totalDatosVenta = data.total;
          // this.paginaActualVenta = data.current_page || 1;
          // this.paginacionVenta = data;
          // this.totalPaginasVenta = data.last_page || 1;
          // this.paginasVenta = Array.from(
          //   { length: this.totalPaginasVenta },
          //   (_, i) => i + 1
          // );



          this.generarPaginas();

          this.loadingResultadosVenta = false
          this.isCargando = false
          console.log(this.isCargando);
        },
        (error: any) => {
          console.error('Error al obtener las propiedades:', error);
        }
      );

    }



    // this.inmubeService.getFiltrosEnviar(obj, elementsPerPage).subscribe(
    //   (data: any) => {

    //   },
    //   (error: any) => {
    //     console.error('Error al obtener las propiedades:', error);
    //   }
    // );


  }


  transform(value: string): string {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  generarPaginas() {
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

  irAlSiguienteBloque(tipo: string) {

    const maxBloques = Math.floor((this.totalPaginasVenta - 1) / 3);
    console.log(this.bloqueActualVenta < maxBloques);
    console.log(this.bloqueActualVenta);


    if (this.bloqueActualVenta < maxBloques) {
      console.log('bloque sig');

      this.bloqueActualVenta++;
      this.generarPaginas();
    }

  }

  irAlBloqueAnterior(tipo: string) {
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



      this.generarPaginas();

    }

  }

  cambiarPagina(pagina: number | string, tipo: string, resul: any) {
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


      this.getInmuebles(pagina, this.elementsPerPage, resul);

      setTimeout(() => {
        this.loadingResultadosVenta = false
      }, 1000);

      const nuevoBloque = Math.floor((pagina - 1) / 3);
      if (nuevoBloque !== this.bloqueActualVenta) {

        this.bloqueActualVenta = nuevoBloque;
        this.generarPaginas();
      }


    }


  }


  paginaAnterior(tipo: string, resul: any) {
    this.loadingResultadosVenta = true
    const nuevaPagina = resul.paginacion.paginaActualVenta - 1;
    const paginasPorBloque = 3;
    const nuevoBloque = Math.floor((nuevaPagina - 1) / paginasPorBloque);

    this.getInmuebles(nuevaPagina, this.elementsPerPage, resul);
    setTimeout(() => {
      this.loadingResultadosVenta = false
    }, 1000);

    if (nuevoBloque !== this.bloqueActualVenta) {
      this.bloqueActualVenta = nuevoBloque;
      this.generarPaginas();
    }

  }

  paginaSiguiente(tipo: string, resul: any) {

    this.loadingResultadosVenta = true
    const nuevaPagina = resul.paginacion.paginaActualVenta + 1;


    this.getInmuebles(nuevaPagina, this.elementsPerPage, resul);

    setTimeout(() => {
      this.loadingResultadosVenta = false
    }, 1000);


    const paginasPorBloque = 3;
    const bloqueActual = Math.floor((nuevaPagina - 1) / paginasPorBloque);

    if (bloqueActual !== this.bloqueActualVenta) {
      this.bloqueActualVenta = bloqueActual;
      this.generarPaginas();
    }

  }


  getInmuebles(page: any, elementsPerPage: number, result: any) {
    var obj = {};

    if (this.biz === TipoPropiedadEnum.ARRIENDO) {
      this.resultados = [];

      if (this.category === CategoryEnum.ORO) {

        //oro
        const filtrosObjOro = Object.fromEntries(this.filtrosSeleccionadosOro);
        const objOro = {
          ...filtrosObjOro,
          page: page,
        };
        obj = objOro;
      }

      if (this.category === CategoryEnum.PLATA) {

        //plata
        const filtrosObjPlata = Object.fromEntries(this.filtrosSeleccionadosPlata);
        const objPlata = {
          ...filtrosObjPlata,
          page: page,
        };
        obj = objPlata;
      }

      if (this.category === CategoryEnum.DIAMANTE) {
        //diamante
        const filtrosObjDiamante = Object.fromEntries(this.filtrosSeleccionadosDiamante);
        const objDiamante = {
          ...filtrosObjDiamante,
          page: page,
        };
        obj = objDiamante;

      }

      if (JSON.stringify(obj) === "{}") {
        obj = {
          reference: this.reference.code,
          page: page,
        }
      }

      console.log(obj);


      this.inmubeService.getFiltrosEnviar(obj, elementsPerPage).subscribe(
        (data: any) => {

          console.log(data);


          var paginacion = {
            totalDatosVenta: data.total,
            paginaActualVenta: data.current_page || 1,
            paginacionVenta: data,
            totalPaginasVenta: data.last_page || 1,
            paginasVenta: Array.from(
              { length: data.last_page },
              (_, i) => i + 1
            )
          }

          var result = {
            type: this.transform(this.category),
            data: data,
            paginacion: paginacion
          }
          this.resultados.push(result)

          console.log(this.resultados);

          // this.totalDatosVenta = data.total;
          // this.paginaActualVenta = data.current_page || 1;
          // this.paginacionVenta = data;
          // this.totalPaginasVenta = data.last_page || 1;
          // this.paginasVenta = Array.from(
          //   { length: this.totalPaginasVenta },
          //   (_, i) => i + 1
          // );



          this.generarPaginas();

          this.loadingResultadosVenta = false
        },
        (error: any) => {
          console.error('Error al obtener las propiedades:', error);
        }
      );
    }

    if (this.biz === TipoPropiedadEnum.VENTA) {

      if (result.type.toUpperCase() === CategoryEnum.ORO) {

        //oro
        const filtrosObjOro = Object.fromEntries(this.filtrosSeleccionadosOro);
        const objOro = {
          ...filtrosObjOro,
          page: page,
        };
        obj = objOro;
      }

      if (result.type.toUpperCase() === CategoryEnum.PLATA) {

        //plata
        const filtrosObjPlata = Object.fromEntries(this.filtrosSeleccionadosPlata);
        const objPlata = {
          ...filtrosObjPlata,
          page: page,
        };
        obj = objPlata;
      }

      if (result.type.toUpperCase() === CategoryEnum.DIAMANTE) {

        //diamante
        const filtrosObjDiamante = Object.fromEntries(this.filtrosSeleccionadosDiamante);
        const objDiamante = {
          ...filtrosObjDiamante,
          page: page,
        };
        obj = objDiamante;

      }

      if (JSON.stringify(obj) === "{}") {
        obj = {
          reference: this.reference.code,
          page: page,
        }
      }
      console.log(result);
      console.log(obj);


      this.inmubeService.getFiltrosEnviar(obj, elementsPerPage).subscribe(
        (data: any) => {

          console.log(data);


          var paginacion = {
            totalDatosVenta: data.total,
            paginaActualVenta: data.current_page || 1,
            paginacionVenta: data,
            totalPaginasVenta: data.last_page || 1,
            paginasVenta: Array.from(
              { length: data.last_page },
              (_, i) => i + 1
            )
          }


          result.data = data
          result.paginacion = paginacion;

          // var resultFind = this.resultados.find(x => x.type === this.transform(result.type));


          // resultFind.data.data = data.data;
          // resultFind.paginacion = paginacion;

          console.log(data.data);


          // var result = {
          //   type: this.transform(this.category),
          //   data: data,
          //   paginacion: paginacion
          // }
          // this.resultados.push(result)

          console.log(this.resultados);

          // this.totalDatosVenta = data.total;
          // this.paginaActualVenta = data.current_page || 1;
          // this.paginacionVenta = data;
          // this.totalPaginasVenta = data.last_page || 1;
          // this.paginasVenta = Array.from(
          //   { length: this.totalPaginasVenta },
          //   (_, i) => i + 1
          // );



          this.generarPaginas();

          this.loadingResultadosVenta = false
        },
        (error: any) => {
          console.error('Error al obtener las propiedades:', error);
        }
      );

    }

  }


}
