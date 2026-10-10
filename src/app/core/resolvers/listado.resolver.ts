import { ResolveFn, Router, UrlMatcher, UrlSegment } from '@angular/router';
import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, Observable, catchError, forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { InmueblesService } from '../Inmuebles/inmuebles.service';
import { SeoService } from '../seo/seo.service';
import {
  BIZ_DE_NEGOCIO,
  INMUEBLES_POR_PAGINA,
  Negocio,
  SLUG_SIN_TIPO,
  TipoListado,
  esNegocio,
  rutaListado,
  slugListado,
  tipoPorSlug,
} from '../listados/listados';

export interface LugarListado {
  codigo: string;
  nombre: string;
  slug: string;
}

export interface DatosListado {
  negocio: Negocio;
  tipo?: TipoListado;
  ciudad?: LugarListado;
  barrio?: LugarListado;
  pagina: number;
  /** Ruta del listado sin dominio ni paginación, por ejemplo '/arriendo/apartamentos/medellin'. */
  ruta: string;
  /** Filtros enviados a la API, con la misma forma que usa la página de filtros. */
  filtros: any;
  /** Respuesta paginada de la API. */
  respuesta: any;
}

/** Reconoce /{arriendo|venta}[/{tipo}[/{ciudad}[/{barrio}]]]. */
export const listadoMatcher: UrlMatcher = (segmentos) => {
  if (segmentos.length < 1 || segmentos.length > 4 || !esNegocio(segmentos[0].path)) return null;
  const posParams: { [nombre: string]: UrlSegment } = {};
  ['negocio', 'tipo', 'ciudad', 'barrio'].forEach((nombre, i) => {
    if (segmentos[i]) posParams[nombre] = segmentos[i];
  });
  return { consumed: segmentos, posParams };
};

export const listadoResolver: ResolveFn<DatosListado> = (route) => {
  const inmueblesService = inject(InmueblesService);
  const router = inject(Router);
  const seo = inject(SeoService);

  // Muestra la página "no encontrada" sin cambiar la dirección del navegador.
  const noDisponible = (codigo: number) => {
    seo.responderCon(codigo);
    router.navigate(['/no-encontrado'], { skipLocationChange: true });
    return EMPTY;
  };

  const negocio = route.paramMap.get('negocio') as Negocio;
  const tipoSlug = route.paramMap.get('tipo');
  const ciudadSlug = route.paramMap.get('ciudad');
  const barrioSlug = route.paramMap.get('barrio');

  const paginaTexto = route.queryParamMap.get('page');
  const pagina = paginaTexto === null ? 1 : Number(paginaTexto);
  if (!Number.isInteger(pagina) || pagina < 1) return noDisponible(404);

  const tipo = tipoSlug && tipoSlug !== SLUG_SIN_TIPO ? tipoPorSlug(tipoSlug) : undefined;
  if (tipoSlug && tipoSlug !== SLUG_SIN_TIPO && !tipo) return noDisponible(404);
  // /arriendo/inmuebles sería un duplicado de /arriendo.
  if (tipoSlug === SLUG_SIN_TIPO && !ciudadSlug) return noDisponible(404);

  const noExiste = () => new HttpErrorResponse({ status: 404 });
  const catalogos$: Observable<[any, any] | null> = ciudadSlug
    ? forkJoin([inmueblesService.getCiudades(), barrioSlug ? inmueblesService.getBarrios() : of(null)])
    : of(null);

  return catalogos$.pipe(
    switchMap((catalogos) => {
      let ciudad: LugarListado | undefined;
      let barrio: LugarListado | undefined;
      if (catalogos) {
        const [ciudades, barrios] = catalogos;
        const datosCiudad = (ciudades?.data || []).find((c: any) => slugListado(c.name) === ciudadSlug);
        if (!datosCiudad) throw noExiste();
        ciudad = { codigo: String(datosCiudad.code), nombre: String(datosCiudad.name).trim(), slug: ciudadSlug! };

        if (barrioSlug) {
          const datosBarrio = (barrios?.data || []).find(
            (b: any) => String(b.city_code) === ciudad!.codigo && slugListado(b.name) === barrioSlug
          );
          if (!datosBarrio) throw noExiste();
          barrio = { codigo: String(datosBarrio.code), nombre: String(datosBarrio.name).trim(), slug: barrioSlug };
        }
      }

      const filtros = {
        biz: BIZ_DE_NEGOCIO[negocio],
        ...(tipo ? { type: tipo.codigo } : {}),
        ...(ciudad ? { city: ciudad.codigo } : {}),
        ...(barrio ? { neighborhood_code: barrio.codigo } : {}),
        sort: 'desc',
        order: 'consignation_date',
        page: pagina,
      };

      return inmueblesService.getFiltrosEnviar(filtros, INMUEBLES_POR_PAGINA).pipe(
        map((respuesta: any) => {
          // Una página más allá de la última no existe; la primera sí, aunque el listado esté vacío.
          if (pagina > 1 && !respuesta?.data?.length) throw noExiste();
          return {
            negocio,
            tipo,
            ciudad,
            barrio,
            pagina,
            ruta: rutaListado(negocio, tipo?.slug, ciudad?.slug, barrio?.slug),
            filtros,
            respuesta,
          };
        })
      );
    }),
    catchError((error) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);
      // Un fallo de la API se trata como temporal para que los buscadores no eliminen listados válidos.
      return noDisponible(error.status === 404 || error.status === 400 ? 404 : 503);
    })
  );
};
