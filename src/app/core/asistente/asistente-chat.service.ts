import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { codigoDeFicha } from '../listados/listados';
import {
  AsistenteMensajeRequest,
  AsistenteMensajeResponse,
  ContextoAsistente,
  MensajeChat,
  PaginaAsistente,
} from './asistente.models';
import { responderSimulado } from './asistente-chat.mock';

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

  private get enNavegador(): boolean {
    return isPlatformBrowser(this.platformId);
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
    }

    const utm: ContextoAsistente['utm'] = {};
    for (const clave of PARAMETROS_CAMPANA) {
      const valor = this.leer(clave);
      if (valor) utm[clave] = valor;
    }
    if (Object.keys(utm).length) contexto.utm = utm;

    return contexto;
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
