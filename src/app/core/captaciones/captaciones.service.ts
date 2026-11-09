import { HttpClient, HttpContext, HttpEventType } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { filter, map, Observable, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SIN_LOADER_GLOBAL } from '../interceptor/loader.interceptor';
import { CaptacionResponse, DatosCaptacion, EventoEnvioCaptacion } from './captaciones.models';

/**
 * Las fotos pueden tardar en subir desde un celular: el límite es de inactividad (60 s sin avance ni respuesta),
 * así una subida lenta pero continua no se corta.
 */
const TIEMPO_MAXIMO_SIN_RESPUESTA_MS = 60000;

/** Arma el multipart del contrato A: parte `datos` (JSON) y una parte `fotos` por cada foto. */
export function armarFormularioCaptacion(datos: DatosCaptacion, fotos: Blob[]): FormData {
  const formulario = new FormData();
  formulario.append('datos', new Blob([JSON.stringify(datos)], { type: 'application/json' }));
  fotos.forEach((foto, i) => formulario.append('fotos', foto, `foto-${i + 1}.${extension(foto.type)}`));
  return formulario;
}

function extension(tipo: string): string {
  return tipo === 'image/png' ? 'png' : tipo === 'image/webp' ? 'webp' : 'jpg';
}

@Injectable({ providedIn: 'root' })
export class CaptacionesService {
  private http = inject(HttpClient);

  /** Envía el inmueble del propietario con sus fotos. Emite el avance de la subida y, al final, la respuesta. */
  enviar(datos: DatosCaptacion, fotos: Blob[]): Observable<EventoEnvioCaptacion> {
    const formulario = armarFormularioCaptacion(datos, fotos);
    if (environment.captacionMock) return this.simular(formulario, datos, fotos);

    // Sin Content-Type: el navegador pone multipart/form-data con su boundary.
    return this.http
      .post<CaptacionResponse>(`${environment.baseUrl}/captaciones`, formulario, {
        reportProgress: true,
        observe: 'events',
        // La página muestra su propio avance; el loader de pantalla completa lo taparía.
        context: new HttpContext().set(SIN_LOADER_GLOBAL, true),
      })
      .pipe(
        timeout({ each: TIEMPO_MAXIMO_SIN_RESPUESTA_MS }),
        map((evento): EventoEnvioCaptacion | null => {
          if (evento.type === HttpEventType.UploadProgress) {
            const porcentaje = evento.total ? Math.round((evento.loaded / evento.total) * 100) : 0;
            return { tipo: 'progreso', porcentaje };
          }
          if (evento.type === HttpEventType.Response) return { tipo: 'listo', respuesta: evento.body as CaptacionResponse };
          return null;
        }),
        filter((evento): evento is EventoEnvioCaptacion => evento !== null)
      );
  }

  /** Mientras el backend no tenga el endpoint: simula la subida y la respuesta para poder probar el formulario. */
  private simular(formulario: FormData, datos: DatosCaptacion, fotos: Blob[]): Observable<EventoEnvioCaptacion> {
    const partes: Record<string, unknown>[] = [];
    formulario.forEach((valor, nombre) =>
      partes.push(
        valor instanceof Blob
          ? { nombre, archivo: (valor as File).name ?? null, tipo: valor.type, bytes: valor.size }
          : { nombre, valor }
      )
    );
    console.info('[captación simulada]', { datos, partes, fotos: fotos.length });
    (window as any).__ultimaCaptacionSimulada = { datos, partes, formulario };

    return new Observable<EventoEnvioCaptacion>((suscriptor) => {
      let porcentaje = 0;
      const intervalo = setInterval(() => {
        porcentaje = Math.min(100, porcentaje + 20);
        suscriptor.next({ tipo: 'progreso', porcentaje });
        if (porcentaje === 100) {
          clearInterval(intervalo);
          const id = `CAP-${Date.now().toString(36).toUpperCase().slice(-8).padStart(8, '0')}`;
          setTimeout(() => {
            suscriptor.next({ tipo: 'listo', respuesta: { id } });
            suscriptor.complete();
          }, 300);
        }
      }, 200);
      return () => clearInterval(intervalo);
    });
  }
}
