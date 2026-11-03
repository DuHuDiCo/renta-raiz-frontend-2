import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InmueblesService } from '../../../../core/Inmuebles/inmuebles.service';
import { SEO_DOMINIO, SEO_REF_AGENCIA, SEO_SUFIJO, seoMigas, SeoService } from '../../../../core/seo/seo.service';
import { CompartirInmuebleComponent } from '../../../../shared/compartir-inmueble/compartir-inmueble.component';

/**
 * Tarjeta digital del asesor (/asesor/:slug): la página que se comparte por WhatsApp o redes,
 * con accesos directos para escribirle, ver su portafolio, consignar y guardar su contacto.
 */
@Component({
  selector: 'app-perfil-asesor',
  standalone: true,
  imports: [RouterLink, CompartirInmuebleComponent],
  templateUrl: './perfil-asesor.component.html',
})
export class PerfilAsesorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private seo = inject(SeoService);
  private inmueblesService = inject(InmueblesService);

  asesor: any = this.route.snapshot.data['asesor'];
  totalInmuebles: number | null = null;

  get url(): string {
    return `${SEO_DOMINIO}/asesor/${this.asesor.slug}`;
  }

  /** Teléfono con indicativo de Colombia y sin espacios: 573012050207. */
  get telefono(): string {
    return `57${this.asesor.telefono.replace(/\D/g, '')}`;
  }

  get enlaceWhatsapp(): string {
    const saludo = `Hola ${this.asesor.nombre.split(' ')[0]}, vi tu perfil en Renta Raíz y quiero más información.`;
    return `https://wa.me/${this.telefono}?text=${encodeURIComponent(saludo)}`;
  }

  get mensajeCompartir(): string {
    return `Te comparto el contacto de ${this.asesor.nombre}, ${this.asesor.cargo} de Renta Raíz:`;
  }

  ngOnInit(): void {
    const { nombre, cargo, slug } = this.asesor;
    const imagen = this.asesor.imagenCompartir || this.asesor.avatar;
    this.seo.actualizar({
      titulo: `${nombre}, ${cargo}${SEO_SUFIJO}`,
      descripcion: `Habla con ${nombre}, ${cargo} de Renta Raíz. Te acompaña a arrendar, comprar o vender tu inmueble en Medellín y el Valle de Aburrá.`,
      ruta: `/asesor/${slug}`,
      imagen: `${SEO_DOMINIO}/${imagen}`,
      precarga: `/${this.asesor.avatar}`,
      datosEstructurados: [
        {
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: nombre,
          jobTitle: cargo,
          telephone: `+${this.telefono}`,
          email: this.asesor.email,
          image: `${SEO_DOMINIO}/${imagen}`,
          url: this.url,
          worksFor: SEO_REF_AGENCIA,
          sameAs: [this.asesor.facebook, this.asesor.instagram, this.asesor.tiktok].filter(Boolean),
        },
        seoMigas([['Inicio', '/'], ['Nuestro equipo', '/nuestro-equipo'], [nombre, `/asesor/${slug}`]]),
      ],
    });

    this.inmueblesService.getFiltrosEnviar({ broker: this.asesor.id, page: 1 }, 1).subscribe({
      next: (respuesta: any) => (this.totalInmuebles = Number(respuesta?.total) || null),
      // Sin el dato, la cifra simplemente no se muestra.
      error: () => (this.totalInmuebles = null),
    });
  }

  /** Descarga una tarjeta de contacto (vCard) que el celular agrega a la agenda. */
  guardarContacto(): void {
    const [nombre, ...apellidos] = this.asesor.nombre.split(' ');
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${apellidos.join(' ')};${nombre};;;`,
      `FN:${this.asesor.nombre}`,
      'ORG:Renta Raíz',
      `TITLE:${this.asesor.cargo}`,
      `TEL;TYPE=CELL:+${this.telefono}`,
      `EMAIL:${this.asesor.email}`,
      `URL:${this.url}`,
      'END:VCARD',
    ].join('\r\n');

    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(new Blob([vcard], { type: 'text/vcard;charset=utf-8' }));
    enlace.download = `${this.asesor.slug}.vcf`;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
    this.registrar('guardar_contacto');
  }

  /** Evento para Google Tag Manager. */
  registrar(accion: string): void {
    const capa = ((window as any).dataLayer = (window as any).dataLayer || []);
    capa.push({ event: 'perfil_asesor', accion, asesor: this.asesor.slug });
  }
}
