import { Component, inject, Inject, OnInit } from '@angular/core';
import { NavbarComponent } from '../../../../shared/navbar/navbar.component';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InmueblesService } from '../../../../core/Inmuebles/inmuebles.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FooterComponent } from '../../../../shared/footer/footer.component';
import { BotonesFlotantesComponent } from '../../../../shared/botones-flotantes/botones-flotantes.component';
import { BarraFiltrosComponent } from '../../../../shared/barra-filtros/barra-filtros.component';
import { VolverComponent } from '../../../../shared/volver/volver.component';
import { SEO_DOMINIO, SEO_REF_AGENCIA, SEO_SUFIJO, seoMigas, SeoService } from '../../../../core/seo/seo.service';

@Component({
  selector: 'app-ver-blog',
  standalone: true,
  imports: [
    RouterLink,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NavbarComponent,
    FooterComponent,
    BotonesFlotantesComponent,
    BarraFiltrosComponent,
    VolverComponent,
  ],
  templateUrl: './ver-blog.component.html',
  styleUrl: './ver-blog.component.scss',
})
export class VerBlogComponent implements OnInit {
  blogId: string = '';

  elementsPerPage = 12;

  blog1: string =
    'medellin-brilla-en-los-stella-awards-2025-la-ciudad-que-enamora-al-mundo-y-se-vuelve-epicentro-de-inversion-inmobiliaria';

  blog2: string =
    'medellin-el-nuevo-epicentro-del-lujo-en-america-latina-para-invertir-rentar-o-comprar-propiedades-exclusivas';

  blog3: string =
    'por-que-medellin-se-ha-convertido-en-el-lugar-ideal-para-vivir-e-invertir-en-tiempos-de-cambio';

  blog4: string =
    'quien-toma-realmente-las-decisiones-sobre-un-inmueble-rentado-el-propietario-o-la-inmobiliaria';
  inmueblesDestacadosArray: any = {};

  router = inject(Router);
  route = inject(ActivatedRoute);
  formBuilder = inject(FormBuilder);
  inmueblesService = inject(InmueblesService);
  seo = inject(SeoService);

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
    this.getDatos();
    this.route.params.subscribe((params) => {
      this.blogId = params['id'];
      this.actualizarSeo();
    });
  }

  private actualizarSeo() {
    const articulos: { [id: string]: { titulo: string; descripcion: string; imagen: string; fecha?: string } } = {
      [this.blog1]: {
        titulo: 'Medellín brilla en los Stella Awards 2025',
        descripcion:
          'Medellín fue reconocida en los Stella Awards 2025. Conoce por qué la ciudad enamora al mundo y se consolida como epicentro de inversión inmobiliaria.',
        imagen: 'blog-1.jpg',
        fecha: '2024-04-24',
      },
      [this.blog2]: {
        titulo: 'Medellín, epicentro del lujo en América Latina',
        descripcion:
          'Por qué Medellín se posiciona como el nuevo epicentro del lujo en América Latina para invertir, rentar o comprar propiedades exclusivas.',
        imagen: 'blog-2.jpg',
      },
      [this.blog3]: {
        titulo: '¿Por qué Medellín es ideal para vivir e invertir?',
        descripcion:
          'Las razones por las que Medellín se ha convertido en el lugar ideal para vivir e invertir en finca raíz en tiempos de cambio.',
        imagen: 'blog-3.jpg',
      },
      [this.blog4]: {
        titulo: '¿Quién decide sobre un inmueble rentado?',
        descripcion:
          '¿El propietario o la inmobiliaria? Te explicamos quién toma realmente las decisiones sobre un inmueble arrendado y qué le corresponde a cada uno.',
        imagen: 'blog-4.jpg',
        fecha: '2026-06-17',
      },
    };
    const articulo = articulos[this.blogId];
    if (!articulo) this.seo.responderCon(404);
    const ruta = `/ver-blog/${this.blogId}`;
    const imagen = articulo ? `${SEO_DOMINIO}/assets/images/${articulo.imagen}` : undefined;

    this.seo.actualizar({
      titulo: `${articulo?.titulo || 'Artículo no encontrado'}${SEO_SUFIJO}`,
      descripcion: articulo?.descripcion || 'El artículo que buscas no existe o fue movido. Visita el blog de Renta Raíz.',
      ruta,
      imagen,
      precarga: '/assets/images/Noticias-fondo.png',
      tipo: articulo ? 'article' : 'website',
      noindex: !articulo,
      datosEstructurados: articulo
        ? [
            {
              '@type': 'BlogPosting',
              '@id': `${SEO_DOMINIO}${ruta}`,
              mainEntityOfPage: `${SEO_DOMINIO}${ruta}`,
              headline: articulo.titulo,
              description: articulo.descripcion,
              image: imagen,
              inLanguage: 'es-CO',
              ...(articulo.fecha ? { datePublished: articulo.fecha } : {}),
              author: SEO_REF_AGENCIA,
              publisher: SEO_REF_AGENCIA,
            },
            seoMigas([['Inicio', '/'], ['Blog', '/blogs'], [articulo.titulo, ruta]]),
          ]
        : undefined,
    });
  }

  getDatos() {
    this.getInmueblesDestacados();
  }

  getInmueblesDestacados() {
    this.inmueblesDestacadosArray = this.route.snapshot.data['blogs'].data.slice(2, 5);

   
  }

}
