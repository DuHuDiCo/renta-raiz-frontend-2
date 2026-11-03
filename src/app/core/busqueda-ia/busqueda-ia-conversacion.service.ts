import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, switchMap } from 'rxjs';
import { InmueblesService } from '../Inmuebles/inmuebles.service';
import { BusquedaIaService } from './busqueda-ia.service';
import { ClaveFiltroIa, FiltrosIa, InterpretarBusquedaResponse } from './busqueda-ia.models';

/** Clave de sessionStorage: la conversación dura lo que la pestaña y sobrevive a recargar. */
const CLAVE_CONVERSACION = 'busqueda_ia_conversacion';

export interface MensajeBusquedaIa {
  rol: 'usuario' | 'ia';
  /** null mientras la IA espera el total de resultados para responder. */
  texto: string | null;
  /** Partes de la frase que no se pudieron convertir en filtro. */
  noEntendido?: string[];
}

/** Filtro visible en el chat; algunos agrupan varias claves (mínimo y máximo de habitaciones). */
export interface EtiquetaFiltroIa {
  texto: string;
  claves: ClaveFiltroIa[];
}

/** Sugerencia de un clic: manda una frase a la IA o quita filtros sin pasar por ella. */
export interface SugerenciaIa {
  texto: string;
  icono: string;
  consulta?: string;
  quitar?: ClaveFiltroIa[];
}

/** Lo que la página de resultados necesita para pintarlos, igual que el `state` de la búsqueda normal. */
export interface ResultadoBusquedaIa {
  resultados: any[];
  paginacion: any;
  filtros: Record<string, any>;
}

interface Conversacion {
  mensajes: MensajeBusquedaIa[];
  filtros: FiltrosIa;
  etiquetas: InterpretarBusquedaResponse['etiquetas'];
}

const NEGOCIOS: Record<string, string> = { '1': 'Arriendo', '2': 'Venta', '3': 'Arriendo y venta' };

/**
 * Conversación de la búsqueda con IA en la página de resultados. La barra de búsqueda la inicia con la
 * primera frase; desde el chat cada mensaje refina los filtros actuales (el backend recibe `filtrosActuales`)
 * y trae los inmuebles de nuevo. Las respuestas las redacta el portal con los filtros y el total.
 */
@Injectable({ providedIn: 'root' })
export class BusquedaIaConversacionService {
  private busquedaIa = inject(BusquedaIaService);
  private inmuebles = inject(InmueblesService);

  private conversacion: Conversacion = this.leer();

  get activa(): boolean {
    return this.conversacion.mensajes.length > 0;
  }

  get mensajes(): MensajeBusquedaIa[] {
    return this.conversacion.mensajes;
  }

  /** Primera frase, buscada desde la barra de filtros. La respuesta se completa al conocer el total. */
  iniciar(consulta: string, respuesta: InterpretarBusquedaResponse): void {
    this.conversacion = {
      mensajes: [
        { rol: 'usuario', texto: consulta },
        { rol: 'ia', texto: null, noEntendido: respuesta.noEntendido },
      ],
      filtros: this.sinVacios(respuesta.filtros),
      etiquetas: { ...respuesta.etiquetas },
    };
    this.guardar();
  }

  /** Redacta la respuesta pendiente cuando la página ya sabe cuántos inmuebles hay. */
  completarTotal(total: number): void {
    const ultimo = this.conversacion.mensajes.at(-1);
    if (ultimo?.rol !== 'ia' || ultimo.texto !== null) return;
    ultimo.texto = total ? `Encontré ${this.cantidad(total)}. Busqué con:` : this.textoSinResultados();
    this.guardar();
  }

  terminar(): void {
    this.conversacion = { mensajes: [], filtros: {}, etiquetas: {} };
    try {
      sessionStorage.removeItem(CLAVE_CONVERSACION);
    } catch {
      // Sin almacenamiento no hay nada que borrar.
    }
  }

