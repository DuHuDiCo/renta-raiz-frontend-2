import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SolicitudRecorridoRequest, SolicitudRecorridoResponse } from './recorridos.models';

const TIEMPO_MAXIMO_RESPUESTA_MS = 15000;

@Injectable({ providedIn: 'root' })
export class RecorridosService {
  private http = inject(HttpClient);

  /** Envía la disponibilidad del visitante para que el equipo organice el recorrido. */
  solicitar(solicitud: SolicitudRecorridoRequest): Observable<SolicitudRecorridoResponse> {
    if (environment.recorridoMock) {
      // Mientras el backend no tenga el endpoint: se simula la respuesta para poder probar el formulario.
      console.info('[recorrido simulado]', solicitud);
      return of({ id: `SIM-${Date.now().toString(36).toUpperCase()}` }).pipe(delay(900));
    }
    return this.http
      .post<SolicitudRecorridoResponse>(`${environment.baseUrl}/recorridos`, solicitud)
      .pipe(timeout(TIEMPO_MAXIMO_RESPUESTA_MS));
  }
}
