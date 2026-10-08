import { ResolveFn, Router } from '@angular/router';
import { InmueblesService } from '../Inmuebles/inmuebles.service';
import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, catchError, map, throwError } from 'rxjs';
import { SeoService } from '../seo/seo.service';

export const propiedadResolver: ResolveFn<any> = (route, state) => {
  const inmueblesService = inject(InmueblesService);
  const router = inject(Router);
  const seo = inject(SeoService);
  const codPro = Number(route.paramMap.get('codpro'));

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
    catchError((error) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);
      // 400/404: el inmueble no existe. Cualquier otro fallo (API caída, 5xx) se trata como temporal
      // para que los buscadores no eliminen fichas válidas por una caída del backend.
      return noDisponible(error.status === 404 || error.status === 400 ? 404 : 503);
    })
  );
};
