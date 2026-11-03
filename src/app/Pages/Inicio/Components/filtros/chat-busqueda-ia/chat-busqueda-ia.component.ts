import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import {
  BusquedaIaConversacionService,
  EtiquetaFiltroIa,
  ResultadoBusquedaIa,
  SugerenciaIa,
} from '../../../../../core/busqueda-ia/busqueda-ia-conversacion.service';
import { LONGITUD_MAXIMA_CONSULTA } from '../../../../../core/busqueda-ia/busqueda-ia.models';

/**
 * Chat de la búsqueda con IA en la página de resultados: muestra la conversación, los filtros que la IA
 * entendió y deja seguir refinando. Cada cambio emite los nuevos resultados para que la página los pinte.
 */
@Component({
  selector: 'app-chat-busqueda-ia',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './chat-busqueda-ia.component.html',
})
export class ChatBusquedaIaComponent implements OnChanges, AfterViewChecked {
  conversacion = inject(BusquedaIaConversacionService);

  /** Total de la búsqueda que muestra la página; completa la primera respuesta de la IA. */
  @Input() total: number | null = null;
  @Input() elementsPerPage = 12;

  @Output() resultado = new EventEmitter<ResultadoBusquedaIa>();
  @Output() filtrosManuales = new EventEmitter<void>();
  @Output() cerrar = new EventEmitter<void>();

  @ViewChild('lista') lista?: ElementRef<HTMLElement>;

  readonly longitudMaxima = LONGITUD_MAXIMA_CONSULTA;
  consulta = '';
  pensando = false;
  private mensajesVistos = 0;

  ngOnChanges(): void {
    if (this.total !== null) this.conversacion.completarTotal(this.total);
  }

  /** Baja al último mensaje cuando llega uno nuevo. */
  ngAfterViewChecked(): void {
    const cantidad = this.conversacion.mensajes.length + (this.pensando ? 1 : 0);
    if (cantidad !== this.mensajesVistos && this.lista) {
      this.mensajesVistos = cantidad;
      this.lista.nativeElement.scrollTop = this.lista.nativeElement.scrollHeight;
    }
  }

  get etiquetas(): EtiquetaFiltroIa[] {
    return this.conversacion.etiquetas();
  }

  get sugerencias(): SugerenciaIa[] {
    return this.conversacion.sugerencias();
  }

  /** Las etiquetas se pintan solo en la última respuesta, que es la que describe la búsqueda actual. */
  get indiceUltimaRespuesta(): number {
    const mensajes = this.conversacion.mensajes;
    for (let i = mensajes.length - 1; i >= 0; i--) if (mensajes[i].rol === 'ia') return i;
    return -1;
  }

  enviar(texto = this.consulta): void {
    const consulta = texto.trim();
    if (!consulta || this.pensando) return;
    this.consulta = '';
    this.ejecutar(this.conversacion.refinar(consulta, this.elementsPerPage));
  }

  usarSugerencia(sugerencia: SugerenciaIa): void {
    if (sugerencia.quitar) this.quitar(sugerencia.quitar);
    else if (sugerencia.consulta) this.enviar(sugerencia.consulta);
  }

  quitar(claves: EtiquetaFiltroIa['claves']): void {
    if (this.pensando) return;
    this.ejecutar(this.conversacion.quitar(claves, this.elementsPerPage));
  }

  private ejecutar(peticion: Observable<ResultadoBusquedaIa | null>): void {
    this.pensando = true;
    peticion.subscribe({
      next: (resultado) => {
        if (resultado) this.resultado.emit(resultado);
      },
      complete: () => (this.pensando = false),
      error: () => (this.pensando = false),
    });
    this.registrar();
  }

  /** Evento para Google Tag Manager. */
  private registrar(): void {
    const capa = ((window as any).dataLayer = (window as any).dataLayer || []);
    capa.push({ event: 'busqueda_ia_refinar' });
  }
}
