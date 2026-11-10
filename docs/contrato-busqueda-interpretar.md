# Contrato: búsqueda con IA de los resultados (`POST /busqueda/interpretar`)

Panel **"Con IA"** de la página de resultados. Convierte la frase del visitante en filtros de `GET /properties/` o responde preguntas sobre los inmuebles que tiene en pantalla. El modelo del front está en `src/app/core/busqueda-ia/busqueda-ia.models.ts`.

> No confundir con el asistente del chat (`POST /asistente/mensajes`, ver `docs/contrato-asistente.md`) ni con el diseño futuro de `docs/contrato-busqueda-ia.md`.

## Qué cambia en el backend (resumen)

Dos problemas reales en este panel, en una página de apartamentos en venta en El Poblado:

**1. "Muéstrame la más cara" no se entiende, pero "¿cuál es la más cara?" sí.**
- "¿Cuál es la más cara?" → `pregunta_inmuebles` → "…El apartamento más caro de esta lista es el 7284…". Funciona.
- "Muéstrame la más cara" → `busqueda` sin cambiar filtros → "No logré convertir eso en un cambio de búsqueda…". Es la misma pregunta.

**2. Pierde el hilo.**
- "¿Cuál es la más cara?" → "…el 7284…".
- "Dame más información" → "…por favor indícame su código".
- "Quiero más información de la propiedad que me mostraste" → "…indícame su código".

Lo que hay que hacer:

1. **Clasificación (prompt):** las frases imperativas con superlativo sobre lo que hay en pantalla son `pregunta_inmuebles`, no `busqueda`. Ver "Texto para el prompt".
2. **Nuevo campo `enFoco` en la petición:** el front ahora envía los inmuebles que el panel destacó en su última respuesta a una pregunta (`inmueblesDestacados`). Pasárselo a la IA para resolver "esa", "la que me mostraste", "dame más información".
3. **Clasificación de detalle de un inmueble:** pedir más información o detalles de un inmueble concreto es `pregunta`. El front se lo pasa al Asistente Renta Raíz junto con `enFoco`, y el asistente responde sobre ese inmueble (o muestra el botón del asesor si está en venta). Preguntas puntuales sobre el inmueble en foco que se responden con los datos de la página ("¿esa tiene parqueadero?") siguen siendo `pregunta_inmuebles`, con `inmueblesDestacados` = ese inmueble.
4. **Nunca pedir "el código"** si `enFoco` tiene un solo inmueble. Si tiene varios y no se distingue cuál, preguntar nombrándolos.
5. **Probar** con la tabla de "Casos de prueba".

Todo es compatible hacia atrás: `enFoco` es opcional.

## Petición

```json
{
  "consulta": "dame más información",
  "sesionId": "0b6f3c1e-8a1d-4a5e-9f4b-2c7d1e9a6b3f",
  "filtrosActuales": { "biz": "2", "type": "1", "city": "5001", "neighborhood_code": "123" },
  "inmueblesVisibles": [7284, 7280, 7276, 7245, 7435, 7392, 7366, 7315],
  "pagina": 1,
  "enFoco": [7284]
}
```

| Campo | Regla |
|---|---|
| `consulta` | Frase del visitante, hasta 300 caracteres. |
| `sesionId` | UUID del navegador (el mismo del chat del asistente). |
| `filtrosActuales` | Filtros ya aplicados, con las claves de `GET /properties/`. Siempre se envía, aunque esté vacío. |
| `inmueblesVisibles` | Códigos de la página de resultados abierta, en orden (máx. 24). `[]` si no hay. |
| `pagina` | Número de esa página. |
| `enFoco` | **Nuevo, opcional.** Los `inmueblesDestacados` de la última respuesta `pregunta_inmuebles`, aunque después haya habido otros mensajes. Se borra cuando la búsqueda cambia (los inmuebles pueden ya no estar en pantalla). Ausente si no hay. |

## Respuesta (sin cambios)

```json
{
  "filtros": { "biz": "2", "type": "1", "city": "5001", "neighborhood_code": "123" },
  "etiquetas": {},
  "noEntendido": [],
  "degradado": false,
  "intencion": "pregunta_inmuebles",
  "lugaresNoEncontrados": [],
  "avisos": [],
  "respuesta": "De los 12 inmuebles de esta página, el más caro es el 7284, por $3.080.000.000",
  "inmueblesDestacados": [7284]
}
```

