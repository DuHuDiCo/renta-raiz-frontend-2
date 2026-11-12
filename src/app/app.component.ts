  import { isPlatformBrowser } from '@angular/common';
  import { registrarCampana } from './core/config/campana';
  import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
  import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, ResolveEnd, Router, RouterOutlet } from '@angular/router';
  // Solo los dos componentes de Flowbite que usa el sitio (data-carousel y data-drawer):
  // importar 'flowbite' entero trae también datepicker, popper y el resto.
  import { initCarousels } from 'flowbite/lib/esm/components/carousel';
  import { initDrawers } from 'flowbite/lib/esm/components/drawer';
  import { NgxUiLoaderModule, NgxUiLoaderService } from 'ngx-ui-loader';

  import { filter } from 'rxjs/operators';
  import { SEO_AGENCIA, SEO_POR_DEFECTO, SEO_SITIO_WEB, SeoService } from './core/seo/seo.service';
  import { seoInmuebleRetirado } from './shared/inmueble-retirado/inmueble-retirado.component';
  import { AsistenteChatComponent } from './shared/asistente-chat/asistente-chat.component';

  declare let fbq: Function; // Importante para que TypeScript no dé error

  @Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, NgxUiLoaderModule, AsistenteChatComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
  })
  export class AppComponent implements OnInit {

    platformId = inject(PLATFORM_ID);
    private seo = inject(SeoService);

    constructor(private router: Router, private loaderService: NgxUiLoaderService) {
      // Corre también en SSR: los buscadores leen el título y la descripción del HTML del servidor.
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe(() => this.aplicarSeoDeRuta());

      // this.router.events.pipe(
      //   // Filtramos los eventos que nos interesan
      //   filter(event =>
      //     event instanceof NavigationStart ||
      //     event instanceof ResolveEnd ||
      //     event instanceof NavigationError ||
      //     event instanceof NavigationCancel
      //   )
      // ).subscribe(event => {
      //   if (event instanceof NavigationStart) {
      //     // Al comenzar cualquier navegación, mostramos el loader
      //     this.loaderService.start();
      //     return;
      //   }

      //   // Al terminar la navegación (ya sea con éxito, error o cancelación), lo ocultamos
      //   this.loaderService.stop();
      // });
    }

    

    /** Aplica el SEO definido en `data.seo` de la ruta activa. Las rutas con `seoDinamico` lo arman en su componente. */
    private aplicarSeoDeRuta() {
      let ruta = this.router.routerState.snapshot.root;
      while (ruta.firstChild) ruta = ruta.firstChild;
      if (ruta.data['seoDinamico']) return;

      // Ficha de un inmueble retirado (propiedad.resolver): su propio título, descripción e imagen para compartir.
      const retirado = this.router.lastSuccessfulNavigation?.extras.state?.['retirado'];
      if (retirado?.slug) {
        this.seo.actualizar(seoInmuebleRetirado(retirado.slug, retirado.params));
        return;
      }

      const url = this.router.url.split(/[?#]/)[0];
      this.seo.actualizar({
        ...SEO_POR_DEFECTO,
        ...ruta.data['seo'],
        ruta: url,
        // Los datos de la empresa solo van en el inicio; el resto de páginas la referencian por su @id.
        datosEstructurados: url === '/' ? [SEO_AGENCIA, SEO_SITIO_WEB] : undefined,
      });
    }

    ngOnInit(): void {
      // Todo lo de aquí usa APIs del navegador (window, localStorage, fbq) que no existen en SSR.
      if (!isPlatformBrowser(this.platformId)) return;

      const iniciarFlowbite = () => {
        initCarousels();
        initDrawers();
      };
      iniciarFlowbite();

      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          setTimeout(iniciarFlowbite, 100);
        }
      });



      this.router.events
        .pipe(filter((event: any) => event instanceof NavigationEnd))
        .subscribe(() => {
          fbq('track', 'PageView'); // ← Aquí disparas el evento de página vista
        });


      // Atribución de campaña: se guarda al llegar con utm_*/fbclid y vence a los 30 días. Ya no se vuelve a
      // pegar en la dirección de cada página (ver core/config/campana.ts).
      this.router.events
        .pipe(filter((event: any) => event instanceof NavigationEnd))
        .subscribe(() => registrarCampana(new URL(window.location.href), localStorage));
    }
  }
