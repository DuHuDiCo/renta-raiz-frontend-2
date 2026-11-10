# Contrato: asistente del portal (chat)

Chat de servicio al cliente del portal: solo preguntas y respuestas, no capta datos personales. La única excepción es el botón "Escribir al asesor" ante el interés en un inmueble en venta ya identificado (ver "Contacto del asesor en ventas"). El backend arma el prompt, llama a la IA y devuelve la respuesta validada. El modelo del front está en `src/app/core/asistente/asistente.models.ts`.

## Endpoint

`POST /api/v1/asistente/mensajes` (`{environment.baseUrl}/asistente/mensajes`): mismo JWT e interceptor que los demás endpoints. El front espera la respuesta como máximo 30 s.

### Petición

```json
{
  "sesionId": "0b6f3c1e-8a1d-4a5e-9f4b-2c7d1e9a6b3f",
  "mensaje": "6945 es para arrendar o comprar?",
  "origen": "texto",
  "contexto": {
    "ruta": "/publicar-inmueble",
    "pagina": "publicar-inmueble",
    "titulo": "Publica tu propiedad | Renta Raíz",
    "recorrido": [6945, 7564, 7562, 7539, 7541],
    "utm": { "utm_source": "facebook" }
  }
}
```

| Campo | Regla |
|---|---|
| `sesionId` | UUID generado en el navegador; identifica la conversación (vigente 24 h sin escribir). |
| `mensaje` | Texto del visitante, recortado, hasta 1000 caracteres. |
| `origen` | `texto` o `sugerencia` (tocó una respuesta rápida). |
| `contexto.ruta` | Ruta sin parámetros de campaña. |
| `contexto.pagina` | `inicio`, `propiedad`, `listado`, `blog`, `contacto`, `publicar-inmueble`, `avaluos`, `nosotros` u `otra`. |
| `contexto.titulo` | Título de la página. |
| `contexto.codpro` | Solo en `propiedad`: código Domus del inmueble que está viendo. |
| `contexto.filtros`, `numeroPagina` | Solo en `listado`: filtros aplicados (claves de `GET /properties/`) y número de página. |
| `contexto.inmueblesVisibles` | Códigos de los inmuebles en pantalla, en orden. En `listado` son los de la página abierta; **ahora también llega en cualquier otra página con tarjetas** (inicio, portafolio, blog…), máx. 30. |
| `contexto.enFoco` | **Nuevo, opcional.** Códigos de los que habló el asistente en su respuesta anterior (el `enFoco` que devolvió), o los que destacó el panel "Con IA" del listado. Máx. 10. Ausente si no hay; se borra con "Nueva conversación". |
| `contexto.recorrido` | **Nuevo, opcional.** Códigos de "Mi recorrido", en el orden en que se agregaron, sin repetir, como máximo 20. Ausente si está vacío. |
| `contexto.utm` | Atribución de campaña guardada en el navegador. |

### Respuesta

```json
{
  "sesionId": "0b6f3c1e-8a1d-4a5e-9f4b-2c7d1e9a6b3f",
  "mensajes": ["El inmueble 6945 es un apartamento en arriendo en Envigado…"],
  "sugerencias": ["¿Cómo agendo una visita?"],
  "inmuebles": [
    { "codpro": 6945, "type": "APARTAMENTO", "biz": "ARRIENDO", "biz_code": 1, "neighborhood": "Urbanización…", "city": "Envigado",
      "rent": 3500000, "saleprice": 0, "bedrooms": 3, "bathrooms": 2, "area_cons": 90, "image1": "https://…" }
  ],
  "busqueda": null
}
```

