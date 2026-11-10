import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { InmueblesService } from '../../core/Inmuebles/inmuebles.service';
import { UrlParamService } from '../../core/configs/url-param.service';

@Component({
  selector: 'app-navbar-2',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar-2.component.html',
  styleUrl: './navbar-2.component.scss',
})
export class NavbarComponent2 implements OnInit {
  @ViewChild('nosotrosDropdown') nosotrosDropdownRef: ElementRef | undefined;
  @ViewChild('arriendosDropdown') arriendosDropdownRef: ElementRef | undefined;
  @ViewChild('clientesDropdown') clientesDropdownRef: ElementRef | undefined;

  isScrolled = false;
  elementsPerPage = 12;
  showNosotrosDropdown = false;
  showClientesDropdown = false;
  showArriendosDropdown = false;
  showDestacadosDropdown = false;
  @Input() alwaysScrolled = false;
  isMobileMenuOpen: boolean = false;

  filtrosInmueblesVenta: Map<string, any> = new Map();
  filtrosInmueblesArriendo: Map<string, any> = new Map();
  filtrosInmueblesDestacados: Map<string, any> = new Map();

  // Injecciones
  _router = inject(Router);
  inmueblesService = inject(InmueblesService);
  urlParamService = inject(UrlParamService);

  ngOnInit(): void {
    if (this.alwaysScrolled) {
      this.isScrolled = true;
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (!this.alwaysScrolled) {
      this.isScrolled = window.scrollY > 50;
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  redirectTo(url: string): void {
    this._router.navigate([url]);
  }

  toggleNosotrosDropdown(event: MouseEvent) {
    event.preventDefault();
    this.showNosotrosDropdown = !this.showNosotrosDropdown;
  }

  toggleArriendosDropdown(event: MouseEvent) {
    event.preventDefault();
    this.showArriendosDropdown = !this.showArriendosDropdown;
  }

  toggleClientesDropdown(event: MouseEvent) {
    event.preventDefault();
    this.showClientesDropdown = !this.showClientesDropdown;
  }

  toggleDestacadosDropdown(event: MouseEvent) {
    event.preventDefault();
    this.showDestacadosDropdown = !this.showDestacadosDropdown;
  }

  closeDropdown() {
    this.showNosotrosDropdown = false;
  }

  navigateTo(route: string) {
    this._router.navigate([route]);
    this.closeDropdown();
  }

  enviarFiltroVenta() {
    this.filtrosInmueblesVenta.clear();
    this.filtrosInmueblesVenta.set('biz', '2');

    const filtrosObj = Object.fromEntries(this.filtrosInmueblesVenta);
    const obj = {
      ...filtrosObj,
      page: 1,
    };
    this.inmueblesService.getFiltrosEnviar(obj, this.elementsPerPage).subscribe(
      (response: any) => {
        this._router
          .navigateByUrl('/', { skipLocationChange: true })
          .then(() => {
            this._router.navigate(['/filtros'], {
              state: {
                resultados: response.data,
                paginacion: response,
                filtros: obj,
              },
            });
          });
      },
      (error: any) => {
        console.error('Error al enviar los filtros:', error);
      }
    );
  }

  enviarFiltroArriendo(tipo: string) {
    this.filtrosInmueblesArriendo.clear();

    if (tipo === 'diamante') {
      this.filtrosInmueblesArriendo.set('pcmin', 15000001);
    } else if (tipo === 'oro') {
      this.filtrosInmueblesArriendo.set('pcmin', 8000000);
      this.filtrosInmueblesArriendo.set('pcmax', 15000000);
    } else if (tipo === 'plata') {
      this.filtrosInmueblesArriendo.set('pcmin', 2000000);
      this.filtrosInmueblesArriendo.set('pcmax', 7999999);
    }

    this.filtrosInmueblesArriendo.set('biz', '1');

    const filtrosObj = Object.fromEntries(this.filtrosInmueblesArriendo);
    const obj = {
      ...filtrosObj,
      page: 1,
    };

    console.log('filtros enviados:', obj);

    this.inmueblesService.getFiltrosEnviar(obj, this.elementsPerPage).subscribe(
      (response: any) => {
        
        
        this._router.navigate([`/filtros`], {
          state: {
            resultados: response.data,
            paginacion: response,
            filtros: obj,
          },
          queryParams: { tipo: tipo }
        });
      },
      (error: any) => {
        console.error('Error al enviar los filtros:', error);
      }
    );
  }

  abrirBrochure() {
    window.open('https://oferta.rentaraiz.co/flipbook/brochure-renta-raiz/', '_blank');
  }

  redirigirVistaInicial() {
    this._router.navigate(['/']);
  }
}
