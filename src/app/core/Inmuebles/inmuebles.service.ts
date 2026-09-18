import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class InmueblesService {
  Propiedades: any[] = [];

  http = inject(HttpClient);

  getTodosInmuebles() {
    return this.http.get(`${environment.baseUrl}/properties/inmuebles`);
  }

  getInmueblesDestacados(page: number) {
    return this.http.get(
      `${environment.baseUrl}/properties/destacados?page=${page}`
    );
  }

  getTipoPropiedad() {
    return this.http.get(`${environment.baseUrl}/properties/tipoPropiedad`);
  }

  getCategoriasInmuebles() {
    return this.http.get(
      `${environment.baseUrl}/properties/categoriasInmueble`
    );
  }

  getFiltros() {
    return this.http.get(`${environment.baseUrl}/properties/filtros`);
  }

  getFiltrosEnviar(filtros: any, elementsPerPage: number) {
    return this.http.get(
      `${environment.baseUrl}/properties/?elementsPerPage=${elementsPerPage}`,
      { params: filtros }
    );
  }

  createContacto(contacto: any) {
    return this.http.post(`${environment.baseUrl}/contacto/`, contacto);
  }

  createContactoInmueble(contacto: any) {
    return this.http.post(`${environment.baseUrl}/contacto-inmueble`, contacto);
  }

  getDatosPropiedad(codPro: number) {
    return this.http.get(`${environment.baseUrl}/properties/${codPro}`);
  }

  getCiudades() {
    return this.http.get(`${environment.baseUrl}/properties/ciudades`);
  }

  getBarrios() {
    return this.http.get(`${environment.baseUrl}/properties/barrios`);
  }

  publicarInmueble(inmueble: any) {
    return this.http.post(
      `${environment.baseUrl}/properties/publicarInmueble`,
      inmueble
    );
  }

  setPropiedades(propiedades: any[]) {
    this.Propiedades = propiedades;
  }

  getPropiedades() {
    return this.Propiedades;
  }

  getPropiedadesByAsesor(asesorID: number, page: number) {
    return this.http.get(
      `${environment.baseUrl}/properties/asesor/${asesorID}?page=${page}`
    );
  }
}
