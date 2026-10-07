import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-envio-exitoso',
  standalone: true,
  imports: [],
  templateUrl: './envio-exitoso.component.html',
  styleUrl: './envio-exitoso.component.scss'
})
export class EnvioExitosoComponent implements OnInit {


  router = inject(ActivatedRoute);

  ngOnInit(): void {
    // La redirección a WhatsApp solo aplica en el navegador (en SSR retrasaría la respuesta 3 s).
    if (typeof window === 'undefined') return;
    setTimeout(() => {
      this.enviarWthatsapp();
    }, 3000);
  } enviarWthatsapp() {

    var param = this.router.snapshot.queryParamMap.get('urlInmueble');

    if (param) {

      var paramCode = atob(param); // Decodificas la URL
      var variablesAll = paramCode.split('?')[1].split('&');

      var utm  =['utm_source', 'fbclid', 'utm_campaign', 'utm_content', 'utm_term'];

      var variables = variablesAll.filter(function (el) {
        return !utm.includes(el.split('=')[0]);
      });

      
      
      
      console.log(variables);


      var rowVariables = []

      for (var p in variables) {
        var pair = variables[p].split('=');

        rowVariables.push(pair[1])
      }

      console.log(rowVariables);

      var dataIA = {
        "description": rowVariables[0],
        "Lugar": rowVariables[1],
        "biz": rowVariables[2],
        "category": rowVariables[3]

      }


      var urlCode = encodeURIComponent(paramCode);
      // var text = `&text=Hola%2C%20LÍA,%20estoy%20interesado/a%20en%20este%20inmueble:%20${urlCode}`;

      const mensaje = `Hola LÍA, estoy interesado/a en esta propiedad.%0A` +
        `Link: ${urlCode}%0A` +
        `Descripción: ${dataIA.description}%0A` +
        `Lugar: ${dataIA.Lugar}%0A` +
        `Arriendo: ${dataIA.biz}%0A` +
        `Categoría: ${dataIA.category}%0A%0A`;
        console.log(mensaje);
        

      window.location.href = `https://api.whatsapp.com/send?phone=573007088061&text=${mensaje}`;
    } else {
      console.error("No llegó el parámetro urlInmueble");
    }



  }
}
