import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {

  

  router = inject(Router);



  redirigirPublicarPropiedad() {
    const url = this.router.createUrlTree(['/publicar-inmueble']).toString();
    window.open(url, '_blank');
  }

  redirigirContactanos() {
    this.router.navigate(['/contacto']);
  }

}
