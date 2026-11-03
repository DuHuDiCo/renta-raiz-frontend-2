import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, Observable, of, switchMap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AsistenteChatService } from '../asistente/asistente-chat.service';
import { InmueblesService } from '../Inmuebles/inmuebles.service';
import { interpretarSimulado } from './busqueda-ia.mock';
import {
  FiltrosIa,
  InterpretarBusquedaRequest,
  InterpretarBusquedaResponse,
  LONGITUD_MAXIMA_CONSULTA,
} from './busqueda-ia.models';

/** El backend corta a los 4 s y responde `degradado`; esto cubre la red. */
const TIEMPO_MAXIMO_RESPUESTA_MS = 8000;

const SIN_INTERPRETACION: InterpretarBusquedaResponse = { filtros: {}, etiquetas: {}, noEntendido: [], degradado: true };

@Injectable({ providedIn: 'root' })
export class BusquedaIaService {
  private http = inject(HttpClient);
  private asistente = inject(AsistenteChatService);
  private inmuebles = inject(InmueblesService);

  /** Nunca falla: un error de red o del backend llega como respuesta `degradado`. */
  interpretar(consulta: string, filtrosActuales?: FiltrosIa): Observable<InterpretarBusquedaResponse> {
    const peticion: InterpretarBusquedaRequest = {
      consulta: consulta.trim().slice(0, LONGITUD_MAXIMA_CONSULTA),
      sesionId: this.asistente.cargarConversacion().sesionId,
      ...(filtrosActuales && Object.keys(filtrosActuales).length ? { filtrosActuales } : {}),
    };
    if (environment.busquedaIaMock) {
      return forkJoin({ ciudades: this.inmuebles.getCiudades(), barrios: this.inmuebles.getBarrios() }).pipe(
        switchMap(({ ciudades, barrios }: any) =>
          interpretarSimulado(peticion, { ciudades: ciudades?.data ?? [], barrios: barrios?.data ?? [] })
        ),
        catchError(() => of(SIN_INTERPRETACION))
      );
    }
    return this.http
      .post<InterpretarBusquedaResponse>(`${environment.baseUrl}/busqueda/interpretar`, peticion)
      .pipe(
        timeout(TIEMPO_MAXIMO_RESPUESTA_MS),
        catchError(() => of(SIN_INTERPRETACION))
      );
  }
}
