import { Routes } from '@angular/router';
import { PageNotFoundComponent } from './shared/page-not-found/page-not-found.component';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./Pages/Inicio/inicio.routes').then((m) => m.routes),
  },

  {
    path: '**',
    component: PageNotFoundComponent,
    data: {
      seo: {
        titulo: 'Página no encontrada | Renta Raíz',
        descripcion: 'La página que buscas no existe o fue movida. Vuelve al inicio para seguir explorando inmuebles con Renta Raíz.',
        noindex: true,
      },
    },
  },

];
