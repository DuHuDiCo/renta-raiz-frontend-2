import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { InmueblesService } from '../../../../../core/Inmuebles/inmuebles.service';
import { ResumenInmueble, resumenInmueble } from '../../../../../core/listados/listados';
import { SEO_DOMINIO } from '../../../../../core/seo/seo.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../../../../environments/environment';

/** Formulario de LeadConnector por defecto y el de las visitas que llegan de Meta Ads (como era antes del propio). */
const FORMULARIO_EXTERNO = 'https://api.leadconnectorhq.com/widget/form/9SRYMPh2FynzdxY045gg';
const FORMULARIO_EXTERNO_META = 'https://api.leadconnectorhq.com/widget/form/LArCYkvLIbfXbvaQMJ4Q';
/** Inmuebles que tenían un formulario de LeadConnector propio. */
const FORMULARIOS_POR_INMUEBLE: Record<number, { formId: string; nombre: string; alto: number }> = {
  5975: { formId: 'DBQBxa2NZQgSAYMiukLJ', nombre: 'Propiedad código 5975', alto: 401 },
  2531: { formId: 'M1injuZo8jl0AFnLbjzu', nombre: 'Propiedad código 2531', alto: 401 },
  5970: { formId: 'XeOz8uDX43OxILBxg74S', nombre: 'Propiedad código 5970', alto: 401 },
  2411: { formId: '5CmVcLxMiLpUTEImetKC', nombre: 'Propiedad código 2411', alto: 401 },
  5689: { formId: 'tanbgyswwkJ82IjFdrwz', nombre: 'Lote en las Palmas (Yeferson Cossio)', alto: 402 },
  5024: { formId: '1H6XwJGDZfAL1YuEcp0d', nombre: 'Propiedad código 5024', alto: 401 },
};

type Accion = 'whatsapp' | 'email';
type TipoNegocio = 'arriendo' | 'compra';
type Estado = 'formulario' | 'enviando' | 'exito' | 'error';

/** Número de WhatsApp comercial al que se redirige tras enviar el formulario (solo dígitos, con indicativo). */
const WHATSAPP_COMERCIAL = '15556503779';

