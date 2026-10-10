import { Injectable, InjectionToken, TransferState, inject, makeStateKey } from '@angular/core';
import { EnlaceListado, IndiceListados, enlacesDeIndice } from './listados';

/**
 * Listados con inmuebles, calculados por el servidor (sitemap.ts). server.ts lo entrega en cada petición;
 * en el navegador el token no existe y el dato llega con la página renderizada.
 */
export const INDICE_LISTADOS = new InjectionToken<IndiceListados | null>('INDICE_LISTADOS');

const CLAVE_ESTADO = makeStateKey<IndiceListados | null>('indice-listados');

@Injectable({
  providedIn: 'root',
})
export class IndiceListadosService {
  private estado = inject(TransferState);
  private delServidor = inject(INDICE_LISTADOS, { optional: true });
  private enlaces?: EnlaceListado[];

  /** Enlaces a los listados con inmuebles. Vacío si el servidor aún no los ha calculado. */
  obtener(): EnlaceListado[] {
    if (!this.enlaces) {
      // Solo viaja al navegador en las páginas que lo piden, para no engordar el resto.
      if (this.delServidor) this.estado.set(CLAVE_ESTADO, this.delServidor);
      const indice = this.delServidor || this.estado.get(CLAVE_ESTADO, null);
      if (!indice) return [];
      this.enlaces = enlacesDeIndice(indice);
    }
    return this.enlaces;
  }
}
