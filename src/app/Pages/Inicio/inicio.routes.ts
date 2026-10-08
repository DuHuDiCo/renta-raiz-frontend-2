import { Routes } from '@angular/router';
import { VistaInicialComponent } from './Components/vista-inicial/vista-inicial.component';

import { FiltrosComponent } from './Components/filtros/filtros.component';
import { ContactanosComponent } from './Components/contactanos/contactanos.component';
import { VerPropiedadComponent } from './Components/ver-propiedad/ver-propiedad.component';
import { NuestroEquipoComponent } from './Components/nuestro-equipo/nuestro-equipo.component';
import { QuienesSomosComponent } from './Components/quienes-somos/quienes-somos.component';
import { MapaComponent } from './Components/mapa/mapa.component';
import { BlogsComponent } from './Components/blogs/blogs.component';
import { VerBlogComponent } from './Components/ver-blog/ver-blog.component';
import { PublicarInmuebleComponent } from './Components/publicar-inmueble/publicar-inmueble.component';
import { PoliticarPrivacidadComponent } from './Components/politicar-privacidad/politicar-privacidad.component';
import { AvaluosComercialesComponent } from './Components/avaluos-comerciales/avaluos-comerciales.component';
import { EnvioExitosoComponent } from '../../shared/envio-exitoso/envio-exitoso.component';
import { propiedadResolver } from '../../core/resolvers/propiedad.resolver';
import { blogsResolver } from '../../core/resolvers/blogs.resolver';
import { PoliticaAcosoComponent } from './Components/politica-acoso/politica-acoso.component';
import { PortafolioAsesoresComponent } from './Components/portafolio-asesores/portafolio-asesores.component';
import { PrioritariosComponent } from '../Prioritarios/Components/prioritarios/prioritarios.component';

export const routes: Routes = [


  {
    path: '',
    children: [
      {
        path: '',
        component: VistaInicialComponent,
        data: {
          seo: {
            precarga: '/assets/images/vistaInicial-slider-1.png',
            titulo: 'Renta Raíz | Inmobiliaria en Medellín y el Valle de Aburrá',
            descripcion:
              'Apartamentos, casas, oficinas y locales para arrendar o comprar en Medellín, Envigado, Sabaneta, Itagüí y el Oriente antioqueño. Asesoría experta.',
          },
        },
      },

      {
        path: 'filtros',
        component: FiltrosComponent,
        data: {
          seo: {
            titulo: 'Inmuebles en arriendo y venta en Medellín y Envigado | Renta Raíz',
            descripcion:
              'Busca inmuebles en arriendo y venta en Medellín, Envigado, Sabaneta, Itagüí y Rionegro: filtra por ciudad, barrio, tipo y precio con Renta Raíz.',
          },
        },
      },
      {
        path: 'filtros/:tipo',
        component: FiltrosComponent,
        data: {
          seo: {
            titulo: 'Inmuebles en arriendo y venta en Medellín y Envigado | Renta Raíz',
            descripcion:
              'Busca inmuebles en arriendo y venta en Medellín, Envigado, Sabaneta, Itagüí y Rionegro: filtra por ciudad, barrio, tipo y precio con Renta Raíz.',
          },
        },
      },
      {
        path: 'contacto',
        component: ContactanosComponent,
        data: {
          seo: {
            precarga: '/assets/images/SLIDERCONTACTANOS.png',
            titulo: 'Contáctanos | Renta Raíz',
            descripcion:
              '¿Quieres arrendar, comprar o vender un inmueble en Medellín, Envigado o el Oriente antioqueño? Escríbenos y un asesor de Renta Raíz te acompañará.',
          },
        },
      },
      {
        path: 'ver-propiedad/:codpro/:ocultarContenido',
        component: VerPropiedadComponent,
        // El componente arma el SEO con los datos que carga.
        data: { seoDinamico: true },
        resolve: { propiedad: propiedadResolver }
      },

      {
        path: 'nuestro-equipo',
        component: NuestroEquipoComponent,
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
        component: QuienesSomosComponent,
        data: {
          seo: {
            precarga: '/assets/images/SliderQUIENESOMOS.png',
            titulo: 'Quiénes somos | Renta Raíz',
            descripcion:
              'Conoce a Renta Raíz, inmobiliaria en Medellín, el Valle de Aburrá y el Oriente antioqueño especializada en arriendo, venta y administración de inmuebles.',
          },
        },
      },
      {
        path: 'mapa',
        component: MapaComponent,
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
        component: BlogsComponent,
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
        component: VerBlogComponent,
        // El componente arma el SEO con los datos que carga.
        data: { seoDinamico: true },
        resolve: { blogs: blogsResolver }
      },
      {
        path: 'publicar-inmueble',
        component: PublicarInmuebleComponent,
        data: {
          seo: {
            precarga: '/assets/images/SLIDERPUBLICATUPROPIEDAD.png',
            titulo: 'Publica tu inmueble para arriendo o venta | Renta Raíz',
            descripcion:
              'Consigna tu inmueble con Renta Raíz: lo promocionamos, encontramos al cliente ideal y te acompañamos en el arriendo o la venta.',
          },
        },
      },
      {
        path: 'politicas-de-privacidad',
        component: PoliticarPrivacidadComponent,
        data: {
          seo: {
            precarga: '/assets/images/SLIDERPOLITICAS.png',
            titulo: 'Política de privacidad | Renta Raíz',
            descripcion:
              'Consulta la política de privacidad y de tratamiento de datos personales de Renta Raíz Soluciones Inmobiliarias.',
          },
        },
      },
      {
        path: 'politicas-de-acoso-sexual',
        component: PoliticaAcosoComponent,
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
        component: AvaluosComercialesComponent,
        data: {
          seo: {
            precarga: '/assets/images/SliderAVALUOS.png',
            titulo: 'Avalúos comerciales en Medellín y el Valle de Aburrá | Renta Raíz',
            descripcion:
              'Conoce el valor real de tu inmueble con un avalúo comercial de Renta Raíz, realizado por expertos del mercado inmobiliario de Medellín y el Valle de Aburrá.',
          },
        },
      },
      {
        path: 'formulario-enviado-con-exito',
        component: EnvioExitosoComponent,
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
        component: PortafolioAsesoresComponent,
        // El componente arma el SEO con los datos que carga.
        data: { seoDinamico: true },
      }
      ,
      {
        path: 'prioritarios',
        component: PrioritariosComponent,
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

