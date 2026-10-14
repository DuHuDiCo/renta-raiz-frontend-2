import { DOCUMENT, isPlatformBrowser, NgClass } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AsistenteChatService } from '../../core/asistente/asistente-chat.service';
import {
  AsistenteMensajeRequest,
  AsistenteMensajeResponse,
  InmuebleChat,
  LONGITUD_MAXIMA_MENSAJE,
  MensajeChat,
} from '../../core/asistente/asistente.models';
import { RutaFichaPipe } from '../pipes/ruta-ficha.pipe';

const NOMBRE_ASISTENTE = 'Asistente Renta Raíz';
/** Línea general de WhatsApp (la misma del botón flotante); respaldo cuando el asistente falla. */
const WHATSAPP_GENERAL = '573145438665';
/** Pausa entre globos cuando la respuesta trae varios, para que se lean como una conversación. */
const PAUSA_ENTRE_GLOBOS_MS = 650;
const ESPERA_INVITACION_MS = 12000;
const CLAVE_INVITACION_VISTA = 'asistente_invitacion_vista';
/** Rutas donde el botón flotante de WhatsApp ocupa el sitio encima de "Volver arriba". */
const RUTAS_CON_WHATSAPP_FLOTANTE = ['/prioritarios'];
/** Clase en <body> mientras el panel está abierto; el popup de Recorrido la usa para correrse a la izquierda. */
const CLASE_ASISTENTE_ABIERTO = 'asistente-abierto';

const SUGERENCIAS_INICIO = [
  'Requisitos para arrendar',
  '¿Cómo pago el canon?',
  'Quiero publicar mi inmueble',
  'Horarios de atención',
];
const SUGERENCIAS_PROPIEDAD = ['¿Qué requisitos piden?', '¿Qué incluye el canon?', '¿Cómo agendo una visita?'];

/**
 * Chat de servicio al cliente (solo preguntas y respuestas). Vive en la raíz de la app para que
 * la conversación siga al navegar, y se carga con @defer, así que nunca se renderiza en el servidor.
 */
