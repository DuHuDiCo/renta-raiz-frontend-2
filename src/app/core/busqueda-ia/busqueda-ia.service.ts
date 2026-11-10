import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AsistenteChatService } from '../asistente/asistente-chat.service';
import { InmueblesService } from '../Inmuebles/inmuebles.service';
import { interpretarSimulado } from './busqueda-ia.mock';
import {
  FiltrosIa,
  InterpretarBusquedaRequest,
  InterpretarBusquedaResponse,
  LONGITUD_MAXIMA_CONSULTA,
  MAXIMO_INMUEBLES_VISIBLES,
  PaginaVisibleIa,
} from './busqueda-ia.models';

/** Las preguntas sobre los inmuebles de la página tardan entre 4 y 10 s; el backend pide no cortar antes de 20 s. */
const TIEMPO_MAXIMO_RESPUESTA_MS = 20000;

const SIN_INTERPRETACION: InterpretarBusquedaResponse = {
  filtros: {},
  etiquetas: {},
  noEntendido: [],
  degradado: true,
  intencion: 'busqueda',
  lugaresNoEncontrados: [],
  avisos: [],
  inmueblesDestacados: [],
};

/** Si el backend no manda `reintentarEn` con el 429, se espera esto. */
const ESPERA_POR_DEFECTO_S = 30;

@Injectable({ providedIn: 'root' })
export class BusquedaIaService {
  private http = inject(HttpClient);
  private asistente = inject(AsistenteChatService);
  private inmuebles = inject(InmueblesService);

  /**
   * Nunca falla: un error de red o del backend llega como respuesta `degradado`, y un 429 con `reintentarEn`.
   * `filtrosActuales` son los filtros aplicados en este momento; se mandan siempre, aunque estén vacíos.
   * `paginaVisible` son los inmuebles que el visitante tiene en pantalla, para preguntas sobre ellos.
   */
  interpretar(
    consulta: string,
    filtrosActuales: FiltrosIa = {},
    paginaVisible: PaginaVisibleIa = { inmueblesVisibles: [] }
  ): Observable<InterpretarBusquedaResponse> {
    const peticion: InterpretarBusquedaRequest = {
      consulta: consulta.trim().slice(0, LONGITUD_MAXIMA_CONSULTA),
      sesionId: this.asistente.cargarConversacion().sesionId,
      filtrosActuales,
      inmueblesVisibles: paginaVisible.inmueblesVisibles.slice(0, MAXIMO_INMUEBLES_VISIBLES),
      ...(paginaVisible.pagina ? { pagina: paginaVisible.pagina } : {}),
      ...(paginaVisible.enFoco?.length ? { enFoco: paginaVisible.enFoco } : {}),
    };
    if (environment.busquedaIaMock) {
      return forkJoin({ ciudades: this.inmuebles.getCiudades(), barrios: this.inmuebles.getBarrios() }).pipe(
        switchMap(({ ciudades, barrios }: any) =>
          interpretarSimulado(peticion, { ciudades: ciudades?.data ?? [], barrios: barrios?.data ?? [] })
        ),
        map((respuesta) => completar(respuesta)),
        catchError(() => of(SIN_INTERPRETACION))
      );
    }
    return this.http
      .post<Partial<InterpretarBusquedaResponse>>(`${environment.baseUrl}/busqueda/interpretar`, peticion)
      .pipe(
        timeout(TIEMPO_MAXIMO_RESPUESTA_MS),
        map((respuesta) => completar(respuesta)),
        catchError((error: unknown) =>
          of(
            error instanceof HttpErrorResponse && error.status === 429
              ? { ...SIN_INTERPRETACION, degradado: false, reintentarEn: Number(error.error?.reintentarEn) || ESPERA_POR_DEFECTO_S }
              : SIN_INTERPRETACION
          )
        )
      );
  }
}

/** Valores por defecto para los campos que falten, así el resto del front no tiene que comprobarlos. */
function completar(respuesta: Partial<InterpretarBusquedaResponse> | null): InterpretarBusquedaResponse {
  return {
    filtros: respuesta?.filtros ?? {},
    etiquetas: respuesta?.etiquetas ?? {},
    noEntendido: respuesta?.noEntendido ?? [],
    degradado: respuesta?.degradado ?? true,
    intencion: respuesta?.intencion ?? 'busqueda',
    lugaresNoEncontrados: respuesta?.lugaresNoEncontrados ?? [],
    avisos: (respuesta?.avisos ?? []).map((aviso) => String(aviso).trim()).filter(Boolean),
    respuesta: respuesta?.respuesta?.trim() || undefined,
    inmueblesDestacados: (respuesta?.inmueblesDestacados ?? []).map(Number).filter((codigo) => codigo > 0),
  };
}
