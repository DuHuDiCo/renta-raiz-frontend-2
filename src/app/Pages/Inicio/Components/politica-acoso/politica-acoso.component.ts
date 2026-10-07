import { Component, OnInit, NgModule, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { OffcanvasWishlistComponent } from '../offcanvas-wishlist/offcanvas-wishlist.component';
import { ModalWishlistComponent } from '../../../../shared/modal-wishlist/modal-wishlist.component';
import { BotonesFlotantesComponent } from '../../../../shared/botones-flotantes/botones-flotantes.component';
import { WishlistServiceService } from '../../../../core/wishlist/wishlist-service.service';

@Component({
  selector: 'app-politica-acoso',
  standalone: true,
  imports: [
    CommonModule,
    OffcanvasWishlistComponent,
    ModalWishlistComponent,
    BotonesFlotantesComponent // 👈 Necesario para *ngIf, *ngFor, etc.
  ],
  templateUrl: './politica-acoso.component.html',
  styleUrl: './politica-acoso.component.scss'
})
export class PoliticaAcosoComponent implements OnInit {
  safeUrl!: SafeResourceUrl;
  isSafariOrIOS = false;

  pdfUrl = '/assets/images/POLITICA_ACOSO_SEXUAL.pdf';
  isIOS = false;


  mostrarModalRecorrido = false

  mostrarOffcanvas: boolean = false;
  minimizarOffcanvas: boolean = true;

  favService = inject(WishlistServiceService);



  constructor(private sanitizer: DomSanitizer) { }
  ngOnInit(): void {
    this.isSafariOrIOS = this.detectSafariOrIOS();
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfUrl);
    if (this.isSafariOrIOS) {
      // En iOS/Safari abrir el PDF directamente
      this.openPdfExternally();
    }
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

  private detectSafariOrIOS(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    return isIOS || isSafari;
  }


  private openPdfExternally(): void {
    // Abre el PDF en una nueva pestaña para que iOS/Safari lo maneje nativamente
    window.open(this.pdfUrl, '_blank');
  }
}
