import { afterNextRender, Component, inject, Input, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { InmueblesService } from '../../core/Inmuebles/inmuebles.service';
import { WishlistServiceService } from '../../core/wishlist/wishlist-service.service';
import {
  BusquedaRetirado,
  busquedasRetirado,
  InmuebleRetirado,
  leerInmuebleRetirado,
  LugarRetirado,
  ubicarInmuebleRetirado,
} from '../../core/listados/inmueble-retirado';
import { encabezadoListado, rutaListado } from '../../core/listados/listados';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { TarjetaInmuebleComponent } from '../tarjeta-inmueble/tarjeta-inmueble.component';

/** Tipos que van con "esta": "Esta casa", "Esta bodega"; los demás con "este". */
const FEMENINOS = new Set(['casa', 'bodega', 'oficina', 'finca', 'casa campestre', 'casa comercial']);
/** Cuántos parecidos se muestran. */
const CANTIDAD_PARECIDOS = 6;
/** Cuántos se piden en cada búsqueda. */
const POR_BUSQUEDA = 12;

/**
 * Ficha de un inmueble que ya no existe en Domus: en lugar de un error, dice qué era (con lo que trae la
 * dirección) y muestra los inmuebles más parecidos, con un enlace al listado. La página responde 404 (lo pone
 * la página "no encontrada") para que los buscadores la retiren.
 */
@Component({
  selector: 'app-inmueble-retirado',
  standalone: true,
  imports: [RouterLink, NavbarComponent, FooterComponent, TarjetaInmuebleComponent],
  templateUrl: './inmueble-retirado.component.html',
})
export class InmuebleRetiradoComponent implements OnInit {
  private inmuebles = inject(InmueblesService);
  private favoritos = inject(WishlistServiceService);

  /** Texto de la dirección: "casa-arriendo-la-intermedia-envigado-7590". */
  @Input({ required: true }) slug = '';
  @Input() params: Record<string, string> = {};

  datos: InmuebleRetirado | null = null;
  ciudad?: LugarRetirado;
  barrio?: LugarRetirado;
  parecidos: any[] = [];
  cargando = true;
  /** Listado de "Ver todos": el nivel de la búsqueda que encontró los parecidos. */
  rutaTodos = '';
  textoTodos = '';

  constructor() {
    // Los parecidos se buscan solo en el navegador: el servidor responde rápido el 404 y la búsqueda no
    // retrasa la página (la ve el visitante, no el buscador).
    afterNextRender(() => this.buscarParecidos());
  }

  ngOnInit(): void {
    this.datos = leerInmuebleRetirado(this.slug, this.params);
  }

  /** "Esta casa en arriendo en La Intermedia, Envigado ya no está disponible". */
  get descripcion(): string {
    if (!this.datos) return 'Este inmueble';
    const nombre = this.datos.tipoNombre?.toLowerCase();
    const tipo = nombre ? `${FEMENINOS.has(nombre) ? 'Esta' : 'Este'} ${nombre}` : 'Este inmueble';
    const lugar = [this.barrio?.nombre, this.ciudad?.nombre].filter(Boolean).join(', ');
    return `${tipo} en ${this.datos.negocio}${lugar ? ` en ${this.capitalizar(lugar)}` : ''}`;
  }

  private async buscarParecidos(): Promise<void> {
    if (!this.datos) {
      this.cargando = false;
      return;
    }
    try {
      const [ciudades, barrios]: any[] = await firstValueFrom(
        forkJoin([this.inmuebles.getCiudades(), this.inmuebles.getBarrios()])
      );
      ({ ciudad: this.ciudad, barrio: this.barrio } = ubicarInmuebleRetirado(this.datos, ciudades?.data, barrios?.data));
    } catch {
      // Sin catálogos se busca por tipo y negocio.
    }

    const encontrados: any[] = [];
    let nivel: BusquedaRetirado['nivel'] | null = null;
    for (const busqueda of busquedasRetirado(this.datos, this.ciudad, this.barrio)) {
      try {
        const respuesta: any = await firstValueFrom(
          this.inmuebles.getFiltrosEnviar(
            { ...busqueda.filtros, sort: 'desc', order: 'consignation_date', page: 1 },
            POR_BUSQUEDA
          )
        );
        for (const inmueble of respuesta?.data || []) {
          const codigo = Number(inmueble?.codpro);
          if (codigo && codigo !== this.datos.codpro && !encontrados.some((e) => Number(e.codpro) === codigo)) {
            encontrados.push(inmueble);
          }
        }
        if (encontrados.length && !nivel) nivel = busqueda.nivel;
      } catch {
        // Si una búsqueda falla se sigue con la siguiente, más amplia.
      }
      if (encontrados.length >= CANTIDAD_PARECIDOS) break;
    }

    this.parecidos = encontrados.slice(0, CANTIDAD_PARECIDOS);
    this.armarEnlaceTodos(nivel ?? 'negocio');
    this.cargando = false;
  }

  private armarEnlaceTodos(nivel: BusquedaRetirado['nivel']): void {
    if (!this.datos) return;
    const ciudad = nivel !== 'negocio' ? this.ciudad : undefined;
    const barrio = nivel === 'barrio' ? this.barrio : undefined;
    this.rutaTodos = rutaListado(this.datos.negocio, this.datos.tipo?.slug, ciudad?.slug, barrio?.slug);
    const nombre = (lugar?: LugarRetirado) => (lugar ? this.capitalizar(lugar.nombre) : undefined);
    this.textoTodos = `Ver ${encabezadoListado(this.datos.negocio, this.datos.tipo?.plural, nombre(ciudad), nombre(barrio))
      .replace(/^./, (l) => l.toLowerCase())}`;
  }

  agregarFavorito(inmueble: any): void {
    this.favoritos.agregar(inmueble);
  }

  private capitalizar(texto: string): string {
    return texto.toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase());
  }
}
