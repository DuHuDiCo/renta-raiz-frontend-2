import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { environment } from '../../../environments/environment';
import { FormularioRecorridoComponent } from '../formulario-recorrido/formulario-recorrido.component';
import { DomSanitizer } from '@angular/platform-browser';
import { WishlistServiceService } from '../../core/wishlist/wishlist-service.service';

@Component({
  selector: 'app-modal-wishlist',
  standalone: true,
  imports: [CommonModule, FormularioRecorridoComponent],
  templateUrl: './modal-wishlist.component.html',
  styleUrl: './modal-wishlist.component.scss'
})
export class ModalWishlistComponent implements OnInit, OnChanges {
  // ... tus variables



  visible: boolean = false;
  /** Formulario propio de disponibilidad; sin él se muestra el widget de LeadConnector. */
  readonly recorridoPropio = environment.recorridoPropio;
  sanitizer = inject(DomSanitizer);
  iframeId = '1WJfiMGJcT4VpcFo1G8h_1763138081735';
  iframeTitle = '';
  urlIframe = "https://api.leadconnectorhq.com/widget/bookings/agenda-recorridos"
  iframeSrc: any = "";
  iframeHeight = 600;

  @Input() mostrarModalRecorrido = false

  @Output() cerrar = new EventEmitter<void>();


  favService = inject(WishlistServiceService);



  ngOnChanges(changes: SimpleChanges): void {
    // Si mostrarModalRecorrido cambia de false a true, regeneramos la URL
    if (changes['mostrarModalRecorrido']?.currentValue === true) {
      this.generarUrlIframe();
    }
  }

  generarUrlIframe(): void {
    const recorrido = this.favService.cargarFavoritos();
    const listaStrings = recorrido.map((item: any) => `${item.codpro}`);
    const cadenaPlana = listaStrings.join(',');

    // 1. Construir la URL completa como un string normal
    const urlCompleta = `${this.urlIframe}?historial_web_recorrido=${encodeURIComponent(cadenaPlana)}`;

    // 2. LOG para verificar (debe verse igual a la que pegas en el navegador)
    console.log("URL a cargar:", urlCompleta);

    // 3. Validar con el sanitizer la URL COMPLETA
    // Esto elimina el error NG0904
    this.iframeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(urlCompleta);
  }
  ngOnInit(): void {
    this.generarUrlIframe();
  }


  @HostListener('document:keydown.escape')
  alPresionarEscape() {
    if (this.mostrarModalRecorrido) this.cerrarModal();
  }

  cerrarModal() {
    this.cerrar.emit();
    

  }

}
