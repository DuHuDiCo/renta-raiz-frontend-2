import { ResolveFn } from '@angular/router';
import { InmueblesService } from '../Inmuebles/inmuebles.service';
import { inject } from '@angular/core';
import { catchError, of } from 'rxjs';

export const blogsResolver: ResolveFn<any> = (route, state) => {

   const inmueblesService = inject(InmueblesService);
   const id = route.paramMap.get('id');
   
   // Los destacados son un complemento: si la API falla, el artículo se muestra sin ellos.
   return inmueblesService.getInmueblesDestacados(1).pipe(catchError(() => of({ data: [] })));

};
