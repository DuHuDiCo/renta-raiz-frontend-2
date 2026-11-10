import { Injectable } from '@angular/core';

/**
 * Inmuebles que el usuario tiene en pantalla, para que el asistente sepa de cuáles le hablan ("el más barato de
 * estos"). Cada tarjeta de inmueble se registra al aparecer y se quita al desaparecer. Ver docs/contrato-asistente.md.
 */
@Injectable({ providedIn: 'root' })
export class InmueblesEnPantallaService {
  /** Cuántas tarjetas de cada código hay (un mismo inmueble puede salir en dos secciones); conserva el orden. */
  private cuentas = new Map<number, number>();

  registrar(codpro: unknown): void {
    const codigo = Number(codpro);
    if (!Number.isInteger(codigo) || codigo <= 0) return;
    this.cuentas.set(codigo, (this.cuentas.get(codigo) ?? 0) + 1);
  }

  quitar(codpro: unknown): void {
    const codigo = Number(codpro);
    const cuenta = this.cuentas.get(codigo);
    if (!cuenta) return;
    if (cuenta > 1) this.cuentas.set(codigo, cuenta - 1);
    else this.cuentas.delete(codigo);
  }

  /** Códigos en el orden en que aparecieron, sin repetir. */
  codigos(maximo = Infinity): number[] {
    return [...this.cuentas.keys()].slice(0, maximo);
  }
}
