import { Component, inject, OnInit } from '@angular/core';
import { NavbarComponent } from '../../../../shared/navbar/navbar.component';
import { BotonesFlotantesComponent } from '../../../../shared/botones-flotantes/botones-flotantes.component';
import { FooterComponent } from '../../../../shared/footer/footer.component';
import { BarraFiltrosComponent } from '../../../../shared/barra-filtros/barra-filtros.component';
import { InmueblesService } from '../../../../core/Inmuebles/inmuebles.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { VolverComponent } from '../../../../shared/volver/volver.component';

@Component({
  selector: 'app-politicar-privacidad',
  standalone: true,
  imports: [
    RouterLink,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NavbarComponent,
    BotonesFlotantesComponent,
    FooterComponent,
    BarraFiltrosComponent,
    VolverComponent,
  ],
  templateUrl: './politicar-privacidad.component.html',
  styleUrl: './politicar-privacidad.component.scss',
})
export class PoliticarPrivacidadComponent implements OnInit {
  inmueblesDestacadosArray: any = {};

  inmueblesService = inject(InmueblesService);
  router = inject(Router);

  ngOnInit(): void {
    // window.scrollTo(0, 0);
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

}