- `mensajes`: uno o varios globos, en orden.
- `sugerencias`: respuestas rápidas para el siguiente turno (opcional).
- `inmuebles`: tarjetas debajo del último globo, con los nombres de Domus; `null` o ausente si no hay.
- `busqueda`: cuando las tarjetas salen de una búsqueda por filtros (`filtros` con las claves de `GET /properties/` y `etiquetas` para los chips); muestra "Ver todos en el listado". **También para los inmuebles parecidos** al de la ficha: enviar los filtros con los que se buscaron (p. ej. `{ "city": "5266", "biz": "1", "type": "2", "pcmin": "7500000", "pcmax": "22500000" }`), para que el listado muestre todos y no solo las tarjetas. `null` para inmuebles consultados por código o del recorrido.
- `enFoco` (**nuevo, opcional**): códigos de los inmuebles de los que trata esta respuesta, en el orden en que se nombraron (`[7017]` en "el más caro es el 7017"). Solo códigos que de verdad nombró o mostró. Si no viene, el front usa los de `inmuebles`.
- `contactoAsesor` (**nuevo, opcional**): `{ "codpro": 7017 }` para mostrar el botón "Escribir al asesor". Solo si Domus confirma que ese código existe y está en venta; en ese caso no se envían `inmuebles` de ese código (la tarjeta muestra el precio). El número de WhatsApp lo pone el front.

### "Ver todos en el listado" para los parecidos (respaldo en el front)

Mientras el backend no envíe `busqueda` con los parecidos, el front la arma cuando se cumplen las tres: la página es una ficha (`contexto.pagina = 'propiedad'`), la respuesta trae `inmuebles` sin `busqueda`, y el mensaje no pedía códigos. Usa los filtros de "Inmuebles similares" de la ficha (`core/similares/similares.ts`): misma ciudad, negocio y tipo, y precio ±50 %. Si el backend envía `busqueda`, se usa la del backend.

## Inmuebles por código y "Mi recorrido" (lo nuevo que debe hacer el backend)

### Detectar códigos en el mensaje

Es código:
- un número de 3 a 5 cifras junto a "código", "cód", "cod", "inmueble", "propiedad", "ref", "referencia" o "#": "inmueble 6945", "código 6945", "#6945";
- un número de 3 a 5 cifras al inicio del mensaje: "6945", "6945 es para arrendar?".

No es código:
- precios ("4.500.000", "$3000000", "850 millones") ni números con más de 5 cifras (teléfonos);
- cantidades seguidas de "habitaciones", "alcobas", "baños", "parqueaderos", "garaje", "m2", "m²", "metros", "estrato", "piso".

Como máximo 5 códigos por mensaje. La función `codigosEnMensaje` de `src/app/core/asistente/asistente-chat.mock.ts` implementa estas reglas y sirve de referencia.

### Consultar y responder

- Consultar en Domus los códigos detectados y los de `contexto.recorrido` (caché de unos 5 minutos por código). Un mensaje con muchos números no debe disparar más consultas que esas.
- Darle a la IA solo datos públicos de la ficha: código, tipo, negocio, barrio, ciudad, canon o precio de venta, administración, área, habitaciones, baños, parqueaderos, estrato, amoblado y URL de la ficha. Nada del propietario, ni la dirección exacta, ni datos internos de Domus.
- Responder sobre un inmueble solo con esos datos; si falta un dato, que un asesor lo confirma. No inventar precios ni características.
- Código inexistente o inmueble no disponible: "No encontré disponible el inmueble con código X" y ofrecer opciones parecidas (no "no tengo información").
- Con `recorrido`: comparar, ordenar por precio, filtrar por negocio o zona, y recordar que puede pulsar "Agendar visita" en "Mi recorrido". Sin `recorrido`: decir que aún no tiene inmuebles en el recorrido y cómo agregarlos.
- Devolver en `inmuebles` las tarjetas de los inmuebles consultados por código, y las del recorrido solo cuando la respuesta señale inmuebles concretos ("el más barato es…").

### Casos de prueba

| Mensaje | Esperado |
|---|---|
| "6945 es para arrendar o comprar?" | Detecta 6945; responde negocio y precio reales + tarjeta. |
| "quiero que me des información del inmueble 6945" | Detecta 6945; resumen de la ficha + tarjeta. |
| "código 99999" (no existe) | "No encontré disponible el inmueble con código 99999…" y ofrece parecidos. |
| "busco algo de 4.500.000 en Envigado" | Sin código; búsqueda normal. |
| "3 habitaciones y 2 baños" | Sin código. |
| "mi número es 3001234567" | Sin código. |
| "¿cuál de mi recorrido es el más barato?" con `recorrido` de 5 códigos | Compara los 5; responde el más barato + su tarjeta. |
| Lo mismo sin `recorrido` | Explica que no tiene inmuebles en el recorrido y cómo agregarlos. |

