import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { BotonRecorridoComponent } from '../../../../../shared/boton-recorrido/boton-recorrido.component';
import { CompartirInmuebleComponent } from '../../../../../shared/compartir-inmueble/compartir-inmueble.component';

/**
 * Tarjeta lateral de la ficha: precio en franja azul, datos clave, recorrido, WhatsApp, compartir y el asesor
 * del inmueble al pie. La usan la versión de celular y la de escritorio de la ficha.
 */
@Component({
  selector: 'app-tarjeta-ficha',
  standalone: true,
  imports: [CurrencyPipe, BotonRecorridoComponent, CompartirInmuebleComponent],
  templateUrl: './tarjeta-ficha.component.html',
  host: { class: 'block' },
})
export class TarjetaFichaComponent {
  @Input({ required: true }) propiedad: any;
  @Input() asesor: any;
  @Input() urlCompartir = '';
  @Input() tituloPagina = '';

  /** Abre el formulario de contacto por WhatsApp. */
  @Output() whatsapp = new EventEmitter<void>();
  /** Abre el formulario de disponibilidad del recorrido. */
  @Output() agendar = new EventEmitter<void>();
  @Output() verAsesor = new EventEmitter<void>();

  /** 1 = arriendo, 2 = venta, 3 = arriendo y venta. */
  get negocio(): number {
    return Number(this.propiedad?.biz_code) || 0;
  }

  get primerNombreAsesor(): string {
    return String(this.asesor?.nombre || '').split(' ')[0];
  }
}
