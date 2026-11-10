import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { codigoDeFicha } from '../listados/listados';
import { busquedasSimilares } from '../similares/similares';
import { WishlistServiceService } from '../wishlist/wishlist-service.service';
import {
  AsistenteMensajeRequest,
  AsistenteMensajeResponse,
  BusquedaAsistente,
  LONGITUD_MAXIMA_MENSAJE,
  MAXIMO_EN_FOCO,
  MAXIMO_RECORRIDO_ASISTENTE,
  MAXIMO_VISIBLES_ASISTENTE,
  ContextoAsistente,
  ListadoVisibleAsistente,
  MensajeChat,
  PaginaAsistente,
} from './asistente.models';
import { responderSimulado } from './asistente-chat.mock';
import { InmueblesEnPantallaService } from './inmuebles-en-pantalla.service';

const CLAVE_CONVERSACION = 'asistente_conversacion';
/** Pasado este tiempo sin escribir, el chat arranca una conversación nueva. */
const VIGENCIA_CONVERSACION_MS = 24 * 60 * 60 * 1000;
/** Solo se guardan en el navegador los últimos mensajes; el historial completo lo tiene el backend. */
const MAXIMO_MENSAJES_GUARDADOS = 60;
const TIEMPO_MAXIMO_RESPUESTA_MS = 30000;

const PARAMETROS_CAMPANA = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
const PARAMETROS_NO_FILTRO = [...PARAMETROS_CAMPANA, 'utm_id', 'fbclid'];

/** Prefijos de ruta de los listados con URL propia (/arriendo/apartamentos/medellin). */
const PREFIJOS_LISTADO = ['arriendo', 'venta', 'filtros'];

interface ConversacionGuardada {
  sesionId: string;
  mensajes: MensajeChat[];
  actualizado: number;
}

/**
 * Habla con el backend del asistente y guarda la conversación en el navegador para que siga
 * al cambiar de página o recargar. Todo lo que toca localStorage o window está protegido para
 * no romper el renderizado en el servidor.
 */
