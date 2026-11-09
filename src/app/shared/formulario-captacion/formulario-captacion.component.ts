import { Component, ElementRef, inject, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Subscription, TimeoutError } from 'rxjs';
import { CaptacionesService } from '../../core/captaciones/captaciones.service';
import {
  AREA_MAXIMA,
  CANTIDAD_MAXIMA,
  CIUDADES_SUGERIDAS,
  DatosCaptacion,
  DIAS_MAXIMOS_DISPONIBLE,
  incluyeArriendo,
  incluyeVenta,
  LONGITUD_MAXIMA_DESCRIPCION,
  LONGITUD_MAXIMA_UBICACION,
  MAXIMO_FOTOS,
  NEGOCIOS_CAPTACION,
  NegocioCaptacion,
  PATRON_TELEFONO,
  TAMANO_MAXIMO_FOTO,
  TipoCaptacion,
  TIPOS_CAPTACION,
} from '../../core/captaciones/captaciones.models';
import { FotoNoLegibleError, reducirFoto } from './reducir-foto';

type Estado = 'formulario' | 'enviando' | 'exito' | 'error';

/** Una foto ya reducida, lista para enviar, con su miniatura. */
interface FotoCaptacion {
  id: number;
  nombre: string;
  blob: Blob;
  /** Object URL de la miniatura: se libera al quitarla o al salir de la página. */
  url: string;
}

