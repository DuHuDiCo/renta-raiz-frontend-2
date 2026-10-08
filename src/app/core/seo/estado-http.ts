import { InjectionToken } from '@angular/core';

/**
 * Código HTTP con el que el servidor (server.ts) responde la página renderizada.
 * server.ts crea un objeto por petición; en el navegador el token no existe.
 */
export interface EstadoHttp {
  codigo: number;
}

export const ESTADO_HTTP = new InjectionToken<EstadoHttp>('ESTADO_HTTP');