## Propiedades en foco y comparaciones (lo nuevo que debe hacer el backend)

### Qué falla hoy

Listado de casas en venta en El Poblado con 3 habitaciones:
1. "¿Cuál es el más caro?" → el 7017, por $3.500.000.000.
2. "¿Hay más económicas?" → "Claro, te muestro algunas opciones… más económicas" y muestra **$3.500.000.000** (el mismo 7017), $1.200.000.000 y **$4.300.000.000**. Dos de las tres no son más económicas, y una es la misma.

La IA entendió "más económicas" pero el backend buscó sin límite de precio y tomó cualquier resultado.

### Qué hay que hacer

1. **Resolver la referencia:** "ese", "esa", "el segundo", "más económicas que esa", "¿hay más baratas?" se refieren a `contexto.enFoco`; si no hay, a la ficha (`contexto.codpro`), y luego a `inmueblesVisibles` y `recorrido`. Si queda un solo inmueble posible, **nunca pedir el código**. Si hay varios, preguntar cuál nombrándolos ("¿el 7017 o el 7180?").
2. **Comparaciones con el inmueble en foco ("más económicas", "más baratas", "más grandes", "parecidas pero más baratas"):** la IA no debe elegir los resultados. El backend arma la búsqueda a partir del inmueble de referencia:
   - mismo negocio, tipo y ciudad; mismo barrio y habitaciones si están en los filtros activos del listado;
   - precio estrictamente menor al de referencia: en venta `pvmax = saleprice - 1`, en arriendo `pcmax = rent - 1` ("más grandes" usa `minarea = area_cons + 1`);
   - sin el inmueble de referencia, ordenado por precio de mayor a menor (los más cercanos primero);
   - **validar antes de responder:** quitar cualquier tarjeta que no cumpla (precio ≥ referencia o el mismo código). Si no queda ninguna, decirlo ("En El Poblado no hay casas de 3 habitaciones más económicas que el 7017") y ofrecer ampliar la zona o quitar habitaciones.
3. **Enviar `busqueda`** con esos mismos filtros (incluido `pvmax`/`pcmax`), para que "Ver todos en el listado" muestre solo las más económicas.
4. **Devolver `enFoco`** en cada respuesta (ver "Respuesta").

### Contacto del asesor en ventas

Como el caso A de Lía en WhatsApp: si el visitante muestra interés en un inmueble **en venta** ya identificado (pide información, precio, fotos, visitarlo, o dice que le interesa), no se dan sus datos; se responde corto y se envía `contactoAsesor: { codpro }`. El front muestra el botón verde "Escribir al asesor", que abre WhatsApp al 573145438665 con el código y el enlace de la ficha. Si solo busca "algo en venta" sin un inmueble identificado, no hay botón. No aplica a arriendo.

### Casos de prueba

| Conversación | Esperado |
|---|---|
| "¿cuál es el más caro?" → "¿hay más económicas?" (`enFoco: [7017]`, $3.500.000.000) | Solo casas con precio **menor** a $3.500.000.000, sin el 7017; `busqueda` con `pvmax: "3499999999"`. Nunca la de $4.300.000.000. |
| Lo mismo, sin ninguna más barata en la zona | Lo dice y ofrece ampliar la zona; sin tarjetas. |
| "¿cuál es el más caro?" → "dame más información de ese" | Responde sobre el 7017 sin pedir el código. Está en venta: sin datos + `contactoAsesor: { codpro: 7017 }`. |
| "compárame el 7449 y el 7453" → "¿y el segundo tiene parqueadero?" | "El segundo" = 7453 por `enFoco: [7449, 7453]`. |
| `enFoco` con dos y "ese" sin más pistas | "¿Te refieres al 7449 o al 7453?", nunca "dime el código". |
| Inicio: "¿cuál de los destacados es más barato?" | Usa `inmueblesVisibles` de la página de inicio. |
| "busco una casa en venta en Envigado" | Búsqueda normal, sin botón. |

