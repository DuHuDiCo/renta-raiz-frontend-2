# Contrato backend — Búsqueda con IA (híbrida y semántica)

Los tipos exactos están en `src/app/core/busqueda-ia/busqueda-ia.models.ts`. Este documento explica qué hace el backend con ellos.

## 1. Idea en una frase

La frase del usuario se separa en dos partes:

| Parte | Ejemplo | Cómo se resuelve | Efecto |
|---|---|---|---|
| **Filtros duros** | arriendo, apartamento, El Poblado, 3 hab, ≤ $4M | LLM → parámetros de `GET /properties/` | Deciden **qué** inmuebles entran |
| **Preferencias subjetivas** | "vista a la montaña", "tranquilo", "para mascotas" | Embeddings + similitud contra el índice de inmuebles | Deciden **el orden** |

Las preferencias nunca dejan un inmueble por fuera, solo lo suben o lo bajan en la lista. La IA no inventa inmuebles: todos salen de Domus.

## 2. Componentes

```
                ┌─────────── offline (job) ───────────┐
Domus ──sync──▶ │ texto indexable → embedding → pgvector │
                └──────────────────────────────────────┘
                                   ▲ similitud
Front ─POST /busqueda/ia─▶ API ─┬─▶ LLM: frase → {filtros, preferencias}
                                ├─▶ Domus / BD: filtros duros → candidatos
                                ├─▶ rerank por preferencias
                                └─▶ relajación si 0 resultados
```

### 2.1 Indexación (job, no va en la petición)

1. **Sync** con Domus cada 30–60 min y por webhook si existe. Se reindexa solo lo que cambió: guardar `hash(texto_indexable)` por `codpro`. Los inmuebles despublicados se borran del índice.
2. **Texto indexable** por inmueble: tipo, negocio, barrio, ciudad, estrato, área, habitaciones, características/amenidades de Domus y la **descripción completa**. Ejemplo:
   `"Apartamento en arriendo en El Poblado, Medellín. Estrato 6. 180 m², 3 hab, 4 baños, 2 parqueaderos. Amenidades: piscina, gimnasio, BBQ. Descripción: Espectacular apartamento con balcón panorámico…"`
3. **Descripción de las fotos (recomendado):** pasar las 3–5 primeras fotos por un modelo de visión **una sola vez** y guardar un texto ("sala con ventanal de piso a techo, vista a montañas verdes, cocina abierta en mármol"). Se agrega al texto indexable. Así funciona "vista a la montaña" aunque el asesor no lo haya escrito.
4. **Embedding** del texto con un modelo multilingüe que maneje bien el español. Guardar en `pgvector` (o el vector store que ya usen):

```sql
CREATE TABLE inmueble_embedding (
  codpro        INT PRIMARY KEY,
  texto         TEXT NOT NULL,
  texto_hash    CHAR(64) NOT NULL,
  embedding     VECTOR(1024) NOT NULL,  -- dimensión según el modelo
  -- copias de los filtros para poder filtrar y rankear en una sola consulta
  biz_code INT, type_code INT, city_code INT, neighborhood_code INT,
  rent NUMERIC, saleprice NUMERIC, bedrooms INT, bathrooms INT, parking INT,
  area_cons NUMERIC, stratum INT,
  actualizado   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON inmueble_embedding USING hnsw (embedding vector_cosine_ops);
```

### 2.2 Interpretación (LLM)

