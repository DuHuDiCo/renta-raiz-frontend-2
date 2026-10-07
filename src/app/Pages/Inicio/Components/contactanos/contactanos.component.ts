import { Component, inject, OnInit } from '@angular/core';
import { NavbarComponent } from '../../../../shared/navbar/navbar.component';
import { InmueblesService } from '../../../../core/Inmuebles/inmuebles.service';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BotonesFlotantesComponent } from "../../../../shared/botones-flotantes/botones-flotantes.component";
import { FooterComponent } from "../../../../shared/footer/footer.component";
import { BarraFiltrosComponent } from "../../../../shared/barra-filtros/barra-filtros.component";
import { ToastrService } from 'ngx-toastr';
import { VolverComponent } from "../../../../shared/volver/volver.component";
import { OffcanvasWishlistComponent } from '../offcanvas-wishlist/offcanvas-wishlist.component';
import { ModalWishlistComponent } from '../../../../shared/modal-wishlist/modal-wishlist.component';
import { WishlistServiceService } from '../../../../core/wishlist/wishlist-service.service';


@Component({
  selector: 'app-contactanos',
  standalone: true,
  imports: [NavbarComponent, FormsModule, CommonModule, ReactiveFormsModule, BotonesFlotantesComponent, FooterComponent, BarraFiltrosComponent, VolverComponent, OffcanvasWishlistComponent, ModalWishlistComponent],
  templateUrl: './contactanos.component.html',
  styleUrl: './contactanos.component.scss'
})
export class ContactanosComponent implements OnInit {

  cargando = false;
  email = "coordinadoracomercial@rentaraiz.com";

  // Injeccciones
  toastr = inject(ToastrService);
  formBuilder = inject(FormBuilder);
  inmueblesService = inject(InmueblesService);

  // Formularios
  formContacto = this.formBuilder.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required, Validators.minLength(10)]],
    mensaje: ['', [Validators.required, Validators.minLength(10)]],
  });


  mostrarModalRecorrido = false

  mostrarOffcanvas: boolean = false;
  minimizarOffcanvas: boolean = true;

  favService = inject(WishlistServiceService);


  ngOnInit(): void {
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }

  agregarFavorito(propiedad: any) {


    this.favService.agregar(propiedad);

    this.toggleOffcanvas()
  }

  sincronizarCierre() {
    console.log("El hijo me avisó que se cerró. Sincronizando variables...");

    // Forzamos las variables a FALSE (no usamos toggle/signo de exclamación aquí)
    this.mostrarOffcanvas = false;
    this.minimizarOffcanvas = false;
    console.log(this.minimizarOffcanvas);

  }

  recibirValorModalRecorrido() {
    this.mostrarModalRecorrido = true;
  }

  toggleOffcanvas() {
    this.mostrarOffcanvas = !this.mostrarOffcanvas;
    setTimeout(() => {
      this.minimizarOffcanvas = !this.minimizarOffcanvas;
    }, 100);

    console.log("minimizado" + this.minimizarOffcanvas);

  }

  createContacto() {
    if (this.formContacto.invalid) {
      this.toastr.error('Complete todos los campos', 'Error', {
        closeButton: true,
        positionClass: "toast-bottom-right",
        progressBar: true,
        timeOut: 5000,
      });
      return;
    }

    this.cargando = true;

    const obj = {
      nombre: this.formContacto.get('nombre')?.value,
      email: this.formContacto.get('email')?.value,
      telefono: this.formContacto.get('telefono')?.value,
      mensaje: this.formContacto.get('mensaje')?.value,
      fuente: 'contactanos',
    };
    this.inmueblesService.createContacto(obj).subscribe(
      (response: any) => {
        this.vaciarFormulario();
        this.toastr.success('¡Gracias!', 'Tu mensaje ha sido enviado con éxito!', {
          closeButton: true,
          positionClass: "toast-bottom-right",
          progressBar: true,
          timeOut: 5000,
        });

        this.cargando = false;
      },
      (error: any) => {
        console.error('Error al enviar el contacto:', error);
      }
    );
  }

  vaciarFormulario() {
    this.formContacto.reset();
  }

  abrirPestana(url: string) {
    window.open(url, '_blank');
  }
}