@Injectable({ providedIn: 'root' })
export class AsistenteChatService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private favoritos = inject(WishlistServiceService);
  private enPantalla = inject(InmueblesEnPantallaService);

  /** Inmuebles de los que habló el asistente en su última respuesta; viajan en `contexto.enFoco`. */
  private foco: number[] = [];

  /** El chat lo actualiza con cada respuesta, al cargar el historial y al empezar una conversación nueva. */
  establecerFoco(codigos: readonly unknown[] | null | undefined): void {
    const validos = (codigos ?? []).map(Number).filter((c) => Number.isInteger(c) && c > 0);
    this.foco = [...new Set(validos)].slice(0, MAXIMO_EN_FOCO);
  }

  /**
   * Foco recuperado del historial al cargar el chat. El chat carga tarde (@defer): si mientras tanto otra parte
   * del sitio ya fijó un foco más reciente (la búsqueda con IA), ese gana.
   */
  restaurarFoco(codigos: readonly unknown[] | null | undefined): void {
    if (!this.foco.length) this.establecerFoco(codigos);
  }

  /** Pregunta mandada desde otra parte del sitio que el chat aún no ha enviado (puede no haber cargado). */
  private preguntaPendiente: string | null = null;
  private avisoPregunta = new Subject<void>();
  /** El chat lo escucha para abrirse y enviar `tomarPreguntaPendiente()`. */
  readonly preguntaRecibida$ = this.avisoPregunta.asObservable();

  private get enNavegador(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  /** Abre el chat y le envía el texto como si el visitante lo hubiera escrito (p. ej. desde la búsqueda con IA). */
  preguntar(texto: string): void {
    this.preguntaPendiente = texto.trim().slice(0, LONGITUD_MAXIMA_MENSAJE);
    this.avisoPregunta.next();
  }

  /**
   * La página de resultados registra cómo leer lo que muestra; se consulta en cada mensaje para que el
   * asistente tenga siempre los filtros y la página actuales. Devuelve la función para quitar el registro.
   */
  registrarListado(leer: () => ListadoVisibleAsistente): () => void {
    this.leerListado = leer;
    return () => {
      if (this.leerListado === leer) this.leerListado = null;
    };
  }
  private leerListado: (() => ListadoVisibleAsistente) | null = null;

  /**
   * La ficha registra cómo leer el inmueble que muestra (el objeto de Domus, con city_code y type_code).
   * Con él se arma "Ver todos en el listado" cuando el asistente muestra parecidos sin decir qué búsqueda usó.
   * Devuelve la función para quitar el registro.
   */
  registrarFicha(leer: () => any): () => void {
    this.leerFicha = leer;
    return () => {
      if (this.leerFicha === leer) this.leerFicha = null;
    };
  }
  private leerFicha: (() => any) | null = null;

  /**
   * Búsqueda de inmuebles parecidos al de la ficha abierta: misma ciudad, negocio y tipo, y precio ±50 %
   * (la más amplia de las de "Inmuebles similares" que aún filtra por precio). null fuera de una ficha.
   */
  busquedaParecidosFicha(): BusquedaAsistente | null {
    const inmueble = this.leerFicha?.();
    const busquedas = busquedasSimilares(inmueble);
    if (!busquedas.length) return null;
    const conPrecio = busquedas.filter((b) => 'pcmin' in b || 'pvmin' in b);
    const elegida = conPrecio[conPrecio.length - 1] ?? busquedas[0];

    const filtros = Object.fromEntries(Object.entries(elegida).map(([clave, valor]) => [clave, String(valor)]));
    const etiquetas: Record<string, string> = { biz: filtros['biz'] === '2' ? 'Venta' : 'Arriendo' };
    if (filtros['type'] && inmueble.type) etiquetas['type'] = capitalizar(inmueble.type);
    if (inmueble.city) etiquetas['city'] = capitalizar(inmueble.city);
    return { filtros, etiquetas };
  }

  tomarPreguntaPendiente(): string | null {
    const pregunta = this.preguntaPendiente;
    this.preguntaPendiente = null;
    return pregunta;
  }

  enviar(peticion: AsistenteMensajeRequest): Observable<AsistenteMensajeResponse> {
    if (environment.asistenteMock) {
      return responderSimulado(peticion);
    }
    return this.http
      .post<AsistenteMensajeResponse>(`${environment.baseUrl}/asistente/mensajes`, peticion)
      .pipe(timeout(TIEMPO_MAXIMO_RESPUESTA_MS));
  }

  /** Qué está viendo el usuario ahora mismo, a partir de la URL actual. */
  contextoActual(): ContextoAsistente {
    const arbol = this.router.parseUrl(this.router.url);
    const segmentos = arbol.root.children['primary']?.segments.map((s) => s.path) ?? [];
    const ruta = '/' + segmentos.join('/');

    const contexto: ContextoAsistente = {
      ruta,
      pagina: this.paginaDe(segmentos),
      titulo: this.enNavegador ? document.title : '',
    };

    if (contexto.pagina === 'propiedad') {
      const codpro = segmentos[0] === 'inmueble' ? codigoDeFicha(segmentos[1] ?? '') : Number(segmentos[1]);
      if (Number.isFinite(codpro) && codpro > 0) contexto.codpro = codpro;
    }

    if (contexto.pagina === 'listado') {
      const filtros: Record<string, string> = {};
      for (const [clave, valor] of Object.entries(arbol.queryParams)) {
        if (!PARAMETROS_NO_FILTRO.includes(clave) && valor != null && valor !== '') filtros[clave] = String(valor);
      }
      if (Object.keys(filtros).length) contexto.filtros = filtros;

      const listado = this.leerListado?.();
      if (listado) {
        if (Object.keys(listado.filtros).length) contexto.filtros = listado.filtros;
        contexto.inmueblesVisibles = listado.inmueblesVisibles;
        contexto.numeroPagina = listado.numeroPagina;
      }
    }

    // En las demás páginas, los inmuebles en pantalla salen de las tarjetas (destacados, portafolio, similares…).
    if (!contexto.inmueblesVisibles?.length) {
      const visibles = this.enPantalla.codigos(MAXIMO_VISIBLES_ASISTENTE);
      if (visibles.length) contexto.inmueblesVisibles = visibles;
    }

    const recorrido = this.codigosRecorrido();
    if (recorrido.length) contexto.recorrido = recorrido;

    if (this.foco.length) contexto.enFoco = [...this.foco];

    const utm: ContextoAsistente['utm'] = {};
    for (const clave of PARAMETROS_CAMPANA) {
      const valor = this.leer(clave);
      if (valor) utm[clave] = valor;
    }
    if (Object.keys(utm).length) contexto.utm = utm;

    return contexto;
  }

  /** Códigos de "Mi recorrido": válidos, sin repetir, en el orden en que se agregaron y como máximo 20. */
  codigosRecorrido(): number[] {
    if (!this.enNavegador) return [];
    let favoritos: any[] = [];
    try {
      favoritos = this.favoritos.cargarFavoritos() as any[];
    } catch {
      return []; // Favoritos dañados en localStorage: el chat sigue sin ellos.
    }
    const codigos: number[] = [];
    for (const favorito of Array.isArray(favoritos) ? favoritos : []) {
      const codigo = Number(favorito?.codpro);
      if (Number.isInteger(codigo) && codigo > 0 && !codigos.includes(codigo)) codigos.push(codigo);
      if (codigos.length === MAXIMO_RECORRIDO_ASISTENTE) break;
    }
    return codigos;
  }

  private paginaDe(segmentos: string[]): PaginaAsistente {
    const primero = segmentos[0] ?? '';
    if (!primero) return 'inicio';
    if (primero === 'inmueble' || primero === 'ver-propiedad') return 'propiedad';
    if (PREFIJOS_LISTADO.includes(primero)) return 'listado';
    if (primero === 'blogs' || primero === 'ver-blog') return 'blog';
    if (primero === 'contacto') return 'contacto';
    if (primero === 'publicar-inmueble') return 'publicar-inmueble';
    if (primero === 'avaluos-comerciales') return 'avaluos';
    if (primero === 'quienes-somos' || primero === 'nuestro-equipo') return 'nosotros';
    return 'otra';
  }

  /** Conversación guardada, o una nueva si no hay o ya venció. */
  cargarConversacion(): ConversacionGuardada {
    try {
      const guardada = JSON.parse(this.leer(CLAVE_CONVERSACION) || 'null') as ConversacionGuardada | null;
      if (guardada?.sesionId && Date.now() - guardada.actualizado < VIGENCIA_CONVERSACION_MS) {
        return { ...guardada, mensajes: guardada.mensajes ?? [] };
      }
    } catch {
      // JSON dañado: se empieza de cero.
    }
    return { sesionId: this.nuevoId(), mensajes: [], actualizado: Date.now() };
  }

  guardarConversacion(sesionId: string, mensajes: MensajeChat[]): void {
    const conversacion: ConversacionGuardada = {
      sesionId,
      mensajes: mensajes.filter((m) => !m.error).slice(-MAXIMO_MENSAJES_GUARDADOS),
      actualizado: Date.now(),
    };
    this.escribir(CLAVE_CONVERSACION, JSON.stringify(conversacion));
  }

  borrarConversacion(): void {
    if (!this.enNavegador) return;
    try {
      localStorage.removeItem(CLAVE_CONVERSACION);
    } catch {
      // Almacenamiento bloqueado: no hay nada que borrar.
    }
  }

  /** Evento para Google Tag Manager. */
  registrarEvento(evento: string, datos: Record<string, unknown> = {}): void {
    if (!this.enNavegador) return;
    const capa = ((window as any).dataLayer = (window as any).dataLayer || []);
    capa.push({ event: evento, ...datos });
  }

  nuevoId(): string {
    if (this.enNavegador && typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  private leer(clave: string): string | null {
    if (!this.enNavegador) return null;
    try {
      return localStorage.getItem(clave);
    } catch {
      return null;
    }
  }

  private escribir(clave: string, valor: string): void {
    if (!this.enNavegador) return;
    try {
      localStorage.setItem(clave, valor);
    } catch {
      // Navegación privada o cuota llena: el chat sigue funcionando sin persistencia.
    }
  }
}

/** "CASA CAMPESTRE" → "Casa campestre". */
function capitalizar(texto: string): string {
  const limpio = String(texto ?? '').trim().toLowerCase();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}