- Se hace una llamada con **salida estructurada / tool use** y un JSON Schema igual a `{ filtros: FiltrosBusqueda, preferencias: PreferenciaBusqueda[], noEntendido: string[] }`.
- En el prompt van los **catálogos reales** (tipos, ciudades, barrios con sus códigos), cacheados. El LLM devuelve **códigos**, no nombres libres. Si nombra un barrio que no existe, el backend busca el más parecido (fuzzy match) o lo manda a `noEntendido`.
- Reglas para el prompt:
  - "Millones", "4M", "4 palos" → número entero en COP.
  - Si dice precio pero no negocio, se usa `pcmin/pcmax` para arriendo, `pvmin/pvmax` para venta y ambos cuando `biz=3`.
  - "3 habitaciones" → `bedrooms="3"`. "Al menos 3" → `minbedroom=3, maxbedroom=100` (misma convención que el front).
  - Lo que coincide **exactamente** con una amenidad de Domus va como filtro si Domus lo soporta. Si no, va como preferencia.
  - Si viene `filtrosActuales`, la frase es un **refinamiento**: se aplica un delta sobre esos filtros ("más barato" → baja `pcmax` un 15–20 %).
- **Validación** después del LLM: los códigos deben existir, `min ≤ max`, sin negativos. Lo que no pase se descarta y no se manda a Domus.
- Cache por `hash(consulta normalizada + filtrosActuales)` durante 24 h. Las consultas típicas se repiten mucho.

### 2.3 Búsqueda y ranking

1. **Candidatos:** se aplican los filtros duros. Si no hay preferencias, se devuelve el orden de siempre (destacados/recientes) y `rutaSeo` cuando aplique.
2. **Con preferencias:** se calcula el embedding de cada preferencia (con cache) y su similitud coseno contra cada candidato.
   `puntaje = Σ(peso_i · sim_i) / Σ peso_i`, normalizado entre 0 y 1. Se ordena por puntaje.
   Con pgvector se puede hacer en una consulta: `WHERE <filtros> ORDER BY embedding <=> :vector_preferencias LIMIT :n`, donde el vector es el promedio ponderado.
3. **`coincidencias`:** para los inmuebles de la página actual (no para todos), se sacan 1–2 frases del texto indexable que más se parezcan a cada preferencia. Se puede hacer partiendo el texto en oraciones y comparando embeddings, sin LLM. Se devuelven textuales, recortadas a unos 90 caracteres.
4. **Umbral:** si el mejor puntaje está por debajo de un mínimo (calibrarlo, ~0.3), se agrega una sugerencia del tipo "No encontramos inmuebles que mencionen X". Los resultados no se ocultan.

### 2.4 Relajación cuando hay 0 resultados

Se afloja **un filtro a la vez**, en este orden, hasta que haya resultados (máximo 3 intentos):

1. Precio máximo +15 %.
2. Barrio → ciudad (o barrios vecinos si tienen esa relación).
3. Habitaciones exactas → `minbedroom` con el mismo número.
4. Se quita el estrato.

Se devuelve `relajacion` con `mensaje` y `cambios`. `interpretacion.filtros` y `chips` reflejan los filtros **ya aflojados**, para que el usuario vea y pueda deshacer el cambio.

### 2.5 Degradación

Si el LLM falla o se demora más de ~4 s, no se devuelve error. Se hace una búsqueda solo por embedding de la frase completa sobre todo el índice, o por palabras clave, con `degradado: true`, `filtros: {}` y `chips: []`. El front nunca debe quedar sin resultados por culpa de la IA.

## 3. Endpoints

### `POST /busqueda/ia`

**Request**
```json
{
  "consulta": "apartamento en arriendo en el poblado con vista a la montaña, 3 habitaciones, máximo 4 millones, que acepten mascotas",
  "sesionId": "6f1c…",
  "pagina": 1,
  "elementosPorPagina": 12
}
```

