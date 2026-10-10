import { ResolveFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { EMPTY, catchError, of, switchMap } from 'rxjs';
import { DataasesoresService } from '../dataAsesores/dataasesores.service';
import { InmueblesService } from '../Inmuebles/inmuebles.service';
import { SeoService } from '../seo/seo.service';

/**
 * Asesor del portafolio. Devuelve null cuando el código no está en la lista del equipo pero sí tiene inmuebles
 * (las fichas enlazan al portafolio de cualquier asesor de la API). Sin inmuebles, el portafolio no existe.
 */
export const asesorResolver: ResolveFn<any> = (route) => {
  const router = inject(Router);
  const seo = inject(SeoService);

  // Muestra la página "no encontrada" sin cambiar la dirección del navegador.
  const noDisponible = (codigo: number) => {
    seo.responderCon(codigo);
    router.navigate(['/no-encontrado'], { skipLocationChange: true });
    return EMPTY;
  };

  const id = Number(route.paramMap.get('asesor'));
  if (!Number.isInteger(id) || id <= 0) return noDisponible(404);

  const asesor = inject(DataasesoresService).getAsesorById(id);
  if (asesor) return of(asesor);

  return inject(InmueblesService)
    .getFiltrosEnviar({ broker: id, page: 1 }, 1)
    .pipe(
      // Un fallo de la API se trata como temporal; solo la respuesta vacía significa que no existe.
      catchError(() => of(undefined)),
      switchMap((respuesta: any) => {
        if (respuesta === undefined) return noDisponible(503);
        return respuesta?.data?.length ? of(null) : noDisponible(404);
      })
    );
};
