import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UrlParamService {

  constructor() { }


  guardarParamLocalStorage(key: string, value: string) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  }

  obtenerParamLocalStorage(key: string) {
    if (typeof localStorage === 'undefined') return null;
  var valor = localStorage.getItem(key);
    if (valor) {
      return valor;
    }
    return null;
  }

  eliminarParamLocalStorage(key: string) {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  }

  
}
