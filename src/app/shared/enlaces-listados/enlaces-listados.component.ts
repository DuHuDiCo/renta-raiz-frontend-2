import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IndiceListadosService } from '../../core/listados/indice-listados';
import { EnlaceListado, Negocio } from '../../core/listados/listados';
import { DatosListado } from '../../core/resolvers/listado.resolver';

interface GrupoEnlaces {
  titulo: string;
  enlaces: EnlaceListado[];
}

const MAXIMO_POR_GRUPO = 12;

/** Enlaces a otros listados con inmuebles: por tipo, ciudad y barrio. Sin `actual` muestra los generales. */
@Component({
  selector: 'app-enlaces-listados',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './enlaces-listados.component.html',
})
export class EnlacesListadosComponent implements OnInit {
  private indice = inject(IndiceListadosService);
  private listadoActual?: DatosListado | null;

  grupos: GrupoEnlaces[] = [];

  @Input() set actual(listado: DatosListado | null | undefined) {
    this.listadoActual = listado;
    this.grupos = this.calcularGrupos();
  }

  ngOnInit(): void {
    this.grupos = this.calcularGrupos();
  }

  private calcularGrupos(): GrupoEnlaces[] {
    const enlaces = this.indice.obtener();
    const grupo = (titulo: string, filtro: (e: EnlaceListado) => boolean): GrupoEnlaces => ({
      titulo,
      enlaces: enlaces.filter(filtro).sort((a, b) => b.total - a.total).slice(0, MAXIMO_POR_GRUPO),
    });

    const actual = this.listadoActual;
    let grupos: GrupoEnlaces[];

    if (!actual) {
      const generales = (negocio: Negocio, nombre: string) => [
        grupo(`${nombre} por tipo de inmueble`, (e) => e.negocio === negocio && !!e.tipo && !e.ciudad),
        grupo(`${nombre} por ciudad`, (e) => e.negocio === negocio && !e.tipo && !!e.ciudad && !e.barrio),
      ];
      grupos = [...generales('arriendo', 'Arriendo'), ...generales('venta', 'Venta')];
    } else {
      const tipo = actual.tipo?.codigo || '';
      const ciudad = actual.ciudad?.codigo || '';
      const barrio = actual.barrio?.codigo || '';
      const otroNegocio: Negocio = actual.negocio === 'arriendo' ? 'venta' : 'arriendo';
      const enNegocio = (e: EnlaceListado) => e.negocio === actual.negocio;

      grupos = [
        ciudad
          ? grupo(`Barrios de ${actual.ciudad!.nombre}`, (e) => enNegocio(e) && e.tipo === tipo && e.ciudad === ciudad && !!e.barrio && e.barrio !== barrio)
          : grupo('Por ciudad', (e) => enNegocio(e) && e.tipo === tipo && !!e.ciudad && !e.barrio),
        grupo('Otros tipos de inmueble', (e) => enNegocio(e) && !!e.tipo && e.tipo !== tipo && e.ciudad === ciudad && !e.barrio),
        grupo(`También en ${otroNegocio}`, (e) => e.negocio === otroNegocio && e.tipo === tipo && e.ciudad === ciudad && e.barrio === barrio),
      ];
    }

    return grupos.filter((g) => g.enlaces.length);
  }
}