  /** Cambia los filtros con una frase ("más barato", "mejor en Envigado"). null si no hubo cambios que buscar. */
  refinar(consulta: string, elementsPerPage: number): Observable<ResultadoBusquedaIa | null> {
    this.conversacion.mensajes.push({ rol: 'usuario', texto: consulta });
    this.guardar();

    return this.busquedaIa.interpretar(consulta, this.conversacion.filtros).pipe(
      switchMap((respuesta) => {
        if (respuesta.degradado) {
          return this.responderSinBuscar('La búsqueda con IA no está disponible en este momento. Puedes usar los filtros manuales.');
        }
        const filtros = this.sinVacios(respuesta.filtros);
        if (this.mismosFiltros(filtros, this.conversacion.filtros)) {
          return this.responderSinBuscar(
            'No logré convertir eso en un cambio de búsqueda. Prueba con la zona, el tipo de inmueble, el precio o las habitaciones.',
            respuesta.noEntendido
          );
        }
        this.conversacion.filtros = filtros;
        this.conversacion.etiquetas = this.etiquetasVigentes({ ...this.conversacion.etiquetas, ...respuesta.etiquetas });
        return this.buscar(elementsPerPage, (total) => (total ? `Listo, ahora son ${this.cantidad(total)}.` : this.textoSinResultados()), respuesta.noEntendido);
      })
    );
  }

  /** Quita filtros desde una etiqueta o una sugerencia, sin pasar por la IA. */
  quitar(claves: ClaveFiltroIa[], elementsPerPage: number): Observable<ResultadoBusquedaIa | null> {
    const nombre = this.etiquetas().find((e) => e.claves.some((c) => claves.includes(c)))?.texto;
    // Sin ciudad tampoco hay barrio.
    const borrar = claves.includes('city') ? [...claves, 'neighborhood_code' as ClaveFiltroIa] : claves;
    borrar.forEach((clave) => delete this.conversacion.filtros[clave]);
    this.conversacion.etiquetas = this.etiquetasVigentes(this.conversacion.etiquetas);
    return this.buscar(elementsPerPage, (total) =>
      total ? `Quité «${nombre}». Ahora son ${this.cantidad(total)}.` : this.textoSinResultados()
    );
  }

  /** Filtros actuales en palabras, para las etiquetas del chat. */
  etiquetas(): EtiquetaFiltroIa[] {
    const f = this.conversacion.filtros;
    const e = this.conversacion.etiquetas;
    const lista: EtiquetaFiltroIa[] = [];
    const agregar = (texto: string, ...claves: ClaveFiltroIa[]) => lista.push({ texto, claves });

    if (f.biz && NEGOCIOS[f.biz]) agregar(NEGOCIOS[f.biz], 'biz');
    if (f.type) agregar(e.type || 'Tipo de inmueble', 'type');
    if (f.neighborhood_code) agregar(e.neighborhood_code || 'Barrio', 'neighborhood_code');
    if (f.city) agregar(e.city || 'Ciudad', 'city');
    const precioMin = f.pvmin || f.pcmin;
    const precioMax = f.pvmax || f.pcmax;
    if (precioMin) agregar(`Desde ${this.precio(precioMin)}`, f.pvmin ? 'pvmin' : 'pcmin');
    if (precioMax) agregar(`Hasta ${this.precio(precioMax)}`, f.pvmax ? 'pvmax' : 'pcmax');
    if (f.minbed || f.maxbed) agregar(this.rango(f.minbed, f.maxbed, 'habitación', 'habitaciones'), 'minbed', 'maxbed');
    if (f.minbath || f.maxbath) agregar(this.rango(f.minbath, f.maxbath, 'baño', 'baños'), 'minbath', 'maxbath');
    if (f.minarea || f.maxarea) {
      agregar(f.minarea && f.maxarea ? `${f.minarea} a ${f.maxarea} m²` : f.minarea ? `Desde ${f.minarea} m²` : `Hasta ${f.maxarea} m²`, 'minarea', 'maxarea');
    }
    if (f.minparking) agregar('Con parqueadero', 'minparking');
    if (f.stratum) agregar(`Estrato ${f.stratum}`, 'stratum');
    return lista;
  }