/** Hoy en Colombia, "AAAA-MM-DD" (el contrato compara contra la hora de Colombia, no la del navegador). */
function hoyColombia(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function sumarDiasIso(valor: string, dias: number): string {
  const [a, m, d] = valor.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** "4.500.000" → 4500000; vacío → null. */
function aMonto(valor: string): number | null {
  const digitos = String(valor ?? '').replace(/\D/g, '');
  return digitos ? Number(digitos) : null;
}

/** "85,5" o "85.5" → 85.5; vacío → null; texto inválido → NaN. */
function aNumero(valor: string): number | null {
  const texto = String(valor ?? '').trim().replace(',', '.');
  return texto ? Number(texto) : null;
}

function formatearMiles(digitos: string): string {
  return digitos.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Obligatorio sin aceptar solo espacios. */
const textoObligatorio: ValidatorFn = (c) => (String(c.value ?? '').trim() ? null : { required: true });

/** Monto en pesos mayor que cero. */
const montoPositivo: ValidatorFn = (c) => ((aMonto(c.value) ?? 0) > 0 ? null : { montoPositivo: true });

/** Número opcional entre min y max; entero salvo que se permitan decimales. */
function rango(min: number, max: number, decimales = false): ValidatorFn {
  return (c) => {
    const n = aNumero(c.value);
    if (n === null) return null;
    if (!Number.isFinite(n) || n < min || n > max || (!decimales && !Number.isInteger(n))) return { rango: { min, max } };
    return null;
  };
}

/**
 * Formulario propio de captación: el propietario deja los datos de su inmueble y fotos, el backend los pasa a
 * lia-service y un asesor o Lía le escribe por WhatsApp. Reemplaza el iframe de LeadConnector (cuyos datos no
 * llegaban a nuestros sistemas) cuando environment.captacionPropia es true.
 */
@Component({
  selector: 'app-formulario-captacion',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './formulario-captacion.component.html',
  // Al desplazarse hasta el formulario (éxito, otro inmueble) no queda bajo la barra de navegación fija.
  host: { class: 'block scroll-mt-28' },
})
export class FormularioCaptacionComponent implements OnInit, OnDestroy {
  private fb = inject(NonNullableFormBuilder);
  private captaciones = inject(CaptacionesService);
  private elemento = inject(ElementRef);

  readonly tipos = TIPOS_CAPTACION;
  readonly negocios = NEGOCIOS_CAPTACION;
  readonly ciudades = CIUDADES_SUGERIDAS;
  readonly estratos = [1, 2, 3, 4, 5, 6];
  readonly maximoFotos = MAXIMO_FOTOS;
  readonly longitudDescripcion = LONGITUD_MAXIMA_DESCRIPCION;
  readonly longitudUbicacion = LONGITUD_MAXIMA_UBICACION;
  readonly hoy = hoyColombia();
  readonly limiteDisponible = sumarDiasIso(this.hoy, DIAS_MAXIMOS_DISPONIBLE);

  /** El mismo selector de indicativos del formulario de recorrido. */
  readonly indicativos = [
    { codigo: '57', pais: 'Colombia' },
    { codigo: '1', pais: 'EE. UU. / Canadá' },
    { codigo: '52', pais: 'México' },
    { codigo: '34', pais: 'España' },
    { codigo: '507', pais: 'Panamá' },
    { codigo: '593', pais: 'Ecuador' },
    { codigo: '51', pais: 'Perú' },
    { codigo: '56', pais: 'Chile' },
    { codigo: '54', pais: 'Argentina' },
    { codigo: '58', pais: 'Venezuela' },
  ];

  estado: Estado = 'formulario';
  /** Avance de la subida (0–100). */
  progreso = 0;
  mensajeError = '';
  idCaptacion = '';
  primerNombre = '';
  telefonoEnviado = '';

  fotos: FotoCaptacion[] = [];
  /** Fotos que se están reduciendo en este momento. */
  procesandoFotos = 0;
  /** Avisos de la zona de fotos: archivos que no se pudieron leer, máximo superado… */
  avisosFotos: string[] = [];
  arrastrando = false;
  private siguienteIdFoto = 1;
  private envio?: Subscription;

  form = this.fb.group({
    nombre: ['', [textoObligatorio, Validators.minLength(3)]],
    indicativo: ['57', Validators.required],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9\s-]{7,15}$/)]],
    email: ['', Validators.email],

    tipo: ['' as TipoCaptacion | '', Validators.required],
    negocio: ['' as NegocioCaptacion | '', Validators.required],
    ciudad: ['', [textoObligatorio, Validators.maxLength(LONGITUD_MAXIMA_UBICACION)]],
    barrio: ['', [textoObligatorio, Validators.maxLength(LONGITUD_MAXIMA_UBICACION)]],
    precioArriendo: [''],
    precioVenta: [''],
    administracion: [''],
    area: ['', rango(1, AREA_MAXIMA, true)],
    habitaciones: ['', rango(0, CANTIDAD_MAXIMA)],
    banos: ['', rango(0, CANTIDAD_MAXIMA)],
    parqueaderos: ['', rango(0, CANTIDAD_MAXIMA)],
    estrato: [''],
    amoblado: ['' as '' | 'si' | 'no'],
    disponibleDesde: ['', (c: AbstractControl) => this.validarFecha(c)],
    descripcion: ['', Validators.maxLength(LONGITUD_MAXIMA_DESCRIPCION)],

    aceptaPolitica: [false, Validators.requiredTrue],
  });

  ngOnInit(): void {
    // El precio obligatorio depende del negocio: arriendo, venta o ambos.
    this.form.controls.negocio.valueChanges.subscribe((negocio) => this.ajustarPrecios(negocio));
  }

  ngOnDestroy(): void {
    this.envio?.unsubscribe();
    this.fotos.forEach((foto) => URL.revokeObjectURL(foto.url));
  }

  // ---------- Inmueble ----------

  get conArriendo(): boolean {
    return incluyeArriendo(this.form.controls.negocio.value);
  }

  get conVenta(): boolean {
    return incluyeVenta(this.form.controls.negocio.value);
  }

  private ajustarPrecios(negocio: NegocioCaptacion | ''): void {
    const { precioArriendo, precioVenta } = this.form.controls;
    precioArriendo.setValidators(incluyeArriendo(negocio) ? montoPositivo : null);
    precioVenta.setValidators(incluyeVenta(negocio) ? montoPositivo : null);
    precioArriendo.updateValueAndValidity();
    precioVenta.updateValueAndValidity();
  }

  /** Deja solo dígitos con puntos de miles mientras escribe: "4500000" → "4.500.000". */
  formatearMonto(campo: 'precioArriendo' | 'precioVenta' | 'administracion', evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const digitos = entrada.value.replace(/\D/g, '').slice(0, 13);
    const formateado = formatearMiles(digitos);
    // Mantiene el cursor en la misma posición respecto al final (los puntos lo moverían).
    const desdeElFinal = entrada.value.length - (entrada.selectionEnd ?? entrada.value.length);
    this.form.controls[campo].setValue(formateado);
    entrada.value = formateado;
    const posicion = Math.max(0, formateado.length - desdeElFinal);
    entrada.setSelectionRange(posicion, posicion);
  }

  private validarFecha(c: AbstractControl): ValidationErrors | null {
    const valor = String(c.value ?? '');
    if (!valor) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return { fecha: true };
    if (valor < this.hoy) return { fechaPasada: true };
    if (valor > this.limiteDisponible) return { fechaLejana: true };
    return null;
  }

  get longitudDescripcionActual(): number {
    return this.form.controls.descripcion.value.length;
  }

  // ---------- Fotos ----------

  get espacioFotos(): number {
    return MAXIMO_FOTOS - this.fotos.length - this.procesandoFotos;
  }

  /** Una casilla con indicador de carga por cada foto en proceso. */
  get marcadoresProcesando(): number[] {
    return Array.from({ length: this.procesandoFotos }, (_, i) => i);
  }

  alSeleccionarFotos(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const archivos = Array.from(entrada.files ?? []);
    // Permite volver a escoger el mismo archivo después de quitarlo.
    entrada.value = '';
    this.agregarFotos(archivos);
  }

  alArrastrar(evento: DragEvent, encima: boolean): void {
    evento.preventDefault();
    this.arrastrando = encima;
  }

  alSoltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastrando = false;
    if (this.estado === 'enviando') return;
    this.agregarFotos(Array.from(evento.dataTransfer?.files ?? []));
  }

  private async agregarFotos(archivos: File[]): Promise<void> {
    if (!archivos.length) return;
    this.avisosFotos = [];
    const espacio = this.espacioFotos;
    if (archivos.length > espacio) {
      const sobran = archivos.length - Math.max(0, espacio);
      this.avisosFotos.push(
        espacio > 0
          ? `Puedes subir hasta ${MAXIMO_FOTOS} fotos: agregamos ${espacio} y dejamos por fuera ${sobran}.`
          : `Ya tienes ${MAXIMO_FOTOS} fotos, el máximo. Quita alguna para agregar otra.`
      );
      archivos = archivos.slice(0, Math.max(0, espacio));
    }

    this.procesandoFotos += archivos.length;
    // Una a la vez: varias fotos de 12 MP decodificadas a la vez pueden agotar la memoria de un celular.
    for (const archivo of archivos) {
      try {
        const blob = await reducirFoto(archivo);
        if (blob.size > TAMANO_MAXIMO_FOTO) throw new FotoNoLegibleError('Muy pesada.');
        this.fotos = [...this.fotos, { id: this.siguienteIdFoto++, nombre: archivo.name, blob, url: URL.createObjectURL(blob) }];
      } catch {
        this.avisosFotos.push(
          `No pudimos leer "${archivo.name}". Sube fotos JPG, PNG o WebP; si es una foto HEIC del iPhone, ` +
            'compártela como JPG o toma una captura de pantalla.'
        );
      } finally {
        this.procesandoFotos--;
      }
    }
  }

  quitarFoto(foto: FotoCaptacion): void {
    URL.revokeObjectURL(foto.url);
    this.fotos = this.fotos.filter((f) => f.id !== foto.id);
    this.avisosFotos = [];
  }

  // ---------- Envío ----------

  invalido(campo: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  /** Teléfono completo con indicativo: "+573001234567". */
  private telefonoCompleto(): string {
    const { indicativo, telefono } = this.form.getRawValue();
    return `+${indicativo}${telefono.replace(/\D/g, '')}`;
  }

  enviar(): void {
    if (this.estado === 'enviando') return;
    if (this.procesandoFotos) {
      this.mensajeError = 'Espera un momento a que terminen de cargar las fotos.';
      this.estado = 'error';
      return;
    }
    // El patrón del campo admite el número; el contrato además exige 8 a 18 dígitos con el indicativo.
    const telefono = this.form.controls.telefono;
    if (telefono.valid && !PATRON_TELEFONO.test(this.telefonoCompleto())) telefono.setErrors({ pattern: true });

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.estado === 'error') this.estado = 'formulario';
      setTimeout(() => this.llevarAlPrimerError());
      return;
    }

    const datos = this.armarDatos();
    this.estado = 'enviando';
    this.progreso = 0;
    this.mensajeError = '';
    this.primerNombre = datos.nombre.split(/\s+/)[0];
    this.telefonoEnviado = datos.telefono;

    this.envio?.unsubscribe();
    this.envio = this.captaciones.enviar(datos, this.fotos.map((f) => f.blob)).subscribe({
      next: (evento) => {
        if (evento.tipo === 'progreso') {
          this.progreso = evento.porcentaje;
          return;
        }
        this.idCaptacion = evento.respuesta?.id ?? '';
        this.estado = 'exito';
        this.registrar(datos);
        setTimeout(() => this.elemento.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      },
      error: (error) => {
        this.mensajeError = this.textoError(error);
        this.estado = 'error';
      },
      complete: () => {
        if (this.estado === 'enviando') {
          this.mensajeError = this.textoError(null);
          this.estado = 'error';
        }
      },
    });
  }

  private armarDatos(): DatosCaptacion {
    const v = this.form.getRawValue();
    const negocio = v.negocio as NegocioCaptacion;
    const descripcion = v.descripcion.trim();
    return {
      nombre: v.nombre.trim(),
      telefono: this.telefonoCompleto(),
      email: v.email.trim() || null,
      inmueble: {
        tipo: v.tipo as TipoCaptacion,
        negocio,
        ciudad: v.ciudad.trim(),
        barrio: v.barrio.trim(),
        precioArriendo: incluyeArriendo(negocio) ? aMonto(v.precioArriendo) : null,
        precioVenta: incluyeVenta(negocio) ? aMonto(v.precioVenta) : null,
        administracion: aMonto(v.administracion),
        area: aNumero(v.area),
        habitaciones: aNumero(v.habitaciones),
        banos: aNumero(v.banos),
        parqueaderos: aNumero(v.parqueaderos),
        estrato: v.estrato ? Number(v.estrato) : null,
        amoblado: v.amoblado === 'si' ? true : v.amoblado === 'no' ? false : null,
        disponibleDesde: v.disponibleDesde || null,
        descripcion: descripcion || null,
      },
      aceptaPolitica: true,
      urlOrigen: window.location.href,
      utm_source: this.leerUtm('utm_source'),
      utm_medium: this.leerUtm('utm_medium'),
      utm_campaign: this.leerUtm('utm_campaign'),
      utm_term: this.leerUtm('utm_term'),
      utm_content: this.leerUtm('utm_content'),
    };
  }

  private textoError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 429) {
        return 'Recibimos varias solicitudes seguidas desde tu conexión. Espera unos minutos y vuelve a intentarlo.';
      }
      if (error.status === 413) {
        return 'Las fotos pesan demasiado para enviarlas juntas. Quita algunas e inténtalo de nuevo.';
      }
      if (error.status === 400) {
        const detalle = typeof error.error?.message === 'string' ? ` (${error.error.message})` : '';
        return `Revisa los datos del formulario e inténtalo de nuevo${detalle}.`;
      }
    }
    if (error instanceof TimeoutError) {
      return 'El envío está tardando demasiado. Revisa tu conexión e inténtalo de nuevo; tus datos y fotos siguen aquí.';
    }
    return 'No pudimos enviar tu inmueble. Revisa tu conexión e inténtalo de nuevo; tus datos y fotos siguen aquí.';
  }

  /** Lleva al primer campo con error y lo enfoca. */
  private llevarAlPrimerError(): void {
    const raiz = this.elemento.nativeElement as HTMLElement;
    const error = raiz.querySelector<HTMLElement>('.ng-invalid.ng-touched:not(form):not(fieldset)');
    if (!error) return;
    error.scrollIntoView({ behavior: 'smooth', block: 'center' });
    error.focus({ preventScroll: true });
  }

  /** Después del éxito: otro inmueble del mismo propietario, sin volver a pedir sus datos. */
  consignarOtro(): void {
    this.fotos.forEach((foto) => URL.revokeObjectURL(foto.url));
    this.fotos = [];
    this.avisosFotos = [];
    const { nombre, indicativo, telefono, email, aceptaPolitica } = this.form.getRawValue();
    this.form.reset();
    this.form.patchValue({ nombre, indicativo, telefono, email, aceptaPolitica });
    this.idCaptacion = '';
    this.estado = 'formulario';
    setTimeout(() => this.elemento.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  private leerUtm(clave: string): string | null {
    const enUrl = new URL(window.location.href).searchParams.get(clave);
    if (enUrl) return enUrl;
    try {
      return localStorage.getItem(clave);
    } catch {
      return null;
    }
  }

  /** Evento para Google Tag Manager, sin datos personales. */
  private registrar(datos: DatosCaptacion): void {
    const capa = ((window as any).dataLayer = (window as any).dataLayer || []);
    capa.push({
      event: 'captacion_enviada',
      tipo: datos.inmueble.tipo,
      negocio: datos.inmueble.negocio,
      fotos: this.fotos.length,
    });
  }
}
