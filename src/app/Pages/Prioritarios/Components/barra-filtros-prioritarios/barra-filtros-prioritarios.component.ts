import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, inject, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { TipoPropiedadEnum } from '../../../../core/enums/TipoPropiedadEnum';
import { Router } from '@angular/router';
import { InmueblesService } from '../../../../core/Inmuebles/inmuebles.service';
import { ToastrService } from 'ngx-toastr';
import { UrlParamService } from '../../../../core/configs/url-param.service';
import { map, Observable, startWith } from 'rxjs';



@Component({
  selector: 'app-barra-filtros-prioritarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatAutocompleteModule, MatInputModule,],
  templateUrl: './barra-filtros-prioritarios.component.html',
  styleUrl: './barra-filtros-prioritarios.component.scss'
})
export class BarraFiltrosPrioritariosComponent implements OnChanges {
  @ViewChild('dropdownContainer') dropdownContainer!: ElementRef | undefined;
  
    precioMinimoCtrl = new FormControl('');
    precioMaximoCtrl = new FormControl('');
    filteredMin!: Observable<number[]>;
    filteredMax!: Observable<number[]>;
  
    intervalId: any;
    currentSlide = 0;
    elementsPerPage = 12;
    searchTerm: string = '';
    elementsPerPageInicial = 3;

    @Output() filtosSelected = new EventEmitter<any>();
    filtrosSeleccionados: Map<string, any> = new Map();
  
    filtros: any = {};
    ciudades: any[] = [];
    filteredBarrios: any[] = [];
    categoriasInmuebles: any[] = [];
    inmueblesDestacadosArray: any = {};
    barrios: { data: any[] } = { data: [] };
  
    estrato: number[] = [1, 2, 3, 4, 5, 6];
    banos: (number | string)[] = [1, 2, 3, 4, 5, '+6'];
    parqueadero: (number | string)[] = [1, 2, 3, 4, 5, '+6'];
    habitaciones: (number | string)[] = [1, 2, 3, 4, 5, '+6'];
  
    seleccion = {
      estrato: [] as number[],
      banos: [] as (number | string)[],
      parqueadero: [] as (number | string)[],
      habitaciones: [] as (number | string)[],
    };
  
    @Input()cargando = false;

    cargandoLocal: boolean = false;
    isPreciosOpen = false;
    isMasFiltrosOpen = false;
    tipoFiltro: string = 'ubicacion';
    codPro: number | null = null;
  
    // Para Categorias de inmuebles
    isPropertyDropdownOpen = false;
    selectedProperty: {
      code: string;
      name: string;
      displayName?: string;
    } | null = null;
    propertyOptions: { code: string; name: string; displayName?: string }[] = [];
  
    // Para tipos de propiedades
    isEstateDropdownOpen = false;
    selectedEstate: { code: string; name: string } | null = null;
    estateOptions: { code: string; name: string }[] = [];
  
    private readonly icons = {
      property: {
        '': 'fas fa-list-ul',
        '1': 'fas fa-building',
        '2': 'fas fa-dollar-sign',
        '3': 'fas fa-home',
      } as Record<string, string>,
      estate: {
        '1': 'fas fa-building',
        '2': 'fas fa-home',
        '3': 'fas fa-home-user',
        '4': 'fas fa-store',
        '5': 'fas fa-warehouse',
        '6': 'fas fa-briefcase',
        '7': 'fas fa-map-marked-alt',
        '8': 'fas fa-tractor',
        '10': 'fas fa-home',
        '11': 'fas fa-car',
        '12': 'fas fa-umbrella-beach',
        '13': 'fas fa-store',
        '14': 'fas fa-home',
      } as Record<string, string>,
    };
  
    isLoading = true;
  
    // Injectaciones
    router = inject(Router);
    elementRef = inject(ElementRef);
    formBuilder = inject(FormBuilder);
    inmueblesService = inject(InmueblesService);
    toastr = inject(ToastrService);
    urlParamService = inject(UrlParamService);
  
    formRangos = this.formBuilder.group({
      AreaMinima: [''],
      AreaMaxima: [''],
      precioMinimo: [''],
      precioMaximo: [''],
      ubicacion: [''],
    });
  
    ngOnInit(): void {
      this.getDatos();
      this.urlParamService.eliminarParamLocalStorage('data');
      this.filteredMin = this.initAutoComplete(this.precioMinimoCtrl);
      this.filteredMax = this.initAutoComplete(this.precioMaximoCtrl);
  
  
  
  
    }

    ngOnChanges(changes: SimpleChanges): void {
    // 🔹 Cuando el padre cambia cargandoPadre -> actualizamos el loader local
    if (changes['cargando']) {
      console.log(changes['cargando']);
      
      this.cargandoLocal = this.cargando;
    }
  }
  
