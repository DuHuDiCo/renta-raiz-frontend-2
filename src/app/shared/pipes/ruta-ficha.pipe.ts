import { Pipe, PipeTransform } from '@angular/core';
import { rutaFicha } from '../../core/listados/listados';

/** Dirección de la ficha de un inmueble, lista para `routerLink`: `[routerLink]="inmueble | rutaFicha"`. */
@Pipe({
  name: 'rutaFicha',
  standalone: true
})
export class RutaFichaPipe implements PipeTransform {

  transform(inmueble: any): string {
    return rutaFicha(inmueble);
  }
}
