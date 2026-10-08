import {
  Component,
  ElementRef,
  HostListener,
  inject,
  ViewChild,
} from '@angular/core';
import { NavbarComponent } from '../../../../shared/navbar/navbar.component';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InmueblesService } from '../../../../core/Inmuebles/inmuebles.service';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../../../shared/footer/footer.component';
import { BotonesFlotantesComponent } from '../../../../shared/botones-flotantes/botones-flotantes.component';
import { log } from 'console';
import { BarraFiltrosComponent } from '../../../../shared/barra-filtros/barra-filtros.component';
import { VolverComponent } from '../../../../shared/volver/volver.component';

@Component({
  selector: 'app-avaluos-comerciales',
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
  templateUrl: './avaluos-comerciales.component.html',
  styleUrl: './avaluos-comerciales.component.scss',
})
export class AvaluosComercialesComponent {
  correo: string = 'info@rentaraiz.com';

  intervalId: any;
  currentSlide = 0;
  searchTerm: string = '';
  elementsPerPageInicial = 3;

  inmueblesDestacadosArray: any = {};

  isLoading = true;

  // Injectaciones
  router = inject(Router);
  elementRef = inject(ElementRef);
  formBuilder = inject(FormBuilder);
  inmueblesService = inject(InmueblesService);

  ngOnInit(): void {
    this.getDatos();
  }

  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  getDatos() {
    this.getInmueblesDestacados();
  }

  getInmueblesDestacados() {
    this.inmueblesService.getInmueblesDestacados(1).subscribe(
      (data: any) => {
        this.inmueblesDestacadosArray = [
          data.data[1],
          data.data[2],
          data.data[3],
          data.data[4],
        ];
      },
      (error: any) => {
        console.log(error);

        console.error('Error al obtener los inmuebles:', error);
      }
    );
  }

  abrirPestana(url: string) {
    window.open(url, '_blank');
  }

}
