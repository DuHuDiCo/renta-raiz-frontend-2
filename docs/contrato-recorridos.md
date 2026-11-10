# Contrato: solicitud de recorrido

Reemplaza el widget de LeadConnector ("Agenda Recorridos") por un formulario propio. El visitante **no reserva una cita**: deja uno o varios rangos de fechas y franjas horarias en los que puede, y el equipo comercial organiza el recorrido (propietarios, ruta, asesor) y lo contacta para confirmar día y hora.

## Endpoint

`POST /api/v1/recorridos` — pública (mismo esquema de autenticación que `/contacto-inmueble`).

### Petición

```json
{
  "nombre": "Laura Gómez",
  "telefono": "+573001234567",
  "email": "laura@correo.com",
  "canalPreferido": "whatsapp",
  "inmuebles": [
    { "codpro": 7561, "titulo": "Apartamento en arriendo en Otra Parte, Envigado", "url": "https://rentaraiz.co/inmueble/apartamento-arriendo-otra-parte-envigado-7561" },
    { "codpro": 7542, "titulo": "Casa en venta en El Poblado, Medellín", "url": "https://rentaraiz.co/inmueble/casa-venta-el-poblado-medellin-7542" }
  ],
  "disponibilidad": [
    { "desde": "2026-11-09", "hasta": "2026-11-13", "franjas": ["manana", "tarde"] },
    { "desde": "2026-11-14", "hasta": "2026-11-14", "franjas": ["sabado"] }
  ],
  "comentarios": "Prefiero empezar por el de El Poblado.",
  "aceptaPolitica": true,
  "urlOrigen": "https://rentaraiz.com/filtros",
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "utm_campaign": null,
  "utm_content": null,
  "utm_term": null
}
```

| Campo | Regla |
|---|---|
| `nombre` | Obligatorio, mínimo 3 caracteres. |
| `telefono` | Obligatorio, con indicativo (`+57…`). |
| `email` | `null` o un correo válido (opcional). |
| `canalPreferido` | Siempre `whatsapp`: el equipo confirma los recorridos solo por WhatsApp al `telefono`. |
| `inmuebles` | Entre 1 y 20, en el orden en que los agregó, sin repetir. `codpro`: código Domus. `titulo`: encabezado de la ficha (hasta 200 caracteres). `url`: dirección absoluta de la ficha. |
| `disponibilidad` | Entre 1 y 5 rangos. `desde` y `hasta` en `AAAA-MM-DD` (hora de Colombia), `desde` ≥ hoy, `hasta` ≥ `desde`, como máximo 60 días adelante. `franjas`: ver "Horario" abajo. |
| `comentarios` | `null` o hasta 500 caracteres. |
| `aceptaPolitica` | Siempre `true`. |
| `urlOrigen`, `utm_*` | Atribución, como en `/contacto-inmueble`. |

### Horario

Recorridos de **lunes a viernes de 8:00 a 17:00** y **sábados de 9:00 a 11:00**. **Domingos no.**

| Días del rango | `franjas` válidas |
|---|---|
| Incluye algún día de lunes a viernes (con o sin sábado) | una o ambas: `manana` (8:00–12:00), `tarde` (12:00–17:00). Si incluye sábado, ese día aplica 9:00–11:00. |
| Solo sábado (`desde` y `hasta` el mismo sábado, o sábado–domingo) | exactamente `["sabado"]` (9:00–11:00) |

- `desde` y `hasta` no pueden ser domingo. Un domingo en medio del rango se entiende excluido.
- `desde` ≥ primer día disponible: hoy si aún no cierra la atención (17:00 entre semana, 11:00 el sábado); si no, el siguiente día hábil.

### Respuestas

- `201` → `{ "id": "REC-000123" }`. El front muestra el `id` en la confirmación.
- `400` → datos inválidos (`{ "message": "…" }`). El front ya valida todo lo anterior; no muestra el detalle.
- `429` / `5xx` → el front muestra "No pudimos enviar tu disponibilidad" y deja reintentar sin perder lo escrito.

## Qué se espera del backend

- Validar lo anterior y limitar los envíos por IP y por teléfono (`429`).
- Enviar la solicitud a lia-service por el webhook de solicitudes del portal (`POST /api/webhook/portal-requests`, mismo contrato que los contactos de la ficha) con `portal = "RENTARAIZ"`, `property*` en `null` y en `rawBody` un JSON con `"tipo": "recorrido"`, el `id`, los inmuebles (`codigo`, `titulo`, `url`), los rangos con sus franjas y horarios (`manana` 8:00 - 12:00, `tarde` 12:00 - 17:00, `sabado` 9:00 - 11:00) y los comentarios.
- lia procesa el recorrido a los 30 segundos: envía la plantilla "Solicitud Recorrido", Lía conversa con el cliente sin volver a pedirle fechas, el lead queda en la etapa "Agenda Recorrido" y al terminar el usuario predeterminado recibe el resumen con los inmuebles y horarios. Sin correo desde el portal.
- La disponibilidad es una **sugerencia**: no bloquea agenda ni confirma nada al visitante.

## Contactos de la ficha

`POST /contacto-inmueble` envía además, de forma opcional, `tituloInmueble` ("Apartamento en arriendo en Otra Parte, Envigado"), `zonaInmueble` ("Otra Parte, Envigado") y `precioInmueble` ("$5.000.000 / mes"). El backend los pasa a lia como `propertyTitle`, `propertyZone` y `propertyPrice`.

## Activación en el front

- `environment.recorridoPropio`: `true` muestra el formulario propio; `false`, el widget de LeadConnector. Encendido en producción y en desarrollo.
- `environment.recorridoMock`: `true` simula la respuesta sin llamar al backend.