  /** Atajos según la búsqueda actual. */
  sugerencias(): SugerenciaIa[] {
    const f = this.conversacion.filtros;
    const lista: SugerenciaIa[] = [];
    if (f.pvmax || f.pcmax) lista.push({ texto: 'Más económico', icono: 'fa-arrow-down', consulta: 'más barato' });
    if (!f.minparking) lista.push({ texto: 'Con parqueadero', icono: 'fa-car', consulta: 'con parqueadero' });
    if (f.biz === '2') lista.push({ texto: 'Ver en arriendo', icono: 'fa-key', consulta: 'en arriendo' });
    if (f.biz === '1') lista.push({ texto: 'Ver en venta', icono: 'fa-house', consulta: 'en venta' });
    if (!f.minbed) lista.push({ texto: '3 habitaciones', icono: 'fa-bed', consulta: '3 habitaciones' });
    if (f.neighborhood_code) lista.push({ texto: 'Toda la ciudad', icono: 'fa-map-location-dot', quitar: ['neighborhood_code'] });
    return lista.slice(0, 4);
  }

  private buscar(
    elementsPerPage: number,
    texto: (total: number) => string,
    noEntendido: string[] = []
  ): Observable<ResultadoBusquedaIa | null> {
    const filtros = { ...this.conversacion.filtros, sort: 'desc', order: 'consignation_date', page: 1 };
    return this.inmuebles.getFiltrosEnviar(filtros, elementsPerPage).pipe(
      map((respuesta: any) => {
        this.conversacion.mensajes.push({ rol: 'ia', texto: texto(Number(respuesta?.total) || 0), noEntendido });
        this.guardar();
        return { resultados: respuesta?.data || [], paginacion: respuesta, filtros };
      }),
      catchError(() => this.responderSinBuscar('No pude cargar los inmuebles. Intenta de nuevo en un momento.'))
    );
  }

  private responderSinBuscar(texto: string, noEntendido: string[] = []): Observable<null> {
    this.conversacion.mensajes.push({ rol: 'ia', texto, noEntendido });
    this.guardar();
    return of(null);
  }

  private textoSinResultados(): string {
    return 'No encontré inmuebles con esos filtros. Quita alguno o pídeme otra zona o precio.';
  }

  private cantidad(total: number): string {
    return total === 1 ? '1 inmueble' : `${total.toLocaleString('es-CO')} inmuebles`;
  }

  /** 1500000000 → "$1.500 M"; 4500000 → "$4,5 M". */
  private precio(valor: string): string {
    const n = Number(valor);
    if (n >= 1_000_000) return `$${(n / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
    return `$${n.toLocaleString('es-CO')}`;
  }

  private rango(min: string | undefined, max: string | undefined, uno: string, varios: string): string {
    if (min && max) return min === max ? `${min} ${min === '1' ? uno : varios}` : `${min} a ${max} ${varios}`;
    if (min) return `${min}+ ${varios}`;
    return `Hasta ${max} ${varios}`;
  }

  /** Quita los nombres de filtros que ya no están. */
  private etiquetasVigentes(etiquetas: Conversacion['etiquetas']): Conversacion['etiquetas'] {
    return Object.fromEntries(
      Object.entries(etiquetas).filter(([clave]) => this.conversacion.filtros[clave as ClaveFiltroIa])
    );
  }

  private sinVacios(filtros: FiltrosIa): FiltrosIa {
    return Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor !== undefined && valor !== ''));
  }

  private mismosFiltros(a: FiltrosIa, b: FiltrosIa): boolean {
    const claves = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<ClaveFiltroIa>;
    return [...claves].every((clave) => String(a[clave] ?? '') === String(b[clave] ?? ''));
  }

  private guardar(): void {
    try {
      sessionStorage.setItem(CLAVE_CONVERSACION, JSON.stringify(this.conversacion));
    } catch {
      // Servidor o navegador sin almacenamiento: la conversación solo dura en esta página.
    }
  }

  private leer(): Conversacion {
    try {
      const guardada = sessionStorage.getItem(CLAVE_CONVERSACION);
      if (guardada) return JSON.parse(guardada);
    } catch {
      // Sin almacenamiento o dato dañado: se empieza sin conversación.
    }
    return { mensajes: [], filtros: {}, etiquetas: {} };
  }
}