@Component({
  selector: 'app-asistente-chat',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, RouterLink, RutaFichaPipe],
  templateUrl: './asistente-chat.component.html',
  styleUrl: './asistente-chat.component.scss',
})
export class AsistenteChatComponent implements OnInit, OnDestroy {
  private asistente = inject(AsistenteChatService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private documento = inject(DOCUMENT);

  @ViewChild('listaMensajes') listaMensajes?: ElementRef<HTMLElement>;
  @ViewChild('campoTexto') campoTexto?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('botonAbrir') botonAbrir?: ElementRef<HTMLButtonElement>;

  readonly nombreAsistente = NOMBRE_ASISTENTE;
  readonly longitudMaxima = LONGITUD_MAXIMA_MENSAJE;
  readonly whatsappRespaldo = `https://wa.me/${WHATSAPP_GENERAL}?text=${encodeURIComponent(
    'Hola, tengo una pregunta'
  )}`;

  abierto = false;
  esperando = false;
  mostrarInvitacion = false;
  noLeidos = 0;
  mensajes: MensajeChat[] = [];
  sugerencias: string[] = [];
  /** El visitante puede plegar las preguntas sugeridas; se queda así hasta que las vuelva a abrir. */
  sugerenciasAbiertas = true;
  /** Separación del botón respecto al borde inferior, para no tapar los botones flotantes. */
  margenInferior = 92;

  texto = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(LONGITUD_MAXIMA_MENSAJE)] });

  private sesionId = '';
  private ultimaPeticion?: AsistenteMensajeRequest;
  private temporizadores: ReturnType<typeof setTimeout>[] = [];
  private suscripciones = new Subscription();

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const conversacion = this.asistente.cargarConversacion();
    this.sesionId = conversacion.sesionId;
    this.mensajes = conversacion.mensajes;

    this.actualizarMargen(this.router.url);
    this.suscripciones.add(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe((e) => this.actualizarMargen(e.urlAfterRedirects))
    );

    if (!this.invitacionYaVista() && this.mensajes.length === 0) {
      this.programar(() => {
        if (!this.abierto) this.mostrarInvitacion = true;
      }, ESPERA_INVITACION_MS);
    }
  }

  ngOnDestroy(): void {
    this.documento.body.classList.remove(CLASE_ASISTENTE_ABIERTO);
    this.temporizadores.forEach(clearTimeout);
    this.suscripciones.unsubscribe();
  }

  @HostListener('document:keydown.escape')
  alPresionarEscape(): void {
    if (this.abierto) this.cerrar();
  }

  abrir(): void {
    this.abierto = true;
    this.documento.body.classList.add(CLASE_ASISTENTE_ABIERTO);
    this.noLeidos = 0;
    this.descartarInvitacion();
    if (this.mensajes.length === 0) this.saludar();
    this.asistente.registrarEvento('asistente_abierto', { pagina: this.asistente.contextoActual().pagina });
    this.programar(() => {
      this.bajarAlFinal();
      this.campoTexto?.nativeElement.focus();
    }, 50);
  }

  cerrar(): void {
    this.abierto = false;
    this.documento.body.classList.remove(CLASE_ASISTENTE_ABIERTO);
    this.programar(() => this.botonAbrir?.nativeElement.focus(), 50);
  }

  descartarInvitacion(): void {
    this.mostrarInvitacion = false;
    try {
      sessionStorage.setItem(CLAVE_INVITACION_VISTA, '1');
    } catch {
      // Sin almacenamiento la invitación puede volver a salir en otra página; no es grave.
    }
  }

  nuevaConversacion(): void {
    this.temporizadores.forEach(clearTimeout);
    this.temporizadores = [];
    this.asistente.borrarConversacion();
    this.sesionId = this.asistente.nuevoId();
    this.mensajes = [];
    this.esperando = false;
    this.ultimaPeticion = undefined;
    this.saludar();
    this.asistente.registrarEvento('asistente_nueva_conversacion');
  }

  /** Enter envía; Shift+Enter hace salto de línea. */
  alTeclear(evento: KeyboardEvent): void {
    if (evento.key === 'Enter' && !evento.shiftKey && !evento.isComposing) {
      evento.preventDefault();
      this.enviarTexto();
    }
  }

  ajustarAltura(): void {
    const campo = this.campoTexto?.nativeElement;
    if (!campo) return;
    campo.style.height = 'auto';
    campo.style.height = `${Math.min(campo.scrollHeight, 120)}px`;
  }

  enviarTexto(): void {
    const texto = this.texto.value.trim();
    if (!texto || this.esperando || this.texto.invalid) return;
    this.texto.setValue('');
    this.programar(() => this.ajustarAltura(), 0);
    this.enviar(texto, 'texto');
  }

  alternarSugerencias(): void {
    this.sugerenciasAbiertas = !this.sugerenciasAbiertas;
  }

  elegirSugerencia(sugerencia: string): void {
    if (this.esperando) return;
    this.enviar(sugerencia, 'sugerencia');
  }

  reintentar(): void {
    if (!this.ultimaPeticion || this.esperando) return;
    this.mensajes = this.mensajes.filter((m) => !m.error);
    this.solicitar(this.ultimaPeticion);
  }

  alContactarWhatsapp(): void {
    this.asistente.registrarEvento('asistente_whatsapp_click');
  }

  /** Precio de la tarjeta: el canon si está en arriendo y, si no, el precio de venta. */
  precioDe(inmueble: InmuebleChat): string {
    const [etiqueta, valor] = inmueble.rent > 0 ? ['Arriendo', inmueble.rent] : ['Venta', inmueble.saleprice];
    return valor > 0 ? `${etiqueta} $${Math.round(valor).toLocaleString('es-CO')}` : '';
  }

  alAbrirInmueble(inmueble: InmuebleChat): void {
    this.asistente.registrarEvento('asistente_inmueble_click', { codpro: inmueble.codpro });
    // En móvil el chat ocupa toda la pantalla: se cierra para que se vea la ficha.
    if (window.matchMedia('(max-width: 767px)').matches) this.cerrar();
  }

  private enviar(texto: string, origen: AsistenteMensajeRequest['origen']): void {
    this.sugerencias = [];
    this.agregar({ autor: 'usuario', texto });

    const peticion: AsistenteMensajeRequest = {
      sesionId: this.sesionId,
      mensaje: texto.slice(0, LONGITUD_MAXIMA_MENSAJE),
      origen,
      contexto: this.asistente.contextoActual(),
    };
    this.asistente.registrarEvento('asistente_mensaje_enviado', { origen, pagina: peticion.contexto.pagina });
    this.solicitar(peticion);
  }

  private solicitar(peticion: AsistenteMensajeRequest): void {
    this.ultimaPeticion = peticion;
    this.esperando = true;
    this.bajarAlFinal();

    this.asistente.enviar(peticion).subscribe({
      next: (respuesta) => this.mostrarRespuesta(respuesta),
      error: () => {
        this.esperando = false;
        this.agregar(
          {
            autor: 'sistema',
            texto: 'No pude responderte en este momento. Puedes intentarlo de nuevo o escribirnos por WhatsApp.',
            error: true,
          },
          false
        );
        this.asistente.registrarEvento('asistente_error');
      },
    });
  }

  /** Muestra los globos uno a uno, con el indicador de "escribiendo" entre ellos. */
  private mostrarRespuesta(respuesta: AsistenteMensajeResponse): void {
    const globos = (respuesta.mensajes ?? []).filter((m) => m?.trim());
    if (globos.length === 0) globos.push('¿Me lo explicas de otra forma?');

    const inmuebles = respuesta.inmuebles?.length ? respuesta.inmuebles : undefined;

    globos.forEach((texto, i) => {
      this.programar(() => {
        const ultimo = i === globos.length - 1;
        // Las tarjetas van con el último globo, después del texto que las presenta.
        this.agregar({ autor: 'asistente', texto, ...(ultimo && inmuebles ? { inmuebles } : {}) });
        if (!ultimo) return;

        this.esperando = false;
        this.sugerencias = respuesta.sugerencias ?? [];
        if (!this.abierto) this.noLeidos += globos.length;
      }, i * PAUSA_ENTRE_GLOBOS_MS);
    });
  }

  private saludar(): void {
    const enFicha = this.asistente.contextoActual().pagina === 'propiedad';
    this.agregar({
      autor: 'asistente',
      texto: enFicha
        ? '¡Hola! 👋 Soy el asistente virtual de Renta Raíz. ¿Tienes alguna pregunta sobre este inmueble?'
        : '¡Hola! 👋 Soy el asistente virtual de Renta Raíz. Resuelvo tus dudas sobre arriendos, ventas, pagos y nuestros servicios.',
    });
    this.sugerencias = enFicha ? SUGERENCIAS_PROPIEDAD : SUGERENCIAS_INICIO;
  }

  private agregar(mensaje: Omit<MensajeChat, 'id' | 'fecha'>, guardar = true): void {
    this.mensajes = [...this.mensajes, { ...mensaje, id: this.asistente.nuevoId(), fecha: Date.now() }];
    if (guardar) this.asistente.guardarConversacion(this.sesionId, this.mensajes);
    this.bajarAlFinal();
  }

  private bajarAlFinal(): void {
    this.programar(() => {
      const lista = this.listaMensajes?.nativeElement;
      if (lista) lista.scrollTo({ top: lista.scrollHeight, behavior: 'smooth' });
    }, 0);
  }

  private actualizarMargen(url: string): void {
    const ruta = url.split('?')[0];
    this.margenInferior = RUTAS_CON_WHATSAPP_FLOTANTE.includes(ruta) ? 160 : 92;
  }

  private invitacionYaVista(): boolean {
    try {
      return sessionStorage.getItem(CLAVE_INVITACION_VISTA) === '1';
    } catch {
      return false;
    }
  }

  private programar(accion: () => void, ms: number): void {
    const id = setTimeout(() => {
      this.temporizadores = this.temporizadores.filter((t) => t !== id);
      accion();
    }, ms);
    this.temporizadores.push(id);
  }
}