    scrollToTop(): void {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  
    getDatos() {
      this.getBarrios();
      this.getCiudades();
      this.getTipoPropiedad();
  
    }
  
    @HostListener('document:click', ['$event'])
    handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
  
      const isClickInTrigger = target.closest('.dropdown-trigger');
      const isClickInDropdown = target.closest('.dropdown-container');
  
      if (!isClickInTrigger && !isClickInDropdown) {
        this.cerrarTodosLosDropdowns();
        this.filteredBarrios = [];
      }
  
  
    }
  
  
    cerrarTodosLosDropdowns() {
      this.isPropertyDropdownOpen = false;
      this.isEstateDropdownOpen = false;
  
      this.isMasFiltrosOpen = false;
    }
  
    seleccionar(categoria: keyof typeof this.seleccion, valor: number | string) {
      const arr = this.seleccion[categoria] as (number | string)[];
      const index = arr.indexOf(valor);
      index > -1 ? arr.splice(index, 1) : arr.push(valor);
    }
  
    prepararFiltros() {
      const skipUbicacion =
        this.filtrosSeleccionados.get('isManualSelection') === 'true';
      this.filtrosSeleccionados.delete('isManualSelection');
  
      if (!skipUbicacion) {
        const limpiarTexto = (texto: string) => {
          return (
            texto
              ?.normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .trim()
              .toLowerCase() || ''
          );
        };
  
        const ubicacionValue = this.formRangos.value.ubicacion;
  
        if (ubicacionValue) {
          // Buscar en barrios primero
          if (this.barrios?.data) {
            const barrioEncontrado = this.barrios.data.find(
              (b) =>
                limpiarTexto(`${b.city_name},${b.name}`) ===
                limpiarTexto(ubicacionValue)
            );
  
            if (barrioEncontrado) {
              this.filtrosSeleccionados.set('city', barrioEncontrado.city_code);
              this.filtrosSeleccionados.set(
                'neighborhood_code',
                barrioEncontrado.code
              );
            }
          }
  
          // Buscar en ciudades si no se encontró en barrios
          if (!this.filtrosSeleccionados.has('city')) {
            const ciudad = this.ciudades.find(
              (c) => limpiarTexto(c.name) === limpiarTexto(ubicacionValue)
            );
            this.filtrosSeleccionados.set('city', ciudad?.code);
            this.filtrosSeleccionados.delete('neighborhood_code');
          }
        } else {
          this.filtrosSeleccionados.delete('city');
          this.filtrosSeleccionados.delete('neighborhood_code');
        }
      }
  
      if (this.selectedProperty) {
        this.filtrosSeleccionados.set('biz', this.selectedProperty.code);
      }
  
      if (this.selectedEstate) {
        this.filtrosSeleccionados.set('type', this.selectedEstate.code);
      }
  
      console.log(this.filtrosSeleccionados);
  
      if (
        this.formRangos.value.AreaMinima != '' ||
        this.formRangos.value.AreaMaxima != ''
      ) {
        this.filtrosSeleccionados.set(
          'minarea',
          this.formRangos.value.AreaMinima
        );
        this.filtrosSeleccionados.set(
          'maxarea',
          this.formRangos.value.AreaMaxima
        );
      }
  
      if (
        this.formRangos.value.precioMinimo != '' ||
        this.formRangos.value.precioMaximo != ''
      ) {
        if (
          this.selectedProperty?.code == '1' ||
          this.selectedProperty?.code == '3'
        ) {
          this.filtrosSeleccionados.set(
            'pcmin',
            this.formRangos.value.precioMinimo
          );
          this.filtrosSeleccionados.set(
            'pcmax',
            this.formRangos.value.precioMaximo
          );
        }
  
        if (
          this.selectedProperty?.code == '2' ||
          this.selectedProperty?.code == '3'
        ) {
          this.filtrosSeleccionados.set(
            'pvmin',
            this.formRangos.value.precioMinimo
          );
          this.filtrosSeleccionados.set(
            'pvmax',
            this.formRangos.value.precioMaximo
          );
        }
      }
  
      if (this.seleccion.banos.length > 0) {
        const values = this.seleccion.banos;
        if (values.includes('+6')) {
          this.filtrosSeleccionados.set('maxbathroom', 100);
          this.filtrosSeleccionados.set('minbathroom', 6);
        } else {
          this.filtrosSeleccionados.set('bathrooms', values.join(','));
        }
      }
  
      if (this.seleccion.parqueadero.length > 0) {
        const values = this.seleccion.parqueadero;
        if (values.includes('+6')) {
          this.filtrosSeleccionados.set('maxparking', 100);
          this.filtrosSeleccionados.set('minparking', 6);
        } else {
          this.filtrosSeleccionados.set('maxparking', values.join(','));
          this.filtrosSeleccionados.set('minparking', values.join(','));
        }
      }
  
      if (this.seleccion.estrato.length > 0) {
        this.filtrosSeleccionados.set(
          'stratum',
          this.seleccion.estrato.join(',')
        );
      }
  
      if (this.seleccion.habitaciones.length > 0) {
        const values = this.seleccion.habitaciones;
        if (values.includes('+6')) {
          this.filtrosSeleccionados.set('maxbedroom', 100);
          this.filtrosSeleccionados.set('minbedroom', 6);
        } else {
          this.filtrosSeleccionados.set('bedrooms', values.join(','));
        }
      }
    }
  
