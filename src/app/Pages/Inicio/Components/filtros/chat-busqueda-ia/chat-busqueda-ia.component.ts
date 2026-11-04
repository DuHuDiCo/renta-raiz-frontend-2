import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import {
  BusquedaIaConversacionService,
  EtiquetaFiltroIa,
  MensajeBusquedaIa,
  ResultadoBusquedaIa,
  SugerenciaIa,
} from '../../../../../core/busqueda-ia/busqueda-ia-conversacion.service';
import {
  LONGITUD_MAXIMA_CONSULTA,
  TEXTO_REVISANDO_PAGINA,
  textoLugaresNoEncontrados,
} from '../../../../../core/busqueda-ia/busqueda-ia.models';
import { AsistenteChatService } from '../../../../../core/asistente/asistente-chat.service';

/** Frases que suenan a pregunta: probablemente sobre los inmuebles de la página, que tarda más. */
const PARECE_PREGUNTA = /[¿?]|^(cu[aá]l|cu[aá]nto|qu[eé]|hay|tiene|tienen|alguno|alguna|d[oó]nde)(?=\s|$)/i;

const CLAVE_FILTROS_ABIERTOS = 'busqueda_ia_filtros_abiertos';

function leerFiltrosAbiertos(): boolean {
  try {
    return localStorage.getItem(CLAVE_FILTROS_ABIERTOS) !== 'false';
  } catch {
    return true;
  }
}

/** Si la respuesta tarda más que esto, se avisa que sigue en curso. */
const ESPERA_ANTES_DE_AVISAR_MS = 2500;
const TEXTO_ESPERA_LARGA = 'Un momento, sigo en ello…';

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
export class ChatBusquedaIaComponent implements OnChanges, AfterViewChecked, OnDestroy {
  conversacion = inject(BusquedaIaConversacionService);
  private asistente = inject(AsistenteChatService);

  /** Total de la búsqueda que muestra la página; completa la primera respuesta de la IA. */
  @Input() total: number | null = null;
  @Input() elementsPerPage = 12;
  /** Códigos de los inmuebles de la página abierta, en orden, y su número de página. */
  @Input() inmueblesVisibles: number[] = [];
  @Input() pagina = 1;

  @Output() resultado = new EventEmitter<ResultadoBusquedaIa>();
  @Output() filtrosManuales = new EventEmitter<void>();
  @Output() cerrar = new EventEmitter<void>();
  /** Inmuebles de la página que responden la última pregunta; [] para dejar de resaltarlos. */
  @Output() destacar = new EventEmitter<number[]>();

  @ViewChild('lista') lista?: ElementRef<HTMLElement>;

  readonly longitudMaxima = LONGITUD_MAXIMA_CONSULTA;
  readonly textoLugares = textoLugaresNoEncontrados;
  consulta = '';
  pensando = false;
  /** La barra de filtros activos abierta o plegada; se recuerda entre visitas. */
  filtrosAbiertos = leerFiltrosAbiertos();
  /** Texto bajo los puntos de espera cuando la respuesta tarda (revisando la página). */
  textoPensando: string | null = null;
  private avisoEspera?: ReturnType<typeof setTimeout>;
  private mensajesVistos = 0;

  ngOnChanges(): void {
    if (this.total !== null) this.conversacion.completarTotal(this.total);
  }

  ngOnDestroy(): void {
    clearTimeout(this.avisoEspera);
  }

  /** Baja al último mensaje cuando llega uno nuevo. */
  ngAfterViewChecked(): void {
    const cantidad = this.conversacion.mensajes.length + (this.pensando ? 1 : 0);
    if (cantidad !== this.mensajesVistos && this.lista) {
      this.mensajesVistos = cantidad;
      this.lista.nativeElement.scrollTop = this.lista.nativeElement.scrollHeight;
    }
  }

  get sugerencias(): SugerenciaIa[] {
    return this.conversacion.sugerencias();
  }

  /** Filtros que describen los resultados actuales; la barra de arriba los muestra siempre y deja quitarlos. */
  get filtrosActivos(): EtiquetaFiltroIa[] {
    return this.conversacion.etiquetas();
  }

  /** Las conversaciones guardadas antes decían "Busqué con:" seguido de los chips, que ahora solo están arriba. */
  textoDe(mensaje: MensajeBusquedaIa): string {
    return (mensaje.texto ?? '').replace(/ Busqué con:$/, '');
  }

  /** Filtros en una línea para la barra plegada: "Venta · Apartamento · Envigado". */
  get resumenFiltros(): string {
    return this.filtrosActivos.map((e) => e.texto).join(' · ');
  }

  alternarFiltros(): void {
    this.filtrosAbiertos = !this.filtrosAbiertos;
    try {
      localStorage.setItem(CLAVE_FILTROS_ABIERTOS, String(this.filtrosAbiertos));
    } catch {
      // Sin almacenamiento solo se recuerda mientras dure la página.
    }
  }

  /** Manda la frase al Asistente Renta Raíz; en celular cierra este chat para que se vea el del asistente. */
  preguntarAlAsistente(pregunta: string): void {
    this.asistente.preguntar(pregunta);
    if (window.matchMedia('(max-width: 767px)').matches) this.cerrar.emit();
  }

  enviar(texto = this.consulta): void {
    const consulta = texto.trim();
    if (!consulta || this.pensando) return;
    this.consulta = '';
    const paginaVisible = { inmueblesVisibles: this.inmueblesVisibles, pagina: this.pagina };
    // Las preguntas sobre la página tardan unos segundos y se avisa de una vez; lo demás, si la espera se alarga.
    const hayPagina = this.inmueblesVisibles.length > 0;
    if (hayPagina && PARECE_PREGUNTA.test(consulta)) this.textoPensando = TEXTO_REVISANDO_PAGINA;
    else this.avisoEspera = setTimeout(() => (this.textoPensando = TEXTO_ESPERA_LARGA), ESPERA_ANTES_DE_AVISAR_MS);
    this.ejecutar(this.conversacion.refinar(consulta, this.elementsPerPage, paginaVisible), true);
  }

  usarSugerencia(sugerencia: SugerenciaIa): void {
    if (sugerencia.quitar) this.quitar(sugerencia.quitar);
    else if (sugerencia.consulta) this.enviar(sugerencia.consulta);
  }

  quitar(claves: EtiquetaFiltroIa['claves']): void {
    if (this.pensando) return;
    this.ejecutar(this.conversacion.quitar(claves, this.elementsPerPage));
  }

  private ejecutar(peticion: Observable<ResultadoBusquedaIa | null>, puedeDestacar = false): void {
    this.pensando = true;
    // finalize libera el campo aunque la petición falle o pintar los resultados lance un error.
    peticion
      .pipe(
        finalize(() => {
          this.pensando = false;
          this.textoPensando = null;
          clearTimeout(this.avisoEspera);
        })
      )
      .subscribe({
      next: (resultado) => {
        if (resultado) this.resultado.emit(resultado);
        else if (puedeDestacar) this.destacar.emit(this.conversacion.destacadosRecientes());
      },
      error: () => {},
    });
    this.registrar();
  }

  /** Evento para Google Tag Manager. */
  private registrar(): void {
    const capa = ((window as any).dataLayer = (window as any).dataLayer || []);
    capa.push({ event: 'busqueda_ia_refinar' });
  }
}
