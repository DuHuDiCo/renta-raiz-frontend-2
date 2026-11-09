# Contrato: asistente del portal (chat)

Chat de servicio al cliente del portal: solo preguntas y respuestas, no capta datos personales ni escala a un asesor. El backend arma el prompt, llama a la IA y devuelve la respuesta validada. El modelo del front está en `src/app/core/asistente/asistente.models.ts`.

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
| `contexto.filtros`, `inmueblesVisibles`, `numeroPagina` | Solo en `listado`: filtros aplicados (claves de `GET /properties/`), códigos de la página abierta y número de página. |
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

## Compatibilidad

`contexto.recorrido` es opcional: el backend debe funcionar igual sin él, y la búsqueda por código no depende de él.

## Activación en el front

- `environment.asistenteMock`: `true` responde con la simulación de `asistente-chat.mock.ts` sin llamar al backend. La simulación ya detecta códigos (solo conoce los inmuebles de ejemplo 7449 y 7453) y responde sobre `contexto.recorrido`.
- Con inmuebles en "Mi recorrido", el saludo del chat ofrece la sugerencia "Compárame los inmuebles de mi recorrido".