    getDatosPropiedad() {
     
    }
  
    verPropiedad(codPro: number) {
      this.router.navigate(['/inmueble', codPro]);
    }
  
    filterLocations() {
      const search = this.searchTerm.toLowerCase().trim();
  
      // Filtrar ciudades que coinciden
      const ciudadesFiltradas = this.ciudades.filter((ciudad) =>
        ciudad.name.toLowerCase().includes(search)
      );
  
      // Filtrar barrios que coinciden con la ciudad o nombre
      const barriosFiltrados = this.barrios.data.filter(
        (barrio: any) =>
          barrio.city_name.toLowerCase().includes(search) ||
          barrio.name.toLowerCase().includes(search)
      );
  
      // Combinar resultados y eliminar duplicados
      this.filteredBarrios = [
        ...ciudadesFiltradas.map((c) => ({ ...c, isCity: true })),
        ...barriosFiltrados,
      ].filter(
        (item, index, self) =>
          index ===
          self.findIndex((i) =>
            i.isCity ? i.code === item.code : i.code === item.code
          )
      );
  
      // Ordenar: ciudades primero, luego barrios de las ciudades encontradas
      this.filteredBarrios.sort((a: any, b: any) => {
        if (a.isCity && !b.isCity) return -1;
        if (!a.isCity && b.isCity) return 1;
        return 0;
      });
    }
  
    selectLocation(item: any) {
      if (item.isCity) {
        // Selección de ciudad
        this.searchTerm = item.name;
        this.filtrosSeleccionados.set('city', item.code);
        this.filtrosSeleccionados.delete('neighborhood_code');
      } else {
        // Selección de barrio
        this.searchTerm = `${item.city_name}, ${item.name}`;
        this.filtrosSeleccionados.set('city', item.city_code);
        this.filtrosSeleccionados.set('neighborhood_code', item.code);
      }
  
      this.filteredBarrios = [];
      this.formRangos.get('ubicacion')?.setValue(this.searchTerm);
      this.filtrosSeleccionados.set('isManualSelection', 'true');
    }
  
    getEnviarFiltros() {
     this.filtosSelected.emit(this.filtrosSeleccionados);
     console.log(this.filtrosSeleccionados);
     
    }
  
    getCiudades() {
      this.inmueblesService.getCiudades().subscribe(
        (response: any) => {
          this.ciudades = response.data;
        },
        (error: any) => {
          console.error('Error al obtener las ciudades:', error);
        }
      );
    }
  
    
  
    getTipoPropiedad() {
      this.inmueblesService.getTipoPropiedad().subscribe(
        (response: any) => {
          this.estateOptions = response.data;
          this.selectedEstate = this.estateOptions[0] || null;
        },
        (error: any) => {
          console.error('Error al obtener los tipos de propiedad:', error);
        }
      );
    }
  
    
  
    getBarrios() {
      this.inmueblesService.getBarrios().subscribe(
        (data: any) => {
          this.barrios = data;
        },
        (error: any) => {
          console.log(error);
          console.error('Error al obtener los barrios:', error);
        }
      );
    }
  
    getIcon(type: 'property' | 'estate', option: any): string {
      const defaultIcons = {
        property: 'fas fa-home',
        estate: 'fas fa-question-circle',
      };
  
      if (!option && type === 'property') {
        return 'fas fa-list-ul';
      }
  
      if (option) {
        const code = typeof option === 'object' ? option.code : '';
        const iconMap = this.icons[type];
  
        return iconMap?.[code] || defaultIcons[type];
      } else {
        return '';
      }
    }
  
    selectOption(type: 'property' | 'estate', option: any): void {
      if (type === 'property') {
        this.selectedProperty = option;
        this.isPropertyDropdownOpen = false;
      } else {
        this.selectedEstate = option;
        this.isEstateDropdownOpen = false;
      }
    }
  
