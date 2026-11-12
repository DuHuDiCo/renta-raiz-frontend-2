import { Component } from '@angular/core';
import { NavbarComponent } from '../../../../shared/navbar/navbar.component';
import { FooterComponent } from '../../../../shared/footer/footer.component';

/** Pasarela de pagos de Renta Raíz (TuCompra). */
export const PASARELA_PSE = 'https://gateway2.tucompra.com.co/sitesgo/RentaRaiz';

/**
 * "¿Cómo pagar el canon de arrendamiento?": los pasos para pagar por PSE y el botón a la pasarela. Es la página
 * que el equipo comparte por WhatsApp; al compartirla se ve la imagen og-pse.jpg (definida en la ruta).
 */
@Component({
  selector: 'app-pagos-pse',
  standalone: true,
  imports: [NavbarComponent, FooterComponent],
  templateUrl: './pagos-pse.component.html',
})
export class PagosPseComponent {
  readonly pasarela = PASARELA_PSE;
  readonly whatsappAyuda = `https://wa.me/573145438665?text=${encodeURIComponent(
    'Hola, necesito ayuda para pagar el canon de arrendamiento por PSE.'
  )}`;

  readonly pasos = [
    { titulo: 'Ingresa a rentaraiz.co', texto: 'Ya estás aquí. También lo encuentras en cualquier página del sitio.' },
    { titulo: 'Selecciona el botón azul PSE', texto: 'Está arriba a la derecha en el menú; en el celular, abajo a la izquierda. O usa el botón de esta página.' },
    { titulo: 'Ingresa tu documento de identificación', texto: '' },
    { titulo: 'Verifica y paga', texto: 'Revisa que la información sea correcta, selecciona el valor a pagar y haz clic en Pagar.' },
  ];
}
