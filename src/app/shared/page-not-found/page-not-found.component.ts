import { afterNextRender, Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';

@Component({
  selector: 'app-page-not-found',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './page-not-found.component.html',
  styleUrl: './page-not-found.component.scss',
})
export class PageNotFoundComponent {
  /**
   * El resolver manda `codigo: 503` cuando el backend falló (la página sí existe): se avisa que es temporal y se
   * responde 503 para que los buscadores no la borren. Sin código es una dirección que no existe: 404.
   */
  readonly temporal = inject(Router).getCurrentNavigation()?.extras.state?.['codigo'] === 503;

  constructor() {
    inject(SeoService).responderCon(this.temporal ? 503 : 404);
    // El SEO de la ruta pone "Página no encontrada" al terminar la navegación; en el caso temporal se corrige después.
    const titulo = inject(Title);
    afterNextRender(() => {
      if (this.temporal) titulo.setTitle('No pudimos cargar esta página | Renta Raíz');
    });
  }

  /** La dirección del navegador sigue siendo la original (skipLocationChange): recargar vuelve a intentarlo. */
  reintentar(): void {
    window.location.reload();
  }
}
