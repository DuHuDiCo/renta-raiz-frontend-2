import { Component, ElementRef, EventEmitter, inject, OnInit, Output } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { finalize } from 'rxjs';
import { WishlistServiceService } from '../../core/wishlist/wishlist-service.service';
import { RecorridosService } from '../../core/recorridos/recorridos.service';
import {
  CIERRE_ENTRE_SEMANA,
  CIERRE_SABADO,
  DIAS_MAXIMOS_ADELANTE,
  FRANJA_SABADO,
  FranjaRecorrido,
  FRANJAS_RECORRIDO,
  OpcionFranja,
  TEXTO_HORARIO,
  LONGITUD_MAXIMA_COMENTARIOS,
  MAXIMO_RANGOS,
  RangoDisponibilidad,
} from '../../core/recorridos/recorridos.models';

/** 'confirmando': todo está completo y se le recuerda, antes de enviar, que las fechas son una guía. */
type Estado = 'formulario' | 'confirmando' | 'enviando' | 'exito' | 'error';
/** Un rango del formulario: desde, hasta (ISO) y franjas. */
type RangoForm = FormGroup<{
  desde: FormControl<string>;
  hasta: FormControl<string>;
  franjas: FormControl<FranjaRecorrido[]>;
}>;

/** "2026-11-09" de una fecha local (el visitante está en Colombia; no se usa UTC para no correr el día). */
function iso(fecha: Date): string {
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${m}-${d}`;
}

function sumarDias(fecha: Date, dias: number): Date {
  const nueva = new Date(fecha);
  nueva.setDate(nueva.getDate() + dias);
  return nueva;
}

function desdeIso(valor: string): Date {
  const [a, m, d] = valor.split('-').map(Number);
  return new Date(a, m - 1, d);
}

/**
 * Primer día en que se puede proponer un recorrido: hoy si aún no cierra la atención, si no el siguiente.
 * Nunca un domingo.
 */
function primerDiaDisponible(ahora = new Date()): Date {
  const dia = ahora.getDay();
  const cierre = dia === 6 ? CIERRE_SABADO : CIERRE_ENTRE_SEMANA;
  let fecha = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  if (dia === 0 || ahora.getHours() >= cierre) fecha = sumarDias(fecha, 1);
  if (fecha.getDay() === 0) fecha = sumarDias(fecha, 1);
  return fecha;
}

/** Qué días tiene un rango: entre semana, sábado, domingo. */
function diasDelRango(desde: string, hasta: string): { entreSemana: boolean; sabado: boolean; domingo: boolean } {
  const dias = { entreSemana: false, sabado: false, domingo: false };
  if (!desde || !hasta || hasta < desde) return dias;
  // Con una semana completa ya están todos los días: no hace falta recorrer más.
  for (let f = desdeIso(desde), n = 0; iso(f) <= hasta && n < 7; f = sumarDias(f, 1), n++) {
    const d = f.getDay();
    if (d === 0) dias.domingo = true;
    else if (d === 6) dias.sabado = true;
    else dias.entreSemana = true;
  }
  return dias;
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * Formulario propio para el recorrido: el visitante deja uno o varios rangos de fechas y franjas horarias en los
 * que puede, junto con sus datos. No es una reserva: el equipo usa esa disponibilidad para organizar la ruta con
 * los propietarios y un asesor le confirma día y hora.
 */
@Component({
  selector: 'app-formulario-recorrido',
  standalone: true,
  imports: [ReactiveFormsModule, TitleCasePipe],
  templateUrl: './formulario-recorrido.component.html',
})
export class FormularioRecorridoComponent implements OnInit {
  private fb = inject(NonNullableFormBuilder);
  private favoritos = inject(WishlistServiceService);
  private recorridos = inject(RecorridosService);
  private elemento = inject(ElementRef);

  @Output() cerrar = new EventEmitter<void>();

  readonly franjaSabado = FRANJA_SABADO;
  readonly textoHorario = TEXTO_HORARIO;
  readonly maximoRangos = MAXIMO_RANGOS;
  readonly longitudComentarios = LONGITUD_MAXIMA_COMENTARIOS;
  /** Primer día que se puede proponer (hoy si aún no cierra la atención; nunca domingo). */
  readonly hoy = iso(primerDiaDisponible());
  readonly limite = iso(sumarDias(new Date(), DIAS_MAXIMOS_ADELANTE));

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

  inmuebles: any[] = [];
  estado: Estado = 'formulario';
  idSolicitud = '';
  primerNombre = '';

  /** Opción en edición: los atajos y los campos solo la llenan; no cuenta hasta que el visitante la agrega. */
  borrador: RangoForm = this.nuevoRango();
  /** Opciones que el visitante ya confirmó con "Agregar esta opción". Son las que se envían. */
  confirmados: RangoDisponibilidad[] = [];
  /** Mensaje junto a la opción en edición (falta agregarla, está repetida, se llegó al máximo…). */
  avisoBorrador: string | null = null;
  /** Posición en la lista de la opción recién agregada, resaltada un momento para que se vea que entró. */
  recienAgregado: number | null = null;
  private quitarResaltado?: ReturnType<typeof setTimeout>;

  datos = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    indicativo: ['57', Validators.required],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9\s-]{7,15}$/)]],
    email: ['', Validators.email],
    comentarios: ['', Validators.maxLength(LONGITUD_MAXIMA_COMENTARIOS)],
    aceptaPolitica: [false, Validators.requiredTrue],
  });

  ngOnInit(): void {
    this.inmuebles = this.favoritos.cargarFavoritos();
    // Las franjas dependen de los días del rango: si cambian las fechas, se ajustan.
    this.borrador.controls.desde.valueChanges.subscribe(() => this.ajustarFranjas(this.borrador));
    this.borrador.controls.hasta.valueChanges.subscribe(() => this.ajustarFranjas(this.borrador));
  }

  // ---------- Rangos de disponibilidad ----------

  private nuevoRango(desde = '', hasta = '', franjas: FranjaRecorrido[] = []): RangoForm {
    return this.fb.group(
      {
        desde: this.fb.control(desde, Validators.required),
        hasta: this.fb.control(hasta, Validators.required),
        franjas: this.fb.control<FranjaRecorrido[]>(franjas, (c) => (c.value?.length ? null : { sinFranja: true })),
      },
      { validators: (grupo) => this.validarRango(grupo) }
    );
  }

  private validarRango(grupo: AbstractControl): ValidationErrors | null {
    const { desde, hasta } = grupo.value as { desde: string; hasta: string };
    if (!desde || !hasta) return null;
    if (desde < this.hoy) return { pasado: true };
    if (hasta < desde) return { invertido: true };
    if (hasta > this.limite) return { muyLejos: true };
    // El rango no puede empezar ni terminar en domingo; un domingo en medio se entiende excluido.
    if (desdeIso(desde).getDay() === 0 || desdeIso(hasta).getDay() === 0) return { domingo: true };
    return null;
  }

  /** El rango cae solo en sábado (ej. sáb 14, o sáb 14 – dom 15): su única franja es 9:00 a 11:00. */
  esSoloSabado(rango: { desde: string; hasta: string }): boolean {
    const dias = diasDelRango(rango.desde, rango.hasta);
    return dias.sabado && !dias.entreSemana;
  }

  /** Tiene días entre semana y además un sábado: se avisa que ese día el horario es más corto. */
  incluyeSabado(rango: { desde: string; hasta: string }): boolean {
    const dias = diasDelRango(rango.desde, rango.hasta);
    return dias.sabado && dias.entreSemana;
  }

  /** Franjas que se pueden escoger según los días del rango. */
  franjasDe(rango: RangoForm): OpcionFranja[] {
    return this.esSoloSabado(rango.getRawValue()) ? [FRANJA_SABADO] : FRANJAS_RECORRIDO;
  }

  /** Deja solo franjas válidas para las fechas: solo sábado → 9 a 11 marcada; con días entre semana → sin 'sabado'. */
  private ajustarFranjas(rango: RangoForm): void {
    const actuales = rango.controls.franjas.value;
    if (this.esSoloSabado(rango.getRawValue())) {
      if (actuales.join() !== 'sabado') rango.controls.franjas.setValue(['sabado']);
    } else if (actuales.includes('sabado')) {
      rango.controls.franjas.setValue(actuales.filter((f) => f !== 'sabado'));
    }
  }

  get borradorVacio(): boolean {
    const { desde, hasta, franjas } = this.borrador.getRawValue();
    return !desde && !hasta && !franjas.length;
  }

  get puedeAgregarMas(): boolean {
    return this.confirmados.length < MAXIMO_RANGOS;
  }

  /** Confirma la opción en edición: pasa a la lista y el editor queda libre para la siguiente. */
  confirmarRango(): void {
    this.avisoBorrador = null;
    if (!this.puedeAgregarMas) {
      this.avisoBorrador = `Ya tienes ${MAXIMO_RANGOS} opciones. Quita alguna para agregar otra.`;
      return;
    }
    if (this.borrador.invalid) {
      this.borrador.markAllAsTouched();
      return;
    }
    const rango = this.borrador.getRawValue() as RangoDisponibilidad;
    const repetido = this.confirmados.some(
      (r) => r.desde === rango.desde && r.hasta === rango.hasta && r.franjas.join() === rango.franjas.join()
    );
    if (repetido) {
      this.avisoBorrador = 'Ya agregaste esa opción.';
      return;
    }
    const nuevo = { ...rango, franjas: [...rango.franjas] };
    this.confirmados = [...this.confirmados, nuevo].sort((x, y) => x.desde.localeCompare(y.desde));
    this.limpiarBorrador();
    this.recienAgregado = this.confirmados.indexOf(nuevo);
    clearTimeout(this.quitarResaltado);
    this.quitarResaltado = setTimeout(() => (this.recienAgregado = null), 1600);
  }

  limpiarBorrador(): void {
    this.borrador.reset({ desde: '', hasta: '', franjas: [] });
    this.avisoBorrador = null;
  }

  quitarConfirmado(indice: number): void {
    this.confirmados = this.confirmados.filter((_, i) => i !== indice);
    this.avisoBorrador = null;
  }

  /** Lleva una opción confirmada de vuelta al editor para cambiarla. */
  editarConfirmado(indice: number): void {
    if (!this.borradorVacio) {
      this.avisoBorrador = 'Primero agrega o borra la opción que estás editando.';
      return;
    }
    const rango = this.confirmados[indice];
    this.confirmados = this.confirmados.filter((_, i) => i !== indice);
    this.borrador.reset({ desde: rango.desde, hasta: rango.hasta, franjas: [...rango.franjas] });
    this.avisoBorrador = null;
  }

  /**
   * Atajos: solo llenan las fechas de la opción en edición; el visitante decide si la agrega.
   * Parten del primer día disponible (si hoy ya cerró la atención, desde mañana; nunca domingo).
   */
  usarAtajo(atajo: 'semana' | 'proxima' | 'sabado'): void {
    const inicio = desdeIso(this.hoy);
    const dia = inicio.getDay(); // 1 lunes … 6 sábado (nunca domingo)
    let desde: Date;
    let hasta: Date;
    if (atajo === 'semana') {
      desde = inicio;
      hasta = sumarDias(inicio, 6 - dia);
    } else if (atajo === 'proxima') {
      desde = sumarDias(inicio, 8 - dia);
      hasta = sumarDias(desde, 5);
    } else {
      desde = sumarDias(inicio, 6 - dia);
      hasta = desde;
    }
    this.borrador.patchValue({ desde: iso(desde), hasta: iso(hasta) });
    this.borrador.markAsDirty();
    this.avisoBorrador = null;
  }

  /** Al escoger el inicio, si el fin quedó vacío o antes, se iguala para no obligar a escribirlo dos veces. */
  alCambiarDesde(rango: RangoForm): void {
    const { desde, hasta } = rango.getRawValue() as { desde: string; hasta: string };
    if (desde && (!hasta || hasta < desde)) rango.controls.hasta.setValue(desde);
  }

  tieneFranja(rango: RangoForm, franja: FranjaRecorrido): boolean {
    return (rango.controls.franjas.value as FranjaRecorrido[]).includes(franja);
  }

  alternarFranja(rango: RangoForm, franja: FranjaRecorrido): void {
    const actuales = rango.controls.franjas.value as FranjaRecorrido[];
    const nuevas = actuales.includes(franja) ? actuales.filter((f) => f !== franja) : [...actuales, franja];
    rango.controls.franjas.setValue(this.franjasDe(rango).map((f) => f.valor).filter((v) => nuevas.includes(v)));
    rango.controls.franjas.markAsTouched();
  }

  cualquierHora(rango: RangoForm): void {
    rango.controls.franjas.setValue(this.franjasDe(rango).map((f) => f.valor));
    rango.controls.franjas.markAsTouched();
  }

  /** Resumen de la opción en edición, si ya está completa y es válida. */
  get resumenBorrador(): string {
    return this.borrador.valid ? this.resumen(this.borrador.getRawValue() as RangoDisponibilidad) : '';
  }

  /** "Lun 9 – Vie 13 nov · mañana", "Sáb 14 nov · 9:00 a 11:00 a. m.", "Lun 9 – Sáb 14 nov · tarde (sábado 9 a 11)". */
  resumen(rango: RangoDisponibilidad): string {
    const { desde, hasta, franjas } = rango;
    if (!desde || !hasta) return '';
    const a = desdeIso(desde);
    const b = desdeIso(hasta);
    const texto = (f: Date, conMes: boolean) => `${DIAS[f.getDay()]} ${f.getDate()}${conMes ? ` ${MESES[f.getMonth()]}` : ''}`;
    const fechas = desde === hasta ? texto(a, true) : `${texto(a, a.getMonth() !== b.getMonth())} – ${texto(b, true)}`;
    if (this.esSoloSabado(rango)) return `${fechas} · ${FRANJA_SABADO.horas}`;

    const nombres = FRANJAS_RECORRIDO.filter((f) => franjas.includes(f.valor)).map((f) => f.nombre.toLowerCase());
    const horas = nombres.length === FRANJAS_RECORRIDO.length ? 'cualquier hora' : nombres.join(' y ');
    const dias = diasDelRango(desde, hasta);
    const notas = [dias.sabado ? 'sábado 9 a 11' : '', dias.domingo ? 'sin domingo' : ''].filter(Boolean);
    return `${fechas} · ${horas}${notas.length ? ` (${notas.join(', ')})` : ''}`;
  }

  errorRango(rango: RangoForm): string | null {
    if (this.avisoBorrador) return this.avisoBorrador;
    const tocado = rango.touched;
    if (!tocado) return null;
    if (rango.controls.desde.invalid || rango.controls.hasta.invalid) return 'Escoge la fecha de inicio y la de fin.';
    if (rango.hasError('pasado')) return `La fecha más próxima que puedes escoger es el ${this.fechaLegible(this.hoy)}.`;
    if (rango.hasError('domingo')) return 'Los domingos no hay recorridos: escoge otro día para empezar o terminar.';
    if (rango.hasError('invertido')) return 'La fecha de fin debe ser igual o posterior a la de inicio.';
    if (rango.hasError('muyLejos')) return `Propón fechas dentro de los próximos ${DIAS_MAXIMOS_ADELANTE} días.`;
    if (rango.controls.franjas.invalid && rango.controls.franjas.touched) return 'Escoge al menos una franja horaria.';
    return null;
  }

  /** "lunes 9 de noviembre". */
  private fechaLegible(valor: string): string {
    return desdeIso(valor).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // ---------- Inmuebles ----------

  quitarInmueble(inmueble: any): void {
    this.favoritos.eliminar(inmueble.codpro);
    this.inmuebles = this.favoritos.cargarFavoritos();
  }

  // ---------- Envío ----------

  invalido(campo: 'nombre' | 'telefono' | 'email' | 'aceptaPolitica'): boolean {
    const control = this.datos.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  /** Nombre que ya escribió el visitante, para un saludo cercano en el recordatorio. */
  get primerNombreFormulario(): string {
    return this.datos.controls.nombre.value.trim().split(/\s+/)[0] || '';
  }

  /** Primer paso del envío: valida y, si todo está bien, muestra el recordatorio antes de enviar de verdad. */
  enviar(): void {
    if (this.estado === 'enviando' || this.estado === 'confirmando') return;
    if (!this.inmuebles.length) return;
    if (!this.borradorVacio) {
      this.avisoBorrador = this.borrador.valid
        ? 'Tienes una opción sin agregar: pulsa "Agregar esta opción" o bórrala.'
        : 'Completa la opción que estás editando y agrégala, o bórrala.';
    } else if (!this.confirmados.length) {
      this.avisoBorrador = 'Agrega al menos una opción de fechas.';
    }
    if (this.avisoBorrador || this.datos.invalid) {
      this.datos.markAllAsTouched();
      setTimeout(() => this.llevarAlPrimerError());
      return;
    }
    this.estado = 'confirmando';
  }

  /** El visitante leyó el recordatorio y confirma: ahora sí se envía. */
  confirmarEnvio(): void {
    if (this.estado !== 'confirmando') return;
    const { nombre, indicativo, telefono, email, comentarios } = this.datos.getRawValue();
    const disponibilidad: RangoDisponibilidad[] = this.confirmados;

    this.estado = 'enviando';
    this.primerNombre = nombre.trim().split(/\s+/)[0];
    this.recorridos
      .solicitar({
        nombre: nombre.trim(),
        telefono: `+${indicativo}${telefono.replace(/\D/g, '')}`,
        email: email.trim() || null,
        // El equipo confirma siempre por WhatsApp.
        canalPreferido: 'whatsapp',
        inmuebles: this.inmuebles.map((i) => Number(i.codpro)).filter((c) => c > 0),
        disponibilidad,
        comentarios: comentarios.trim() || null,
        aceptaPolitica: true,
        urlOrigen: window.location.href,
        utm_source: this.leerUtm('utm_source'),
        utm_medium: this.leerUtm('utm_medium'),
        utm_campaign: this.leerUtm('utm_campaign'),
        utm_content: this.leerUtm('utm_content'),
        utm_term: this.leerUtm('utm_term'),
      })
      .pipe(finalize(() => this.estado === 'enviando' && (this.estado = 'error')))
      .subscribe({
        next: (respuesta) => {
          this.idSolicitud = respuesta?.id ?? '';
          this.estado = 'exito';
          this.registrar();
        },
        error: () => (this.estado = 'error'),
      });
  }

  /**
   * Lleva al primer campo con error. Solo se mueve la zona del formulario: scrollIntoView también desplazaría
   * la tarjeta del modal (que recorta con overflow-hidden) y dejaría un hueco en blanco.
   */
  private llevarAlPrimerError(): void {
    const raiz = this.elemento.nativeElement as HTMLElement;
    const zona = raiz.querySelector<HTMLElement>('[data-zona-formulario]');
    const error = raiz.querySelector<HTMLElement>('[data-error], input.ng-invalid.ng-touched, select.ng-invalid.ng-touched');
    if (!zona || !error) return;
    const destino = error.getBoundingClientRect().top - zona.getBoundingClientRect().top + zona.scrollTop - 24;
    zona.scrollTo({ top: Math.max(0, destino), behavior: 'smooth' });
    error.querySelector<HTMLElement>('input')?.focus({ preventScroll: true });
  }

  /** Vuelve del recordatorio al formulario para ajustar las fechas. */
  revisarFechas(): void {
    this.estado = 'formulario';
    setTimeout(() => this.elemento.nativeElement.querySelector('[data-zona-formulario]')?.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  volverAlFormulario(): void {
    this.estado = 'formulario';
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

  /** Evento para Google Tag Manager. */
  private registrar(): void {
    const capa = ((window as any).dataLayer = (window as any).dataLayer || []);
    capa.push({ event: 'recorrido_solicitado', inmuebles: this.inmuebles.length, rangos: this.confirmados.length });
  }
}