    toggleDropdown(type: 'property' | 'estate' | 'masFiltros' | 'precios'): void {
      if (type === 'property') {
        this.isPropertyDropdownOpen = !this.isPropertyDropdownOpen;
        this.isEstateDropdownOpen = false;
        this.isMasFiltrosOpen = false;
        this.isPreciosOpen = false;
      } else if (type === 'masFiltros') {
        this.isMasFiltrosOpen = !this.isMasFiltrosOpen;
        this.isPropertyDropdownOpen = false;
        this.isEstateDropdownOpen = false;
        this.isPreciosOpen = false;
      } else if (type === 'precios') {
        this.isPreciosOpen = !this.isPreciosOpen;
        this.isPropertyDropdownOpen = false;
        this.isEstateDropdownOpen = false;
        this.isMasFiltrosOpen = false;
      } else {
        this.isEstateDropdownOpen = !this.isEstateDropdownOpen;
        this.isPropertyDropdownOpen = false;
        this.isMasFiltrosOpen = false;
        this.isPreciosOpen = false;
      }
    }
  
    getButtonClass(selected: boolean): string {
      const base = 'flex items-center px-3 py-2 text-sm rounded-md';
      return selected
        ? `${base} bg-[#080E36] text-white`
        : `${base} bg-blue-100 text-blue-700`;
    }
  
    redirigirFiltros() {
      this.isPreciosOpen = false;
      this.cargandoLocal = true;
      console.log(this.cargandoLocal);
      
  
      console.log(this.filtrosSeleccionados);
  
      if (this.precioMaximoCtrl.value !== "" && this.precioMinimoCtrl.value !== "") {
        if (this.selectedProperty?.code === TipoPropiedadEnum.VENTA ) {
          this.filtrosSeleccionados.set('pvmin', this.getNumericValue(this.precioMinimoCtrl));
          this.filtrosSeleccionados.set('pvmax', this.getNumericValue(this.precioMaximoCtrl));
        }
  
        if (this.selectedProperty?.code == TipoPropiedadEnum.ARRIENDO ) {
          this.filtrosSeleccionados.set('pcmin', this.getNumericValue(this.precioMinimoCtrl));
          this.filtrosSeleccionados.set('pcmax', this.getNumericValue(this.precioMaximoCtrl));
        }
  
        if (this.selectedProperty?.code == TipoPropiedadEnum.VENTA_ARRIENDO ) {
          this.filtrosSeleccionados.set('pcmin', this.getNumericValue(this.precioMinimoCtrl));
          this.filtrosSeleccionados.set('pcmax', this.getNumericValue(this.precioMaximoCtrl));
         
        }
  
      }
  
  
      this.prepararFiltros();
      this.getEnviarFiltros();
    }
  
    abrirPestana(url: string) {
      window.open(url, '_blank');
    }
  
    clearSearch() {
      this.searchTerm = '';
      this.filteredBarrios = [];
    }
  
    private initAutoComplete(ctrl: FormControl): Observable<number[]> {
      return ctrl.valueChanges.pipe(
        startWith(''),
        map(value => this.generateSuggestions(value))
      );
    }
  
    private generateSuggestions(value: string | number | null): number[] {
      const num = parseInt((value || '').toString().replace(/\D/g, ''), 10);
      if (!num || isNaN(num)) return [];
  
      const multipliers = [1, 10, 100, 1000, 10000];
      const suggestions = multipliers.map(m => num * m).filter(v => v <= 50000000000); // por ejemplo, máximo 500 millones
  
      return suggestions;
    }
  
  
    onMinSelected(event: any, trigger: MatAutocompleteTrigger) {
      const value = event.option.value;
      this.precioMinimoCtrl.setValue(value, { emitEvent: true });
      this.filtrosSeleccionados.set('pcmin', this.getNumericValue(this.precioMinimoCtrl));
      // 👇 Cierra el panel
      trigger.closePanel();
    }
  
    onMaxSelected(event: any, trigger: MatAutocompleteTrigger) {
      const value = event.option.value;
      this.precioMaximoCtrl.setValue(value, { emitEvent: true });
      this.filtrosSeleccionados.set('pcmax', this.getNumericValue(this.precioMaximoCtrl));
      // 👇 Cierra el panel
      trigger.closePanel();
    }
  
  
    formatCurrencyInput(ctrl: FormControl): void {
      const rawValue = ctrl.value?.toString().replace(/\D/g, '') || '';
      if (!rawValue) {
        ctrl.setValue('', { emitEvent: false });
        return;
      }
  
      const numericValue = parseInt(rawValue, 10);
      const formattedValue = numericValue.toLocaleString('es-CO'); // Ej: 1.000.000
  
      // Actualizamos el input solo visualmente
      ctrl.setValue(formattedValue, { emitEvent: false });
    }
  
    getNumericValue(ctrl: FormControl): number {
      return parseInt(ctrl.value.toString().replace(/\D/g, ''), 10) || 0;
    }
  
    onInputBlur(trigger: MatAutocompleteTrigger): void {
      trigger.closePanel();
    }

}
