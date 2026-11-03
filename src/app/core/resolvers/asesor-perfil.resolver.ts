import { ResolveFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { EMPTY, of } from 'rxjs';
import { DataasesoresService } from '../dataAsesores/dataasesores.service';
import { SeoService } from '../seo/seo.service';

/** Asesor de la página compartible /asesor/:slug. Solo existen los del equipo. */
export const asesorPerfilResolver: ResolveFn<any> = (route) => {
  const asesor = inject(DataasesoresService).getAsesorBySlug(route.paramMap.get('slug') || '');
  if (asesor) return of(asesor);

  // Muestra la página "no encontrada" sin cambiar la dirección del navegador.
  inject(SeoService).responderCon(404);
  inject(Router).navigate(['/no-encontrado'], { skipLocationChange: true });
  return EMPTY;
};
