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
      "imagen": "assets/images/JuanHoyos-rr24-210x210.jpg",
      "slug": "juan-pablo-hoyos",
      "avatar": "assets/images/JuanHoyos-rr24-210x210.jpg",
      "imagenCompartir": "assets/images/asesores/juan-pablo-hoyos-og.jpg",
      "retrato": "assets/images/asesores/juan-pablo-hoyos-retrato.webp",
      "lema": "Servicio de lujo a medida",
      "especialidad": "Experto en ventas y arriendo de lujo",
      "descripcion": "Atención exclusiva y personalizada.",
      "facebook": "https://www.facebook.com/profile.php?id=61566383041269",
      "instagram": "https://www.instagram.com/juanpahoyosrealtor/",
      "tiktok": "https://www.tiktok.com/@juanpahoyosrealtor"
    },
    {
      "id": 41112,
      "nombre": "Sebastián Ospina",
      "cargo": "Ejecutivo Comercial de Alto Valor",
      "telefono": "301 205 0207",
      "email": "sebas.rentaraiz@gmail.com",
      "imagen": "assets/images/SebastianOspina-rr24-210x210.jpg",
      "slug": "sebastian-ospina",
      "avatar": "assets/images/SebastianOspina-rr24-210x210.jpg",
      "imagenCompartir": "assets/images/asesores/sebastian-ospina-og.jpg",
      "retrato": "assets/images/asesores/sebastian-ospina-retrato.webp",
      "lema": "Servicio de lujo a medida",
      "especialidad": "Especialista en arriendos y ventas premium",
      "descripcion": "Atención exclusiva y personalizada.",
      "facebook": "https://www.facebook.com/profile.php?id=61560075269190",
      "instagram": "https://www.instagram.com/sebastianospina.realtor/"
    },
    {
      "id": 59504,
      "nombre": "Lenys Cuberos",
      "cargo": "Coordinadora Comercial",
      "telefono": "314 543 8665",
      "email": "direccioncomercial.com@gmail.com",
      "imagen": "assets/images/Lenys-rr24-210x210.jpg",
      "slug": "lenys-cuberos",
      "avatar": "assets/images/Lenys-rr24-210x210.jpg"

    },
    {
      "id": 67953,
      "nombre": "Andrés Mejía",
      "cargo": "Ejecutivo Comercial de Alto Valor",
      "telefono": "311 785 8793",
      "email": "andresmejia.rentaraiz@gmail.com",
      "imagen": "assets/images/AndresMejia-rr24-210x210.jpg",
      "slug": "andres-mejia",
      "avatar": "assets/images/AndresMejia-rr24-210x210.jpg",
      "imagenCompartir": "assets/images/asesores/andres-mejia-og.jpg",
      "retrato": "assets/images/asesores/andres-mejia-retrato.webp",
      "lema": "Servicio de lujo a medida",
      "especialidad": "Especialista en arriendos y ventas premium",
      "descripcion": "Atención exclusiva y personalizada.",
      "facebook": "https://www.facebook.com/profile.php?id=61556510608729",
      "instagram": "https://www.instagram.com/andresmejias.realtor/",
      "tiktok": "https://www.tiktok.com/@andresmejiarealtor"
    },
    {
      "id": 69627,
      "nombre": "David Peláez",
      "cargo": "Ejecutivo Comercial de Alto Valor",
      "telefono": "300 202 5783",
      "email": "david.rentaraiz@gmail.com",
      "imagen": "assets/images/DavidPelaez-rr24-210x210.jpg",
      "slug": "david-pelaez",
      "avatar": "assets/images/DavidPelaez-rr24-210x210.jpg",
      "imagenCompartir": "assets/images/asesores/david-pelaez-og.jpg",
      "retrato": "assets/images/asesores/david-pelaez-retrato.webp",
      "lema": "Servicio de lujo a medida",
      "especialidad": "Especialista en arriendos y ventas premium",
      "descripcion": "Atención exclusiva y personalizada.",
      "facebook": "https://www.facebook.com/profile.php?id=61560277010923",
      "instagram": "https://www.instagram.com/davidpelaez.realtor/"
    },
    {
      "id": 45849,
      "nombre": "Juan Pablo Ospina",
      "cargo": "Director Comercial",
      "telefono": "350 223 9393",
      "email": "Juanpablo.rentaraiz@gmail.com",
      "imagen": "assets/images/JuanOspina-rr24-210x210.jpg",
      "slug": "juan-pablo-ospina",
      "avatar": "assets/images/JuanOspina-rr24-210x210.jpg",
      "imagenCompartir": "assets/images/asesores/juan-pablo-ospina-og.jpg",
      "retrato": "assets/images/asesores/juan-pablo-ospina-retrato.webp",
      "lema": "10 años dominando el mercado del lujo",
      "especialidad": "Experto en ventas y arriendo de lujo",
      "descripcion": "Atención exclusiva y personalizada.",
      "instagram": "https://www.instagram.com/juanpablorealtor/",
      "tiktok": "https://www.tiktok.com/@jotabrokers"
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

  /** Asesores con página propia (/asesor/:slug), en el orden en que aparecen en "Nuestro equipo". */
  getEquipo(): any[] {
    return this.asesores.filter(asesor => asesor.slug);
  }

  getAsesorBySlug(slug: string): any {
    return this.asesores.find(asesor => asesor.slug === slug);
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