@Component({
  selector: 'app-modal-crear-contacto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-crear-contacto.component.html',
  styleUrl: './modal-crear-contacto.component.scss',
})
export class ModalCrearContactoComponent {
  private fb = inject(NonNullableFormBuilder);
  private inmuebleService = inject(InmueblesService);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);

  /** false: se muestra el formulario externo de LeadConnector en lugar del propio (environment.contactoPropio). */
  readonly contactoPropio = environment.contactoPropio;
  iframeSrc: SafeResourceUrl | null = null;
  iframeId = '';
  iframeTitulo = '';
  iframeAlto = 600;

  readonly indicativos = [
    { codigo: '57', pais: 'Colombia', iso: 'CO' },
    { codigo: '1', pais: 'Estados Unidos / Canadá', iso: 'US' },
    { codigo: '52', pais: 'México', iso: 'MX' },
    { codigo: '34', pais: 'España', iso: 'ES' },
    { codigo: '507', pais: 'Panamá', iso: 'PA' },
    { codigo: '593', pais: 'Ecuador', iso: 'EC' },
    { codigo: '51', pais: 'Perú', iso: 'PE' },
    { codigo: '56', pais: 'Chile', iso: 'CL' },
    { codigo: '54', pais: 'Argentina', iso: 'AR' },
    { codigo: '58', pais: 'Venezuela', iso: 'VE' },
  ];

  visible = false;
  estado: Estado = 'formulario';

  codPro?: number;
  accion: Accion = 'whatsapp';
  /** 1 = arriendo, 2 = venta, 3 = arriendo y venta */
  bizCode?: number;
  whatsappUrl = '';
  primerNombre = '';
  /** Título, zona y precio del inmueble de la ficha, para que el equipo sepa de cuál se trata. */
  private resumen: ResumenInmueble | null = null;

  contacto = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    indicativo: ['57', Validators.required],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9\s-]{7,15}$/)]],
    // Solo se habilita cuando la acción es 'email'.
    email: ['', [Validators.required, Validators.email]],
    tipoNegocio: this.fb.control<TipoNegocio | ''>('', Validators.required),
    aceptaPolitica: [false, Validators.requiredTrue],
  });

  get preguntarTipoNegocio(): boolean {
    return this.bizCode !== 1 && this.bizCode !== 2;
  }

  abrirModal(codPro: number, accion: Accion, bizCode?: number | string, inmueble?: any) {
    if (!this.contactoPropio) {
      this.codPro = codPro;
      this.prepararFormularioExterno(codPro);
      this.visible = true;
      return;
    }

    const codProPrevio = this.codPro;
    this.codPro = codPro;
    this.resumen = inmueble?.codpro ? resumenInmueble(inmueble, SEO_DOMINIO) : null;
    this.accion = accion;
    this.bizCode = bizCode != null ? Number(bizCode) : undefined;

    // Conserva lo que el usuario ya escribió si cerró el modal sin enviar.
    if (this.estado === 'exito' || codPro !== codProPrevio) this.contacto.reset();
    this.estado = 'formulario';

    if (accion === 'email') this.contacto.controls.email.enable();
    else this.contacto.controls.email.disable();

    this.contacto.patchValue({
      tipoNegocio: this.bizCode === 1 ? 'arriendo' : this.bizCode === 2 ? 'compra' : '',
    });
    this.visible = true;
  }

  cerrarModal() {
    this.visible = false;
  }

  /** Iframe de LeadConnector como era antes del formulario propio: con la URL de la ficha para saber el inmueble. */
  private prepararFormularioExterno(codPro: number): void {
    const propio = FORMULARIOS_POR_INMUEBLE[codPro];
    const base = propio
      ? `https://api.leadconnectorhq.com/widget/form/${propio.formId}`
      : this.route.snapshot.queryParams['utm_source'] === 'meta ads'
        ? FORMULARIO_EXTERNO_META
        : FORMULARIO_EXTERNO;
    const formId = base.split('/').pop() || '';
    this.iframeId = `inline-${formId}`;
    this.iframeTitulo = propio?.nombre ?? `Propiedad código ${codPro}`;
    this.iframeAlto = propio?.alto ?? 600;
    const urlActual = window.location.href;
    const url = `${base}?urlInmueble=${btoa(urlActual)}&historial_web=${encodeURIComponent(urlActual)}`;
    this.iframeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.visible && this.estado !== 'enviando') this.cerrarModal();
  }

  invalido(campo: 'nombre' | 'telefono' | 'email' | 'tipoNegocio' | 'aceptaPolitica'): boolean {
    const control = this.contacto.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  enviarContacto() {
    if (this.contacto.invalid) {
      this.contacto.markAllAsTouched();
      return;
    }

    // Se abre la pestaña dentro del gesto del usuario para que el navegador no la bloquee;
    // la URL de WhatsApp se le asigna cuando responde el backend.
    const ventana = window.open('', '_blank');
    if (ventana) ventana.opener = null;

    this.estado = 'enviando';

    const { nombre, indicativo, telefono, email, tipoNegocio } = this.contacto.getRawValue();
    const telefonoCompleto = `+${indicativo}${telefono.replace(/\D/g, '')}`;
    const urlInmueble = window.location.href;
    const porEmail = this.accion === 'email';
    this.primerNombre = nombre.trim().split(/\s+/)[0];

    const obj = {
      nombre: nombre.trim(),
      email: porEmail ? email.trim() : null,
      telefono: telefonoCompleto,
      mensaje: `Interesado en ${tipoNegocio === 'compra' ? 'comprar' : 'arrendar'} el inmueble código ${this.codPro}. Prefiere contacto por ${porEmail ? 'correo' : 'WhatsApp'}.`,
      codPro: this.codPro,
      fuente: 'propiedad',
      accion: this.accion,
      canal: this.accion,
      tipoNegocio,
      aceptaPolitica: true,
      urlInmueble,
      tituloInmueble: this.resumen?.titulo || null,
      zonaInmueble: this.resumen?.zona || null,
      precioInmueble: this.resumen?.precio || null,
      utm_source: this.leerUtm('utm_source'),
      utm_medium: this.leerUtm('utm_medium'),
      utm_campaign: this.leerUtm('utm_campaign'),
      utm_content: this.leerUtm('utm_content'),
      utm_term: this.leerUtm('utm_term'),
    };

    this.whatsappUrl = `https://wa.me/${WHATSAPP_COMERCIAL}?text=${encodeURIComponent(
      `Hola, soy ${obj.nombre}. Me interesa el inmueble código ${this.codPro}: ${urlInmueble}`
    )}`;

    this.inmuebleService.createContactoInmueble(obj).subscribe({
      next: () => {
        this.estado = 'exito';
        // Si el navegador bloqueó la pestaña, queda el botón "Abrir WhatsApp" en la vista de éxito.
        if (ventana) ventana.location.href = this.whatsappUrl;
      },
      error: (error) => {
        console.error('Error al enviar el contacto:', error);
        ventana?.close();
        this.estado = 'error';
      },
    });
  }

  /**
   * Lee el UTM de la URL actual y, si no está, del que se guardó en localStorage al llegar al sitio
   * (core/config/campana.ts: vence a los 30 días y ya no se pega en la dirección de cada página).
   */
  private leerUtm(param: string): string | null {
    const enUrl = new URL(window.location.href).searchParams.get(param);
    if (enUrl) return enUrl;
    try {
      return localStorage.getItem(param);
    } catch {
      return null;
    }
  }

  volverAlFormulario() {
    this.estado = 'formulario';
  }
}
