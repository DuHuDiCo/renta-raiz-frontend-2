import { ResolveFn, Router } from '@angular/router';
import { InmueblesService } from '../Inmuebles/inmuebles.service';
import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, catchError, map, switchMap, of, throwError } from 'rxjs';
import { SeoService } from '../seo/seo.service';
import { codigoDeFicha, rutaFicha } from '../listados/listados';

/**
 * Carga el inmueble de la ficha. Sirve a las dos rutas:
 *  - /inmueble/apartamento-arriendo-el-poblado-medellin-7434 (la dirección oficial)
 *  - /ver-propiedad/7434/0 (la antigua, que redirige a la oficial) y /ver-propiedad/7434/1 (vista reducida)
 */
export const propiedadResolver: ResolveFn<any> = (route) => {
  const inmueblesService = inject(InmueblesService);
  const router = inject(Router);
  const seo = inject(SeoService);

  const slug = route.paramMap.get('slug');
  const codPro = slug !== null ? codigoDeFicha(slug) : Number(route.paramMap.get('codpro'));
  // La vista reducida (sin menú ni datos de contacto) conserva su dirección antigua.
  const vistaReducida = slug === null && Number(route.paramMap.get('ocultarContenido')) === 1;
  const rutaActual = `/${route.url.map((segmento) => segmento.path).join('/')}`;

  // Muestra la página "no encontrada" sin cambiar la dirección del navegador.
  const noDisponible = (codigo: number) => {
    seo.responderCon(codigo);
    router.navigate(['/no-encontrado'], { skipLocationChange: true });
    return EMPTY;
  };

  if (!Number.isInteger(codPro) || codPro <= 0) return noDisponible(404);

  return inmueblesService.getDatosPropiedad(codPro).pipe(
    map((respuesta: any) => {
      if (!respuesta?.data?.codpro) throw new HttpErrorResponse({ status: 404 });
      return respuesta;
    }),
    switchMap((respuesta: any) => {
      // Dirección antigua, o texto de la dirección desactualizado: se envía a la oficial.
      const rutaOficial = rutaFicha(respuesta.data);
      if (vistaReducida || rutaActual === rutaOficial) return of(respuesta);
      // En el servidor basta con responder la redirección 301; en el navegador se reemplaza la dirección.
      if (!seo.redirigirA(rutaOficial)) {
        router.navigateByUrl(router.createUrlTree([rutaOficial], { queryParams: route.queryParams }), { replaceUrl: true });
      }
      return EMPTY;
    }),
    catchError((error) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);
      // 400/404: el inmueble no existe. Cualquier otro fallo (API caída, 5xx) se trata como temporal
      // para que los buscadores no eliminen fichas válidas por una caída del backend.
      return noDisponible(error.status === 404 || error.status === 400 ? 404 : 503);
    })
  );
};