**Response 200**
```json
{
  "consultaId": "bq_01JC…",
  "interpretacion": {
    "filtros": { "biz": "1", "type": "1", "city": "1", "neighborhood_code": "245", "bedrooms": "3", "pcmax": 4000000 },
    "preferencias": [
      { "texto": "vista a la montaña", "peso": 1 },
      { "texto": "acepta mascotas", "peso": 1 }
    ],
    "chips": [
      { "clave": "biz", "etiqueta": "Arriendo", "valor": "1" },
      { "clave": "type", "etiqueta": "Apartamento", "valor": "1" },
      { "clave": "neighborhood_code", "etiqueta": "El Poblado", "valor": "245" },
      { "clave": "pcmin", "etiqueta": "Hasta $4.000.000", "valor": "-4000000" },
      { "clave": "bedrooms", "etiqueta": "3 habitaciones", "valor": "3" },
      { "clave": "preferencia", "etiqueta": "Vista a la montaña", "valor": "vista a la montaña" },
      { "clave": "preferencia", "etiqueta": "Acepta mascotas", "valor": "acepta mascotas" }
    ],
    "noEntendido": []
  },
  "resultados": [
    {
      "codpro": 7434, "type": "Apartamento", "biz": "Arriendo", "biz_code": 1,
      "neighborhood": "El Poblado", "city": "Medellín",
      "rent": 3800000, "saleprice": 0, "bedrooms": 3, "bathrooms": 3, "area_cons": 140,
      "image1": "https://…",
      "puntaje": 0.82,
      "coincidencias": ["Balcón con vista panorámica a las montañas", "Edificio pet friendly"]
    }
  ],
  "total": 9,
  "pagina": 1,
  "relajacion": null,
  "rutaSeo": null,
  "sugerencias": ["Con parqueadero cubierto", "Solo estrato 6"],
  "degradado": false
}
```

Formato del `valor` en los chips de rango: `"min-max"`, con un lado vacío si no aplica (`"-4000000"`, `"2000000-"`).

**Errores**

| Código | Cuándo | Body |
|---|---|---|
| 400 | `consulta` vacía, más de 300 caracteres, `pagina < 1` o `elementosPorPagina > 48` | `{ "error": "consulta_invalida", "mensaje": "…" }` |
| 429 | Más de 20 búsquedas por minuto por `sesionId`/IP | `{ "error": "limite", "reintentarEn": 30 }` |
| 500 | Solo si falla Domus. Una falla de la IA **no** da error (ver 2.5) | `{ "error": "interno" }` |

**Tiempos objetivo:** p50 < 1.5 s, p95 < 3 s. Pedir página 2 o más con la misma consulta y filtros no vuelve a llamar al LLM (se usa la cache de la interpretación).

### `POST /busqueda/ia/eventos`

Sirve para medir calidad y, más adelante, ajustar el ranking. Responde `204` sin body. Es fire-and-forget: el front no espera la respuesta.

```json
{ "consultaId": "bq_01JC…", "sesionId": "6f1c…", "accion": "ver", "codpro": 7434, "posicion": 1 }
```

`accion`: `ver | favorito | compartir | contacto | quitar-chip` (en `quitar-chip` va `chip` en lugar de `codpro`).

## 4. Qué guardar para medir

En la tabla `busqueda_ia_log` guardar: `consultaId, sesionId, consulta, interpretacion (jsonb), total, relajacion (bool), degradado (bool), latencia_ms, modelo, tokens, fecha`.
Métricas clave:
- **CTR** en la posición 1–3.
- **% de búsquedas con 0 resultados** antes de relajar.
- **% de chips quitados por clave.** Si mucha gente quita el chip de precio, la IA está interpretando mal el precio.
- **Contactos por búsqueda.**

## 5. Seguridad y costos

- La API key del LLM y la del modelo de embeddings viven **solo en el backend**.
- `consulta` es texto del usuario. Va en el prompt como dato, delimitado, nunca como instrucción. La salida siempre se valida contra el schema y los catálogos.
- No se guardan datos personales. Si la frase trae teléfono o correo, se enmascaran antes de guardarla en el log.
- El costo por búsqueda es una llamada corta al LLM (cacheable) más los embeddings de 1–3 preferencias (cacheables). La indexación de fotos es un costo único por inmueble.

## 6. Fases sugeridas

1. Interpretación + filtros duros + chips + `rutaSeo` (sin embeddings). Ya da valor.
2. Indexación con descripción + preferencias + `coincidencias`.
3. Descripción de fotos con visión.
4. Relajación + eventos + ajuste del ranking con los datos reales.