- `intencion`:
  - `busqueda`: cambia filtros;
  - `pregunta_inmuebles`: responde sobre los inmuebles de la página, con `respuesta` e `inmueblesDestacados`, que el front resalta en la página;
  - `pregunta`: el front ofrece mandarla al Asistente Renta Raíz y le pasa `enFoco`;
  - `otro`: saludo o algo que no es búsqueda.
- `inmueblesDestacados` alimenta el `enFoco` del siguiente mensaje, así que debe traer siempre los códigos de los que habla `respuesta`.

## Casos de prueba

| Conversación | Esperado |
|---|---|
| "muéstrame la más cara" | `pregunta_inmuebles`, como "¿cuál es la más cara?": responde el 7284 y `inmueblesDestacados: [7284]`. |
| "dame el más barato", "enséñame las más grandes", "la mejor ubicada" | `pregunta_inmuebles` sobre la página. |
| "la más barata en Envigado" | `busqueda` (cambia la zona); no es pregunta sobre la página. |
| "¿cuál es la más cara?" → "dame más información" (con `enFoco: [7284]`) | `pregunta`, sin pedir el código. El front se lo pasa al asistente con el foco en el 7284. |
| "¿cuál es la más cara?" → "¿esa tiene parqueadero?" (con `enFoco: [7284]`) | `pregunta_inmuebles` sobre el 7284, `inmueblesDestacados: [7284]`. |
| `enFoco: [7284, 7280]` y "dame más información de esa" | Pregunta cuál nombrándolos ("¿el 7284 o el 7280?"), nunca "dime el código". |
| "¿cuál es la más cara?" → "en arriendo" → "dame más información" | La búsqueda cambió: el front ya no manda `enFoco`. Comportamiento normal. |

## Texto para el prompt

Agregar al prompt de `/busqueda/interpretar`, junto a las reglas de clasificación de la intención:

```text
PREGUNTAS SOBRE LA PAGINA DICHAS COMO ORDEN
Una frase imperativa con superlativo sobre lo que el visitante tiene en pantalla es una pregunta sobre la pagina (pregunta_inmuebles), no un cambio de busqueda: "muestrame la mas cara", "dame el mas barato", "ensename las mas grandes", "la de mas habitaciones", "la mejor". Respondela igual que "cual es la mas cara?", con los inmuebles de inmueblesVisibles, y pon en inmueblesDestacados los codigos de los que hablas.
Solo es busqueda si ademas cambia un filtro: "la mas barata en Envigado" cambia la zona.

INMUEBLES EN FOCO (NO PIDAS EL CODIGO SI YA SABES CUAL ES)
enFoco trae los inmuebles que destacaste en tu ultima respuesta a una pregunta sobre la pagina. Cuando el visitante diga "esa", "ese", "la que me mostraste", "ese apartamento" o "dame mas informacion" sin nombrar otro inmueble, se refiere a los de enFoco.
- Si pide mas informacion o detalles de ese inmueble (descripcion, fotos, visitarlo, como comprarlo), la intencion es pregunta: el Asistente Renta Raiz le responde y recibe el mismo enFoco.
- Si pregunta algo puntual que se responde con los datos de la pagina ("esa tiene parqueadero?", "cuantas habitaciones tiene?"), es pregunta_inmuebles: responde sobre ese inmueble y ponlo en inmueblesDestacados.
- Si enFoco tiene UN solo inmueble, TIENES PROHIBIDO pedirle el codigo.
- Si tiene varios y no se distingue cual, preguntale cual nombrandolos ("Te refieres al 7284 o al 7280?"), nunca "dime el codigo".
- No repitas "Revise los 12 inmuebles de esta pagina" en cada turno: dilo solo cuando acabas de comparar la pagina.
```

## Lo que ya hace el front

- Guarda los `inmueblesDestacados` de la última respuesta `pregunta_inmuebles` y los envía en `enFoco` hasta que la búsqueda cambie (`BusquedaIaConversacionService.enFoco()`).
- Cuando la respuesta es `pregunta` y el visitante toca "Preguntarle al asistente", le pasa al asistente ese mismo foco (`contexto.enFoco` de `/asistente/mensajes`).
- Cuando resalta inmuebles de una `pregunta_inmuebles`, también le deja ese foco al asistente, por si después le preguntan directamente a él.
- No reescribe ni clasifica frases por su cuenta: la intención la decide el backend.
