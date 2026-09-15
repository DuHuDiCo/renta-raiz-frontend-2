import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { InmueblesService } from '../../../../../core/Inmuebles/inmuebles.service';

type Accion = 'telefonos' | 'whatsapp' | 'soloEnviar';
type Canal = 'whatsapp' | 'llamada';
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
  private activatedRoute = inject(ActivatedRoute);

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
  mostrarModalTelefonos = false;
  estado: Estado = 'formulario';

  codPro?: number;
  accion: Accion = 'soloEnviar';
  /** 1 = arriendo, 2 = venta, 3 = arriendo y venta */
  bizCode?: number;
  whatsappUrl = '';

  private contactoEnviadoPorCodPro: { [codPro: number]: boolean } = {};

  contacto = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    indicativo: ['57', Validators.required],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9\s-]{7,15}$/)]],
    email: ['', [Validators.required, Validators.email]],
    canal: this.fb.control<Canal | ''>('', Validators.required),
    tipoNegocio: this.fb.control<TipoNegocio | ''>('', Validators.required),
    aceptaPolitica: [false, Validators.requiredTrue],
  });

  get preguntarCanal(): boolean {
    return this.accion !== 'whatsapp';
  }

  get preguntarTipoNegocio(): boolean {
    return this.bizCode !== 1 && this.bizCode !== 2;
  }

  abrirModal(codPro: number, accion: Accion, bizCode?: number) {
    const codProPrevio = this.codPro;
    const accionPrevia = this.accion;
    this.codPro = codPro;
    this.accion = accion;
    this.bizCode = bizCode;

    if (accion === 'telefonos' && this.contactoEnviadoPorCodPro[codPro]) {
      this.abrirModalTelefonos();
      return;
    }

    // Conserva lo que el usuario ya escribió si cerró el modal sin enviar.
    if (this.estado === 'exito' || codPro !== codProPrevio) this.contacto.reset();
    this.estado = 'formulario';

    const canalActual = this.contacto.controls.canal.value;
    this.contacto.patchValue({
      canal: accion === 'whatsapp' ? 'whatsapp' : accionPrevia === 'whatsapp' ? '' : canalActual,
      tipoNegocio: bizCode === 1 ? 'arriendo' : bizCode === 2 ? 'compra' : '',
    });
    this.visible = true;
  }

  cerrarModal() {
    this.visible = false;
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.visible && this.estado !== 'enviando') this.cerrarModal();
  }

  invalido(campo: 'nombre' | 'telefono' | 'email' | 'canal' | 'tipoNegocio' | 'aceptaPolitica'): boolean {
    const control = this.contacto.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  enviarContacto() {
    if (this.contacto.invalid) {
      this.contacto.markAllAsTouched();
      return;
    }

    this.estado = 'enviando';

    const { nombre, indicativo, telefono, email, canal, tipoNegocio } =
      this.contacto.getRawValue();
    const telefonoCompleto = `+${indicativo}${telefono.replace(/\D/g, '')}`;
    const urlInmueble = window.location.href;
    const query = this.activatedRoute.snapshot.queryParams;

    const obj = {
      nombre: nombre.trim(),
      email: email.trim(),
      telefono: telefonoCompleto,
      mensaje: `Interesado en ${tipoNegocio === 'compra' ? 'comprar' : 'arrendar'} el inmueble código ${this.codPro}. Prefiere contacto por ${canal === 'whatsapp' ? 'WhatsApp' : 'llamada'}.`,
      codPro: this.codPro,
      fuente: 'propiedad',
      accion: this.accion,
      canal,
      tipoNegocio,
      aceptaPolitica: true,
      urlInmueble,
      utm_source: query['utm_source'] ?? null,
      utm_medium: query['utm_medium'] ?? null,
      utm_campaign: query['utm_campaign'] ?? null,
      utm_content: query['utm_content'] ?? null,
      utm_term: query['utm_term'] ?? null,
    };

    this.whatsappUrl = `https://wa.me/${WHATSAPP_COMERCIAL}?text=${encodeURIComponent(
      `Hola, soy ${obj.nombre}. Me interesa el inmueble código ${this.codPro}: ${urlInmueble}`
    )}`;

    this.inmuebleService.createContacto(obj).subscribe({
      next: () => {
        if (this.accion === 'telefonos') {
          this.contactoEnviadoPorCodPro[this.codPro!] = true;
          this.cerrarModal();
          this.abrirModalTelefonos();
          return;
        }

        this.estado = 'exito';

        if (this.accion === 'whatsapp') {
          // Si el navegador bloquea la ventana, queda el botón "Abrir WhatsApp" en la vista de éxito.
          window.open(this.whatsappUrl, '_blank', 'noopener');
        }
      },
      error: (error) => {
        console.error('Error al enviar el contacto:', error);
        this.estado = 'error';
      },
    });
  }

  volverAlFormulario() {
    this.estado = 'formulario';
  }

  abrirModalTelefonos() {
    this.mostrarModalTelefonos = true;
  }

  abrirToCall(number: string) {
    window.location.href = `tel:${number}`;
  }

  cerrarModalTelefonos() {
    this.mostrarModalTelefonos = false;
  }
}
