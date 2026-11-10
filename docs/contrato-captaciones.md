# Contrato: captación de propietarios ("Consigna tu propiedad")

Reemplaza el iframe de LeadConnector de `/publicar-inmueble`, cuyos datos no llegaban a nuestros sistemas, por un formulario propio. El propietario deja sus datos, los de su inmueble y hasta 10 fotos. El backend del portal pasa la captación a lia-service (módulo de captaciones, aparte de los recorridos y los contactos), que contacta al propietario por WhatsApp. El equipo ve el formulario y las fotos desde el chat del CRM.

## Endpoint (contrato A)

`POST /api/v1/captaciones` (`{environment.baseUrl}/captaciones`): mismo JWT e interceptor que los demás endpoints del portal.

### Petición: `multipart/form-data`

| Parte | Tipo | Contenido |
|---|---|---|
| `datos` | `application/json` (en el front es un `Blob`) | Ver abajo. |
| `fotos` | `image/jpeg`, `image/png` o `image/webp` | De 0 a 10 partes, de 6 MB como máximo cada una. El front las manda como `foto-1.jpg`, `foto-2.jpg`… |

```json
{
  "nombre": "Laura Gómez",
  "telefono": "+573001234567",
  "email": null,
  "inmueble": {
    "tipo": "apartamentos",
    "negocio": "arriendo",
    "ciudad": "Medellín",
    "barrio": "El Poblado",
    "precioArriendo": 4500000,
    "precioVenta": null,
    "administracion": 450000,
    "area": 85,
    "habitaciones": 3,
    "banos": 2,
    "parqueaderos": 1,
    "estrato": 5,
    "amoblado": false,
    "disponibleDesde": "2026-12-01",
    "descripcion": "…"
  },
  "aceptaPolitica": true,
  "urlOrigen": "https://rentaraiz.co/publicar-inmueble",
  "utm_source": null,
  "utm_medium": null,
  "utm_campaign": null,
  "utm_term": null,
  "utm_content": null
}
```

### Reglas

| Campo | Regla |
|---|---|
| `nombre` | Obligatorio, mínimo 3 caracteres. |
| `telefono` | Obligatorio, con indicativo: `^\+[0-9]{8,18}$`. |
| `email` | `null` o un correo válido. |
| `inmueble.tipo` | Uno de: `apartamentos`, `casas`, `apartaestudios`, `locales`, `bodegas`, `oficinas`, `lotes`, `fincas`, `edificios`, `casalotes`, `parqueaderos`, `casas-campestres`, `hoteles`, `casas-comerciales` (los slugs de `TIPOS_LISTADO`). |
| `inmueble.negocio` | `arriendo`, `venta` o `arriendo_venta`. |
| `inmueble.ciudad`, `inmueble.barrio` | Obligatorios, hasta 80 caracteres. No se pide dirección exacta. |
| `inmueble.precioArriendo` | Número > 0, obligatorio si el negocio incluye arriendo. Si no, `null`. |
| `inmueble.precioVenta` | Número > 0, obligatorio si el negocio incluye venta. Si no, `null`. |
| `inmueble.administracion` | `null` o número ≥ 0. |
| `inmueble.area` | `null` o número de 1 a 100000 (m², admite decimales). |
| `inmueble.habitaciones`, `banos`, `parqueaderos` | `null` o entero de 0 a 50. |
| `inmueble.estrato` | `null` o entero de 1 a 6. |
| `inmueble.amoblado` | `null`, `true` o `false`. |
| `inmueble.disponibleDesde` | `null` o `AAAA-MM-DD`, ≥ hoy (hora de Colombia) y ≤ hoy + 365 días. |
| `inmueble.descripcion` | `null` o hasta 1000 caracteres. |
| `aceptaPolitica` | Siempre `true`. |
| `urlOrigen` | Dirección absoluta de la página desde la que se envió. |
| `utm_*` | De la URL o, si no están ahí, de `localStorage` (como en los recorridos); `null` si no hay. |

### Respuestas

- `201` → `{ "id": "CAP-XXXXXXXX" }`. El front muestra el `id` en la confirmación.
- `400` → `{ "message": "…" }`. El front ya valida todo lo anterior y pide revisar los datos.
- `413` → la petición excede el tamaño permitido. El front pide quitar algunas fotos.
- `429` → límite de envíos. El front pide esperar unos minutos.
- Otro error o 60 s sin avance → "No pudimos enviar tu inmueble"; se puede reintentar sin perder lo escrito ni las fotos.

## Lo que hace el front

- Valida en el navegador con las mismas reglas.
- Los precios y la administración se escriben con puntos de miles ("4.500.000") y se envían como número.
- **Fotos**: hasta 10. Cada una se reduce en el navegador con canvas a un lado mayor de 1600 px y JPEG de calidad 0,8, respetando la orientación (`createImageBitmap(…, { imageOrientation: 'from-image' })` si está disponible; si no, con `<img>`). Las que el navegador no logra decodificar (p. ej. HEIC fuera de Safari) se rechazan con un aviso. Por eso, en la práctica, todas llegan como `image/jpeg` y pesan cientos de KB.
- La petición no muestra el loader de pantalla completa (`SIN_LOADER_GLOBAL`), porque la página muestra el avance de la subida.
- Evento de Google Tag Manager `captacion_enviada` con `tipo`, `negocio` y `fotos` (cantidad). Sin datos personales.

## Qué se espera del backend

- Validar lo anterior (tipos y tamaño de las fotos incluidos) y limitar los envíos por IP y por teléfono (`429`).
- Generar el `id` `CAP-…` y pasar la captación con las fotos a lia-service (módulo de captaciones), que escribe al propietario por WhatsApp y deja el formulario y las fotos en el chat del CRM.

## Activación en el front

- `environment.captacionPropia`: `true` muestra el formulario propio; `false`, el iframe de LeadConnector, que sigue como alternativa.
- `environment.captacionMock`: `true` simula la subida y la respuesta sin llamar al backend. Escribe en la consola `[captación simulada]` y deja el `FormData` en `window.__ultimaCaptacionSimulada`.
- Producción (`environment.ts`): `captacionPropia: true`, `captacionMock: false`. Desarrollo (`environment.development.ts`): `captacionPropia: true`, `captacionMock: false` (backend real) y `captacionConservarDatos: true` (pruebas).
