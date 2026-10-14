import { Routes } from '@angular/router';
import { SLIDER_PRECARGA } from './Components/vista-inicial/slider-inicio';

import { propiedadResolver } from '../../core/resolvers/propiedad.resolver';
import { blogsResolver } from '../../core/resolvers/blogs.resolver';
import { listadoMatcher, listadoResolver } from '../../core/resolvers/listado.resolver';
import { asesorResolver } from '../../core/resolvers/asesor.resolver';

export const routes: Routes = [


  {
    path: '',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./Components/vista-inicial/vista-inicial.component').then((m) => m.VistaInicialComponent),
        data: {
          seo: {
            precarga: SLIDER_PRECARGA,
            titulo: 'Renta Raíz | Inmobiliaria en Medellín y el Valle de Aburrá',
            descripcion:
              'Apartamentos, casas, oficinas y locales para arrendar o comprar en Medellín, Envigado, Sabaneta, Itagüí y el Oriente antioqueño. Asesoría experta.',
          },
        },
      },

      {
        path: 'filtros',
        loadComponent: () =>
          import('./Components/filtros/filtros.component').then((m) => m.FiltrosComponent),
        data: {
          seo: {
            titulo: 'Inmuebles en arriendo y venta en Medellín y Envigado | Renta Raíz',
            descripcion:
              'Busca inmuebles en arriendo y venta en Medellín, Envigado, Sabaneta, Itagüí y Rionegro: filtra por ciudad, barrio, tipo y precio con Renta Raíz.',
          },
        },
      },
      {
        // Listados con URL propia: /arriendo, /venta/casas, /arriendo/apartamentos/medellin/el-poblado
        matcher: listadoMatcher,
        loadComponent: () =>
          import('./Components/filtros/filtros.component').then((m) => m.FiltrosComponent),
        // El componente arma el SEO con los datos que carga.
        data: { seoDinamico: true },
        resolve: { listado: listadoResolver },
        runGuardsAndResolvers: 'paramsOrQueryParamsChange',
      },
      {
        path: 'contacto',
        loadComponent: () =>
          import('./Components/contactanos/contactanos.component').then((m) => m.ContactanosComponent),
        data: {
          seo: {
            precarga: '/assets/images/SLIDERCONTACTANOS.webp',
            titulo: 'Contáctanos | Renta Raíz',
            descripcion:
              '¿Quieres arrendar, comprar o vender un inmueble en Medellín, Envigado o el Oriente antioqueño? Escríbenos y un asesor de Renta Raíz te acompañará.',
          },
        },
      },
      {
        // Ficha del inmueble: /inmueble/apartamento-arriendo-el-poblado-medellin-7434
        path: 'inmueble/:slug',
        loadComponent: () =>
          import('./Components/ver-propiedad/ver-propiedad.component').then((m) => m.VerPropiedadComponent),
        // El componente arma el SEO con los datos que carga.
        data: { seoDinamico: true },
        resolve: { propiedad: propiedadResolver }
      },
      {
        // Dirección antigua: /0 redirige a la ficha; /1 es la vista reducida que usa Prioritarios.
        path: 'ver-propiedad/:codpro/:ocultarContenido',
        loadComponent: () =>
          import('./Components/ver-propiedad/ver-propiedad.component').then((m) => m.VerPropiedadComponent),
        // El componente arma el SEO con los datos que carga.
        data: { seoDinamico: true },
        resolve: { propiedad: propiedadResolver }
      },

      {
        path: 'nuestro-equipo',
        loadComponent: () =>
          import('./Components/nuestro-equipo/nuestro-equipo.component').then((m) => m.NuestroEquipoComponent),
        data: {
          seo: {
            precarga: '/assets/images/equipo-expertos.jpg',
            titulo: 'Nuestro equipo de asesores inmobiliarios | Renta Raíz',
            descripcion:
              'Conoce a los asesores inmobiliarios de Renta Raíz: un equipo experto que te acompaña a arrendar, comprar o vender tu inmueble en Medellín y el Valle de Aburrá.',
          },
        },
      },
      {
        path: 'quienes-somos',
        loadComponent: () =>
          import('./Components/quienes-somos/quienes-somos.component').then((m) => m.QuienesSomosComponent),
        data: {
          seo: {
            precarga: '/assets/images/SliderQUIENESOMOS.webp',
            titulo: 'Quiénes somos | Renta Raíz',
            descripcion:
              'Conoce a Renta Raíz, inmobiliaria en Medellín, el Valle de Aburrá y el Oriente antioqueño especializada en arriendo, venta y administración de inmuebles.',
          },
        },
      },
      {
        path: 'mapa',
        loadComponent: () =>
          import('./Components/mapa/mapa.component').then((m) => m.MapaComponent),
        data: {
          seo: {
            titulo: 'Mapa de inmuebles | Renta Raíz',
            descripcion:
              'Explora en el mapa los inmuebles disponibles en arriendo y venta con Renta Raíz.',
            noindex: true,
          },
        },
      },
      {
        path: 'blogs',
        loadComponent: () =>
          import('./Components/blogs/blogs.component').then((m) => m.BlogsComponent),
        data: {
          seo: {
            precarga: '/assets/images/noticias.png',
            titulo: 'Blog inmobiliario: noticias y consejos | Renta Raíz',
            descripcion:
              'Noticias, tendencias y consejos del sector inmobiliario en Medellín y Antioquia para arrendar, comprar, vender o invertir con mejor información.',
          },
        },
      },
      {
        path: 'ver-blog/:id',
        loadComponent: () =>
          import('./Components/ver-blog/ver-blog.component').then((m) => m.VerBlogComponent),
        // El componente arma el SEO con los datos que carga.
        data: { seoDinamico: true },
        resolve: { blogs: blogsResolver }
      },
      {
        path: 'publicar-inmueble',
        loadComponent: () =>
          import('./Components/publicar-inmueble/publicar-inmueble.component').then((m) => m.PublicarInmuebleComponent),
        data: {
          seo: {
            precarga: '/assets/images/SLIDERPUBLICATUPROPIEDAD.webp',
            titulo: 'Publica tu inmueble para arriendo o venta | Renta Raíz',
            descripcion:
              'Consigna tu inmueble con Renta Raíz: lo promocionamos, encontramos al cliente ideal y te acompañamos en el arriendo o la venta.',
          },
        },
      },
      {
        path: 'politicas-de-privacidad',
        loadComponent: () =>
          import('./Components/politicar-privacidad/politicar-privacidad.component').then((m) => m.PoliticarPrivacidadComponent),
        data: {
          seo: {
            precarga: '/assets/images/SLIDERPOLITICAS.webp',
            titulo: 'Política de privacidad | Renta Raíz',
            descripcion:
              'Consulta la política de privacidad y de tratamiento de datos personales de Renta Raíz Soluciones Inmobiliarias.',
          },
        },
      },
      {
        path: 'politicas-de-acoso-sexual',
        loadComponent: () =>
          import('./Components/politica-acoso/politica-acoso.component').then((m) => m.PoliticaAcosoComponent),
        data: {
          seo: {
            titulo: 'Política de prevención del acoso sexual | Renta Raíz',
            descripcion:
              'Consulta la política de prevención y atención del acoso sexual de Renta Raíz Soluciones Inmobiliarias.',
          },
        },
      },
      {
        path: 'avaluos-comerciales',
        loadComponent: () =>
          import('./Components/avaluos-comerciales/avaluos-comerciales.component').then((m) => m.AvaluosComercialesComponent),
        data: {
          seo: {
            precarga: '/assets/images/SliderAVALUOS.webp',
            titulo: 'Avalúos comerciales en Medellín y el Valle de Aburrá | Renta Raíz',
            descripcion:
              'Conoce el valor real de tu inmueble con un avalúo comercial de Renta Raíz, realizado por expertos del mercado inmobiliario de Medellín y el Valle de Aburrá.',
          },
        },
      },
      {
        path: 'formulario-enviado-con-exito',
        loadComponent: () =>
          import('../../shared/envio-exitoso/envio-exitoso.component').then((m) => m.EnvioExitosoComponent),
        data: {
          seo: {
            titulo: 'Formulario enviado | Renta Raíz',
            descripcion:
              'Recibimos tus datos. Un asesor de Renta Raíz se pondrá en contacto contigo.',
            noindex: true,
          },
        },
      }
      ,
      {
        path: 'portafolio/:asesor',
        loadComponent: () =>
          import('./Components/portafolio-asesores/portafolio-asesores.component').then((m) => m.PortafolioAsesoresComponent),
        // El componente arma el SEO con los datos que carga.
        data: { seoDinamico: true },
        resolve: { asesor: asesorResolver },
      }
      ,
      {
        path: 'prioritarios',
        loadComponent: () =>
          import('../Prioritarios/Components/prioritarios/prioritarios.component').then((m) => m.PrioritariosComponent),
        data: {
          seo: {
            titulo: 'Inmuebles prioritarios | Renta Raíz',
            descripcion:
              'Selección de inmuebles prioritarios en arriendo y venta de Renta Raíz en Medellín, el Valle de Aburrá y el Oriente antioqueño.',
            noindex: true,
          },
        },
      }
    ]
  },
];