### Texto para el prompt del asistente

```text
PROPIEDADES EN FOCO (NO PIDAS EL CODIGO SI YA SABES CUAL ES)
contexto.enFoco trae los codigos de las propiedades de las que hablaste en tu respuesta anterior, en orden. contexto.inmueblesVisibles trae las que el visitante tiene en pantalla, contexto.codpro la ficha que esta viendo y contexto.recorrido las de "Mi recorrido".
Cuando diga "ese", "esa", "el primero", "el segundo", "la de Rionegro" o compare ("hay mas economicas?", "mas baratas que esa"), resuelvelo en este orden: enFoco, codpro, inmueblesVisibles, recorrido.
- Si queda UNA sola propiedad posible, responde sobre ella. TIENES PROHIBIDO pedirle el codigo.
- Si hay varias y no se distingue cual, preguntale nombrandolas ("Te refieres al 7449 en El Poblado o al 7453 en Rionegro?").
- Devuelve en inmuebles_en_foco los codigos de las propiedades de las que hablaste (vacio si ninguna).
- No repitas "Revise los 12 inmuebles de esta pagina" en cada turno.

COMPARACIONES CON LA PROPIEDAD EN FOCO
Si pide opciones "mas economicas", "mas baratas", "mas grandes" o "parecidas" a la propiedad en foco, NO elijas tu los inmuebles: marca comparar_con = <codigo de referencia> y criterio = "mas_economico" | "mas_grande" | "parecido". El sistema busca y te pasa solo los que cumplen.
- Nunca digas que una propiedad es mas economica si su precio es igual o mayor al de referencia.
- Si el sistema no encuentra ninguna, dilo y ofrece ampliar la zona o quitar habitaciones.

INTERES EN UN INMUEBLE EN VENTA (CONTACTO DEL ASESOR)
Solo cuando ya sabes de que propiedad concreta se habla, esa propiedad es EN VENTA y el visitante muestra interes en ella (pide informacion, precio, area, fotos, disponibilidad, o quiere conocerla o visitarla). Si solo busca "algo en venta", NO aplica.
- NO des datos de ese inmueble, no ofrezcas agendar visita y no preguntes si es para rentar o comprar.
- Responde en 1 o 2 globos cortos, sin punto final: "Claro que si, con gusto te ayudo" / "Nuestro asesor comercial te da toda la informacion de esta propiedad y tambien puede mostrarte otras opciones, toca el boton para escribirle por WhatsApp"
- Marca contacto_asesor: true y contacto_asesor_codpro con su codigo. Sin codigo, NO lo marques.
- NUNCA escribas un telefono ni un enlace: el boton lo pone la pagina.
- Si ya mostraste el boton para ese inmueble, no lo repitas: dile que puede escribirle con el boton de arriba.
- No aplica a arriendo.
```

El backend traduce:
- `inmuebles_en_foco` → `enFoco`, quitando códigos que no existan;
- `comparar_con` + `criterio` → la búsqueda del punto 2 de "Qué hay que hacer", con su validación y `busqueda`;
- `contacto_asesor` + `contacto_asesor_codpro` → `contactoAsesor`, solo si Domus confirma que está en venta.

## Compatibilidad

`contexto.enFoco`, `enFoco` y `contactoAsesor` son opcionales: sin ellos todo funciona como antes. `contexto.recorrido` es opcional: el backend debe funcionar igual sin él, y la búsqueda por código no depende de él.

## Activación en el front

- `environment.asistenteMock`: `true` responde con la simulación de `asistente-chat.mock.ts` sin llamar al backend. La simulación ya detecta códigos (solo conoce los inmuebles de ejemplo 7449 y 7453) y responde sobre `contexto.recorrido`.
- Con inmuebles en "Mi recorrido", el saludo del chat ofrece la sugerencia "Compárame los inmuebles de mi recorrido".
