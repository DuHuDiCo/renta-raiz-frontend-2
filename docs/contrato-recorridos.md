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
  "inmuebles": [7561, 7542, 7537],
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
| `inmuebles` | Códigos Domus (`codpro`), al menos uno, en el orden en que los agregó. |
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

- Guardar la solicitud y avisar al equipo comercial (correo y/o CRM, como hoy con LeadConnector) con los inmuebles, los rangos en texto legible ("lun 9 – vie 13 nov · mañana y tarde") y el canal preferido.
- Asignar el asesor de los inmuebles si todos son del mismo; si no, a coordinación comercial.
- La disponibilidad es una **sugerencia**: no bloquea agenda ni confirma nada al visitante. El mensaje de confirmación lo envía el asesor.

## Activación en el front

- `environment.recorridoPropio`: `true` muestra el formulario propio; `false`, el widget de LeadConnector (producción mientras no exista el endpoint).
- `environment.recorridoMock`: `true` simula la respuesta sin llamar al backend.
