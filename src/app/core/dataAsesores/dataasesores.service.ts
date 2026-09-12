import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DataasesoresService {

  private asesores: any[] = [
    {
      "id": 11370,
      "nombre": "Juan Pablo Hoyos",
      "cargo": "Ejecutivo Comercial de Alto Valor",
      "telefono": "350 223 9363",
      "email": "juanpabloh.rentaraiz@gmail.com",
      "imagen": "assets/images/JuanHoyos-rr24-210x210.jpg"
    },
    {
      "id": 41112,
      "nombre": "Sebastián Ospina",
      "cargo": "Ejecutivo Comercial de Alto Valor",
      "telefono": "301 205 0207",
      "email": "sebas.rentaraiz@gmail.com",
      "imagen": "assets/images/SebastianOspina-rr24-210x210.jpg"
    },
    {
      "id": 59504,
      "nombre": "Lenys Cuberos",
      "cargo": "Coordinadora Comercial",
      "telefono": "314 543 8665",
      "email": "direccioncomercial.com@gmail.com",
      "imagen": "assets/images/Lenys-rr24-210x210.jpg"

    },
    {
      "id": 67953,
      "nombre": "Andres Mejia",
      "cargo": "Ejecutivo Comercial de Alto Valor",
      "telefono": "311 785 8793",
      "email": "andresmejia.rentaraiz@gmail.com",
      "imagen": "assets/images/AndresMejia-rr24-210x210.jpg"
    },
    {
      "id": 69627,
      "nombre": "David Peláez",
      "cargo": "Ejecutivo Comercial de Alto Valor",
      "telefono": "300 202 5783",
      "email": "david.rentaraiz@gmail.com",
      "imagen": "assets/images/DavidPelaez-rr24-210x210.jpg"
    },
    {
      "id": 45849,
      "nombre": "Juan Pablo Ospina",
      "cargo": "Ejecutivo Comercial de Alto Valor",
      "telefono": "350 223 9393",
      "email": "Juanpablo.rentaraiz@gmail.com",
      "imagen": "assets/images/JuanOspina-rr24-210x210.jpg"
    },
    {
      "id": 72656,
      "nombre": "Renta Raíz",
      "cargo": "Equipo Comercial",
      "telefono": "314 543 8665",
      "email": "info@rentaraiz.co",
      "imagen": "assets/images/rentaraiz.png"
    }
  ];

  constructor() { }

  getAsesores(): any[] {
    return this.asesores;
  }

  getAsesorById(id: number | string): any {
    return this.asesores.find(asesor => Number(asesor.id) === Number(id));
  }

  getAsesorByNombre(nombre: string): any {
    return this.asesores.find(asesor => asesor.nombre === nombre);
  }

  getDefaultAsesor(): any {
    return {
      id: 72656,
      nombre: 'Renta Raíz',
      cargo: 'Equipo Comercial',
      telefono: '314 543 8665',
      email: 'info@rentaraiz.co',
      imagen: 'assets/images/rentaraiz.png'
    };
  }
}
