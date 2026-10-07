import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';



export interface Favorito {
  codigo: string;
  nombre: string;
  imagen: string;
}
@Injectable({
  providedIn: 'root'
})
export class WishlistServiceService {
private favoritosSubject = new BehaviorSubject<any[]>(this.cargarFavoritos());
  favoritos$ = this.favoritosSubject.asObservable();

  public cargarFavoritos(): Favorito[] {
    if (typeof localStorage === 'undefined') return [];
    return JSON.parse(localStorage.getItem('favoritos') || '[]');
  }

  private guardarFavoritos(favoritos: Favorito[]): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('favoritos', JSON.stringify(favoritos));
  }

  agregar(fav: any): void {
    console.log("inmueble que llega",fav);
    
    const favoritos = this.favoritosSubject.value;
    if (!favoritos.some(f => f.codpro === fav.codpro)) {
      const nuevos = [...favoritos, fav];
      this.favoritosSubject.next(nuevos);
      this.guardarFavoritos(nuevos);
    }else{
      this.favoritosSubject.next(this.cargarFavoritos());
    }

  }

  eliminar(codigo: string): void {
    const nuevos = this.favoritosSubject.value.filter(f => f.codpro !== codigo);
    this.favoritosSubject.next(nuevos);
    this.guardarFavoritos(nuevos);
  }

  eliminarAll(): void {
    if (typeof localStorage !== 'undefined') localStorage.removeItem('favoritos');
    this.favoritosSubject.next([]);
  }
}
