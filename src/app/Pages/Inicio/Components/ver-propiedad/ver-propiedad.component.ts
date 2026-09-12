import {
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { NavbarComponent } from '../../../../shared/navbar/navbar.component';
import { NavbarComponent2 } from '../../../../shared/navbar-2/navbar-2.component';
import { InmueblesService } from '../../../../core/Inmuebles/inmuebles.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ModalCrearContactoComponent } from '../Modals/modal-crear-contacto/modal-crear-contacto.component';
import { FooterComponent } from '../../../../shared/footer/footer.component';
import { MapaComponent } from '../mapa/mapa.component';
import mediumZoom from 'medium-zoom';
import { log } from 'console';
import { BotonesFlotantesComponent } from '../../../../shared/botones-flotantes/botones-flotantes.component';
import { VolverComponent } from '../../../../shared/volver/volver.component';
import { SafeUrlPipePipe } from '../../../../shared/pipes/safe-url-pipe.pipe';
import { DataasesoresService } from '../../../../core/dataAsesores/dataasesores.service';
import { Meta, Title } from '@angular/platform-browser';
import { ModalWishlistComponent } from '../../../../shared/modal-wishlist/modal-wishlist.component';
import { OffcanvasWishlistComponent } from '../offcanvas-wishlist/offcanvas-wishlist.component';


@Component({
  selector: 'app-ver-propiedad',
  standalone: true,
  imports: [
    NavbarComponent,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    RouterModule,
    ModalCrearContactoComponent,
    FooterComponent,
    BotonesFlotantesComponent,
    VolverComponent,
    NavbarComponent2,
    SafeUrlPipePipe,
    ModalWishlistComponent,
    OffcanvasWishlistComponent,
  ],
  templateUrl: './ver-propiedad.component.html',
  styleUrl: './ver-propiedad.component.scss',
})
export class VerPropiedadComponent implements OnInit {
  @ViewChild(ModalCrearContactoComponent)
  modalCrearContacto!: ModalCrearContactoComponent;

  codPro?: number;
  selectedIndex = 0;
  propiedad: any = {};
  elementsPerPage = 12;
  totalInmuebles = 3;
  thumbnailsPerPage = 3;
  resultadosFiltros: any[] = [];
  selectedImageUrl: string | null = null;
  media: any[] = [];
  isModalOpen = false;
  datosCargados = false;
  mostrarContenido = false;

  filtrosSeleccionados: Map<string, any> = new Map();

  private currentScale = 1;
  private zoomInstance: any;
  private isZoomActive = false;

  visibleThumbnailsStart = 0;
  selectedImage: string = '';
  tabActivo: string = 'fotos';

  asesor: any = {};

  router = inject(Router);
  route = inject(ActivatedRoute);
  cdRef = inject(ChangeDetectorRef);
  inmueblesService = inject(InmueblesService);
  dataasesoresService = inject(DataasesoresService);
  meta = inject(Meta);
  title = inject(Title);
  mostrarOffcanvas: boolean = false;
  minimizarOffcanvas: boolean = true;

  mostrarModalRecorrido = false


  ngOnInit(): void {

    window.scrollTo(0, 0);
    this.initZoom();

    this.route.paramMap.subscribe((params) => {
      this.propiedad = {}
      this.codPro = Number(params.get('codpro'));
      const ocultar = Number(params.get('ocultarContenido')) === 1;
      this.getDatosPropiedad();
      this.updateParams();

    });
    const ocultar = Number(this.route.snapshot.paramMap.get('ocultarContenido')) === 1;
    this.mostrarContenido = !ocultar;

    this.getDatos();
    this.updateParams();

    this.getAsesor();

    if (this.propiedad?.descripcion) {
      this.meta.updateTag({ property: 'og:description', content: this.propiedad.descripcion });
    }
    if (this.propiedad?.images?.[0]?.imageurl) {
      this.meta.updateTag({ property: 'og:image', content: this.propiedad.images[0].imageurl });
    }

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

  getAsesor() {
    const broker = this.propiedad?.broker?.[0];
    if (broker) {
      let asesorEncontrado = this.dataasesoresService.getAsesorById(broker.code);
      if (asesorEncontrado) {
        this.asesor = asesorEncontrado;
      } else {
        const nombreBroker = `${broker.name || ''} ${broker.last_name || ''}`.trim();
        this.asesor = {
          id: broker.code || 72656,
          nombre: (nombreBroker && nombreBroker !== 'RENTA RAIZ') ? nombreBroker : 'Renta Raíz',
          cargo: 'Equipo Comercial',
          telefono: broker.movil_phone || broker.telephone || '314 543 8665',
          email: broker.email || 'info@rentaraiz.co',
          imagen: broker.picture || 'assets/images/rentaraiz.png'
        };
      }
    } else {
      this.asesor = this.dataasesoresService.getDefaultAsesor();
    }
    console.log(this.asesor);
  }

  abrirPortafolio(asesorCode: any) {
    if (!asesorCode) return;
    this.router.navigate(['/portafolio', asesorCode]).then(() => {
      window.scrollTo(0, 0); // opcional: para que siempre inicie arriba
    });
  }


  getDatos() {
    // this.getDatosPropiedad();
    this.prepararFiltros();
  }

  openModal(index: number): void {
    this.selectedIndex = index;
    this.isModalOpen = true;
    setTimeout(() => {
      this.initZoom();
    }, 100);
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.destroyZoom();
  }

  initZoom(): void {
    this.destroyZoom();

    const images = document.querySelectorAll('[data-zoom-src]');
    this.zoomInstance = mediumZoom(images, {
      background: 'rgba(0, 0, 0, 0.9)',
      margin: 24,
      scrollOffset: 40,
      template: '#zoom-template',
    });

    this.zoomInstance.on('open', () => {
      this.isZoomActive = true;
    });

    this.zoomInstance.on('close', () => {
      this.isZoomActive = false;
      this.currentScale = 1;
    });
  }

  destroyZoom(): void {
    if (this.zoomInstance) {
      this.zoomInstance.detach();
      this.zoomInstance = null;
    }
    this.isZoomActive = false;
    this.currentScale = 1;
  }

  handleImageClick(event: Event): void {
    if (this.isZoomActive) {
      event.stopPropagation();
    }
  }

  prevImageM(): void {
    this.selectedIndex =
      (this.selectedIndex - 1 + this.propiedad.images.length) %
      this.propiedad.images.length;
    this.resetZoom();
    this.reinitZoom();
  }

  nextImageM(): void {
    this.selectedIndex =
      (this.selectedIndex + 1) % this.propiedad.images.length;
    this.resetZoom();
    this.reinitZoom();
  }

  goToImage(index: number): void {
    this.selectedIndex = index;
    this.resetZoom();
    this.reinitZoom();
  }

  reinitZoom(): void {
    setTimeout(() => {
      this.initZoom();
    }, 200);
  }

  zoomIn(): void {
    if (!this.zoomInstance) return;

    const img = this.getCurrentImage();
    if (img) {
      this.currentScale = Math.min(this.currentScale + 0.25, 3);
      img.style.transform = `scale(${this.currentScale})`;
      img.style.cursor = 'grab';
    }
  }

  zoomOut(): void {
    if (!this.zoomInstance) return;

    const img = this.getCurrentImage();
    if (img) {
      this.currentScale = Math.max(this.currentScale - 0.25, 1);
      img.style.transform = `scale(${this.currentScale})`;
      if (this.currentScale === 1) {
        img.style.cursor = 'zoom-in';
      }
    }
  }

  resetZoom(): void {
    const img = this.getCurrentImage();
    if (img) {
      this.currentScale = 1;
      img.style.transform = 'scale(1)';
      img.style.cursor = 'zoom-in';
    }
    if (this.zoomInstance) {
      this.zoomInstance.close();
    }
  }

  private getCurrentImage(): HTMLElement | null {
    return document.querySelector(
      `[data-zoom-src="${this.propiedad.images[this.selectedIndex]?.imageurl}"]`
    );
  }

  ngOnDestroy(): void {
    this.destroyZoom();
  }

  seleccionarTab(tab: string) {
    this.tabActivo = tab;
  }

  removeSpecialChars(text: string): string {
    if (!text) return '';

    // 1. Normaliza los caracteres para separar tildes de las letras
    text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 2. Reemplaza la ñ y Ñ por n y N
    text = text.replace(/ñ/g, 'n').replace(/Ñ/g, 'N');

    // 3. Elimina cualquier carácter que no sea letra, número o espacio
    text = text.replace(/[^a-zA-Z0-9\s]/g, '');

    // 4. Quita espacios múltiples
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }


  updateParams() {


    var pamrams = { "description": "", "city": this.removeSpecialChars(this.propiedad.city), "biz": this.propiedad.biz, "category": "" };

    var valueDescription = `${this.propiedad.type} ${this.propiedad.biz} ${this.propiedad.city} ${this.propiedad.neighborhood}`.toLowerCase();

    pamrams["description"] = this.removeSpecialChars(valueDescription).replaceAll("-", "").split(" ").join("-");

    if (this.propiedad.biz === "ARRIENDO") {
      if ((this.propiedad.rent && this.propiedad.rent > 15000000)) {
        pamrams["category"] = "DIAMANTE";
      }

      if (this.propiedad.rent && this.propiedad.rent >= 8000000 && this.propiedad.rent <= 15000000) {
        pamrams["category"] = "ORO";
      }

      if (this.propiedad.rent && this.propiedad.rent >= 2000000 && this.propiedad.rent <= 8000000) {
        pamrams["category"] = "PLATA";
      }
    }


    if (this.propiedad.biz === "VENTA") {
      if ((this.propiedad.saleprice && this.propiedad.saleprice > 2000000000)) {
        pamrams["category"] = "DIAMANTE";
      }

      if (this.propiedad.saleprice && this.propiedad.saleprice >= 1000000001 && this.propiedad.saleprice <= 2000000000) {
        pamrams["category"] = "ORO";
      }

      if (this.propiedad.saleprice && this.propiedad.saleprice >= 100000000 && this.propiedad.saleprice <= 1000000000) {
        pamrams["category"] = "PLATA";
      }
    }





    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: pamrams,
      queryParamsHandling: 'merge',
    });



  }

  convertToEmbedUrl(url: string): string {
    try {
      const videoIdMatch = url.match(
        /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/
      );
      if (videoIdMatch && videoIdMatch[1]) {
        return `https://www.youtube.com/embed/${videoIdMatch[1]}`;
      }
      return url; // Si no se puede transformar, devuelve el original
    } catch {
      return url;
    }
  }

  getDatosPropiedad() {
    this.media = [];
    this.datosCargados = false;

    this.propiedad = this.route.snapshot.data['propiedad'].data;
    if (this.propiedad.video) {
      var video = {
        "type": "video",
        "videourl": this.convertToEmbedUrl(this.propiedad.video)
      };
      this.media.push(video);
    }

    if (this.propiedad?.images && Array.isArray(this.propiedad.images)) {
      for (let data of this.propiedad.images) {
        var image = {
          "type": "image",
          "imageurl": data.imageurl,
          "thumburl": data.thumburl || data.thumbnurl
        };
        this.media.push(image);
      }
    }

    console.log(this.media);

    this.datosCargados = true;

    this.prepararFiltros();
    this.enviarFiltros();
    this.getAsesor();

    console.log(this.propiedad);
    // this.inmueblesService.getDatosPropiedad(this.codPro!).subscribe(
    //   (response: any) => {
    //     this.propiedad = response.data;

    //     this.datosCargados = true;

    //     this.prepararFiltros();
    //     this.enviarFiltros();

    //     console.log(this.propiedad);
    //   },
    //   (error: any) => {
    //     console.error('Error al obtener la propiedad:', error);
    //     this.datosCargados = true;
    //   }
    // );

    console.log(this.propiedad.images);
  }

  openModalCrearContacto(
    codPro: number,
    accion: 'telefonos' | 'whatsapp' | 'soloEnviar'
  ) {
    this.modalCrearContacto.abrirModal(codPro, accion);
  }



  openModalTelefono(
    codPro: number,
    accion: 'telefonos' | 'whatsapp' | 'soloEnviar'
  ) {
    this.modalCrearContacto.abrirModalTelefonos();
  }


  prepararFiltros() {
    this.filtrosSeleccionados.clear();
    this.filtrosSeleccionados.set('city', this.propiedad.city_code);
    if (this.propiedad.biz_code == 1) {
      this.filtrosSeleccionados.set('pcmin', this.propiedad.rent);
    }

    if (this.propiedad.biz_code == 2) {
      this.filtrosSeleccionados.set('pvmin', this.propiedad.saleprice);
    }

    if (this.propiedad.biz_code == 3) {
      this.filtrosSeleccionados.set('pcmin', this.propiedad.rent);
      this.filtrosSeleccionados.set('pvmin', this.propiedad.saleprice);
    }
  }

  enviarFiltros() {
    const filtrosObj = Object.fromEntries(this.filtrosSeleccionados);

    console.log(filtrosObj);

    const obj = { ...filtrosObj, page: 1 };

    this.inmueblesService.getFiltrosEnviar(obj, this.totalInmuebles).subscribe(
      (response: any) => {
        const idActual = this.propiedad.idpro;
        let filtrados = response.data.filter(
          (inmueble: any) => inmueble.idpro !== idActual
        );

        const faltantes = 3 - filtrados.length;
        if (faltantes > 0) {
          this.inmueblesService
            .getFiltrosEnviar(
              { ...filtrosObj, page: obj.page + 1 },
              this.elementsPerPage
            )
            .subscribe((respuestaSiguiente: any) => {
              filtrados.push(...respuestaSiguiente.data.slice(0, faltantes));
              this.resultadosFiltros = filtrados;
            });
        } else {
          this.resultadosFiltros = filtrados;
        }
      },
      (error: any) => {
        console.error('Error al enviar los filtros:', error);
      }
    );
  }

  verPropiedad(codPro: number) {
    this.router.navigate(['/ver-propiedad', codPro, 0]).then(() => {
      window.scrollTo(0, 0);
    });
  }

  enviarFiltrosMigajas(tipo: string, value: string) {
    this.filtrosSeleccionados = new Map();

    this.filtrosSeleccionados.set(tipo, String(value));

    const filtrosObj = Object.fromEntries(this.filtrosSeleccionados);

    const obj = {
      ...filtrosObj,
      sort: 'desc',
      order: 'consignation_date',
      page: 1,
    };

    console.log(obj);

    this.inmueblesService.getFiltrosEnviar(obj, this.elementsPerPage).subscribe(
      (response: any) => {
        this.router.navigate(['/filtros'], {
          state: {
            resultados: response.data,
            paginacion: response,
            filtros: obj,
          },
        });
      },
      (error: any) => {
        console.error('Error al enviar los filtros:', error);
      }
    );
  }

  selectImage(index: number) {
    this.selectedIndex = index;
  }

  prevImage() {
    if (this.selectedIndex === 0) {
      this.selectedIndex = this.propiedad.images.length - 1;
    } else {
      this.selectedIndex--;
    }
  }

  nextImage() {
    if (this.selectedIndex === this.propiedad.images.length - 1) {
      this.selectedIndex = 0;
    } else {
      this.selectedIndex++;
    }
  }

  get visibleThumbnails() {
    return (
      this.propiedad?.images?.slice(
        this.visibleThumbnailsStart,
        this.visibleThumbnailsStart + this.thumbnailsPerPage
      ) || []
    );
  }

  prevThumbs() {
    if (this.visibleThumbnailsStart > 0) {
      this.visibleThumbnailsStart -= this.thumbnailsPerPage;
    }
  }

  nextThumbs() {
    const maxStart = this.propiedad.images.length - this.thumbnailsPerPage;
    if (this.visibleThumbnailsStart < maxStart) {
      this.visibleThumbnailsStart += this.thumbnailsPerPage;
    }
  }
}
