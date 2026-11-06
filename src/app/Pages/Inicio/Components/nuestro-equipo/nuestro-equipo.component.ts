import { afterNextRender, Component, inject, NgZone, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { InmueblesService } from '../../../../core/Inmuebles/inmuebles.service';
import { NavbarComponent } from "../../../../shared/navbar/navbar.component";
import { BotonesFlotantesComponent } from "../../../../shared/botones-flotantes/botones-flotantes.component";
import { FooterComponent } from "../../../../shared/footer/footer.component";
import { VolverComponent } from "../../../../shared/volver/volver.component";
import { BarraFiltrosComponent } from "../../../../shared/barra-filtros/barra-filtros.component";
import { Router, RouterLink } from '@angular/router';
import { OffcanvasWishlistComponent } from '../offcanvas-wishlist/offcanvas-wishlist.component';
import { ModalWishlistComponent } from '../../../../shared/modal-wishlist/modal-wishlist.component';
import { WishlistServiceService } from '../../../../core/wishlist/wishlist-service.service';
import { DataasesoresService } from '../../../../core/dataAsesores/dataasesores.service';
import { SEO_DOMINIO } from '../../../../core/seo/seo.service';
import { CompartirInmuebleComponent } from '../../../../shared/compartir-inmueble/compartir-inmueble.component';


@Component({
  selector: 'app-nuestro-equipo',
  standalone: true,
  imports: [RouterLink, NavbarComponent, FooterComponent, BotonesFlotantesComponent, VolverComponent, BarraFiltrosComponent, OffcanvasWishlistComponent, ModalWishlistComponent, CompartirInmuebleComponent],
  templateUrl: './nuestro-equipo.component.html',
  styleUrl: './nuestro-equipo.component.scss'
})
export class NuestroEquipoComponent implements OnInit {

  equipo = inject(DataasesoresService).getEquipo();
  private inmuebles = inject(InmueblesService);

  /** Inmuebles publicados por asesor (venta y arriendo), los mismos totales del portafolio. Se piden en el navegador. */
  totales: Record<number, { venta: number | null; arriendo: number | null }> = {};

  private zona = inject(NgZone);
  // afterNextRender corre fuera de la zona de Angular: sin zone.run la pantalla no se enteraría de los totales.
  private cargarTotales = afterNextRender(() => this.zona.run(() => {
    const total = (broker: number, biz: number) =>
      this.inmuebles.getFiltrosEnviar({ broker, biz, page: 1 }, 1).pipe(
        map((respuesta: any) => Number(respuesta?.total) || 0),
        catchError(() => of(null))
      );
    for (const asesor of this.equipo) {
      forkJoin({ venta: total(asesor.id, 2), arriendo: total(asesor.id, 1) }).subscribe(
        (cuenta) => (this.totales = { ...this.totales, [asesor.id]: cuenta })
      );
    }
  }));

  /** "350 223 9363" → "573502239363", el formato que piden WhatsApp y tel:. */
  private telefonoInternacional(asesor: any): string {
    const digitos = String(asesor.telefono || '').replace(/\D/g, '');
    return digitos.startsWith('57') && digitos.length > 10 ? digitos : `57${digitos}`;
  }

  enlaceWhatsapp(asesor: any): string {
    const nombre = String(asesor.nombre || '').split(' ')[0];
    const texto = `Hola ${nombre}, vi tu perfil en Renta Raíz y quiero información sobre un inmueble.`;
    return `https://wa.me/${this.telefonoInternacional(asesor)}?text=${encodeURIComponent(texto)}`;
  }

  enlaceLlamada(asesor: any): string {
    return `tel:+${this.telefonoInternacional(asesor)}`;
  }

  /** Evento para Google Tag Manager. */
  registrarContacto(medio: string, asesor: any): void {
    const capa = ((window as any).dataLayer = (window as any).dataLayer || []);
    capa.push({ event: 'contacto_asesor', medio, asesor: asesor.slug });
  }

  mostrarModalRecorrido = false

  mostrarOffcanvas: boolean = false;
  minimizarOffcanvas: boolean = true;

  favService = inject(WishlistServiceService);

  router = inject(Router);


  urlPerfil(asesor: any): string {
    return `${SEO_DOMINIO}/asesor/${asesor.slug}`;
  }

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


}
