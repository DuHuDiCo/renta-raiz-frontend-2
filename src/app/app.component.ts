  import { isPlatformBrowser } from '@angular/common';
  import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
  import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, ResolveEnd, Router, RouterOutlet } from '@angular/router';
  import { initFlowbite } from 'flowbite';
  import { NgxUiLoaderModule, NgxUiLoaderService } from 'ngx-ui-loader';

  import { filter } from 'rxjs/operators';
  import { SEO_AGENCIA, SEO_POR_DEFECTO, SEO_SITIO_WEB, SeoService } from './core/seo/seo.service';

  declare let fbq: Function; // Importante para que TypeScript no dé error

  @Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, NgxUiLoaderModule],
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

      initFlowbite();

      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          setTimeout(() => {
            initFlowbite();
          }, 100);
        }
      });



      this.router.events
        .pipe(filter((event: any) => event instanceof NavigationEnd))
        .subscribe(() => {
          fbq('track', 'PageView'); // ← Aquí disparas el evento de página vista
        });


      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          const url = new URL(window.location.href);

          // Paso 1: guardar en localStorage si están en la URL
          const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'fbclid'];

          let updated = false;

          utmParams.forEach(param => {
            const value = url.searchParams.get(param);
            if (value) {
              localStorage.setItem(param, value);
            }
          });

          // Paso 2: agregar desde localStorage si faltan en la URL
          utmParams.forEach(param => {
            const localValue = localStorage.getItem(param);
            if (localValue && !url.searchParams.has(param)) {
              url.searchParams.set(param, localValue);
              updated = true;
            }
          });

          if (updated) {
            window.history.replaceState(
              window.history.state,
              '',
              url.toString()
            );
          }
        }
      });
    }
  }
