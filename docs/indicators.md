# Indicadores y evolución

La ficha conserva su diseño Material UI, tipografía y colores. `RecommendationIndicators` carga una sola consulta agrupada con la clave pública; `IndicatorSection` presenta las series sin calcular cumplimiento. El selector usa cinco años calendario (año actual de Madrid y los cuatro anteriores) o todo el histórico, solicitado explícitamente. Cada componente conserva su unidad, y cada población/territorio se selecciona por separado.

Las líneas unen únicamente puntos consecutivos de la misma serie y versión metodológica. Los huecos, ausencias explícitas y rupturas separan segmentos. Los datos no se interpolan. Barras con origen cero, hitos para booleanos y cronologías para texto/categorías comparten tabla HTML, fuentes, fechas y revisión. Las metas se documentan por relación, componente y scope; nunca cambian la valoración.

## Esquema e integración

Se amplía `indicators`, existente en el esquema real, conservando sus tres registros heredados y los campos antiguos `commitment_id`, `action_id`, `target_value` y `target_date`. Estos campos heredados no se exponen por el nuevo contrato. Sus relaciones quedan propuestas, con las metas antiguas en metadatos privados para revisión. El sincronizador anterior puede seguir escribiendo sus columnas; una relación heredada nueva debe pasar por la gestión de vínculos.

Tablas añadidas:

- `indicator_components`: métricas inequívocas y sus definiciones. Una definición con datos publicados permanece inmutable; se crea otro componente para cambiarla.
- `recommendation_indicators`: relaciones, roles, justificaciones, baseline, metas y scope. Desvincular archiva la relación, conservando las mediciones y evitando que una reimportación la reactive.
- `recommendation_indicator_requirements`: aplicabilidad propuesta/revisada. Sin una decisión publicada, la lectura devuelve `pending_review`. Esta tabla permite revisar sin modificar el texto oficial ni el estado de cumplimiento.
- `indicator_values`: observaciones tipadas con país, componente, scope JSONB canónico, periodo, fuente, publicación, recuperación, versión comparable y revisión. Cada periodo/scope tiene una observación vigente elegida mediante revisión explícita. Las fuentes alternativas y correcciones se conservan.
- `indicator_audit`: snapshots privados de cambios, incluidos vínculos archivados. Nunca se exponen al público.

`hrct_public_indicators` funciona con derechos del invocante y RLS; las columnas internas se excluyen de los grants y de la respuesta. El catálogo, componentes, vínculos y observaciones validados siguen limitados a contenido publicado, activo y vigente; se filtra el país de la recomendación. Último valor y baseline se consultan separadamente del histórico visible. Las funciones de importación/publicación admiten exclusivamente `service_role`.

La respuesta también incluye `annex`, una previsualización de las propuestas originales del anexo para esa recomendación. Sus tarjetas muestran código, nombre, definición, rol, unidades, fuentes candidatas y la justificación general, con la etiqueta «Propuesto · Sin validar». No se cambian estados editoriales ni se muestran mediciones, baseline o metas propuestas como hechos. Para las 41 recomendaciones sin indicadores en el anexo se explica la propuesta de verificación documental, pendiente de revisión. El selector de histórico aparece cuando hay asignaciones publicadas.

Esta proyección se genera mediante `hrct_indicator_private.annex_preview`, una función de solo lectura con derechos de propietario y `search_path` vacío, en un esquema fuera de la Data API. Su ejecución se concede explícitamente a los roles de lectura y se revoca a `PUBLIC`. Devuelve exclusivamente una lista de campos permitidos del snapshot original `spain-upr4-v1`, para una recomendación publicada de España/EPU/A/HRC/60/8; excluye TEST, vínculos archivados, catálogo inactivo, borradores creados manualmente y cambios privados de investigación. No devuelve `import_metadata` completo, notas de revisión, metas ni observaciones. Los grants y RLS de las tablas no se amplían. Una decisión revisada de no necesitar indicadores prevalece sobre el anexo; una asignación publicada deja de figurar como propuesta.

Toda página y acción de gestión comprueba la sesión administrativa existente. La clave de servicio se usa exclusivamente desde módulos `server-only`. `/admin/indicators` busca por código, nombre y definición, y gestiona catálogo, componentes, mediciones e importación JSON. `/admin/recommendations/[publicId]/indicators` gestiona aplicabilidad y relaciones. La referencia de la revisión de Jira se registra en metodología, rationale y citas; Jira sigue siendo el expediente humano. No se ha creado otra cuenta o sistema de autenticación.

Al publicar una observación se bloquea su serie durante la transacción, se retira la anterior selección y se publica el borrador revisado. Las observaciones publicadas son inmutables, salvo su selección como vigente; una corrección añade una fila que referencia la anterior. Las rupturas deben documentarse y usar otra clave comparable o versión metodológica. Un cambio de fuente requiere evaluación explícita de comparabilidad. Las acciones invalidan el tag `indicators` y las fichas para que una medición compartida se actualice en todas sus recomendaciones.

## Anexo y normalizaciones

`data/indicators/spain-upr4.v1.json` conserva los bloques originales completos, columnas, defaults y reglas derivadas. El importador reconstruye los objetos y los campos derivados; el RPC conserva origen, versión, reglas y fuentes metodológicas como metadatos privados. No importa títulos normalizados, aceptación, observaciones, baseline ni metas a las recomendaciones.

Validación obligatoria: 324 números únicos 50.1–50.324, 98 códigos, 428 pares; aplicabilidad 253 required, 30 recommended, 41 not_required; roles 283 primary y 145 supporting. Resolución exacta por España + UPR + fuente A/HRC/60/8, excluyendo TEST. Cero coincidencias o varias coincidencias abortan antes de escribir. Una segunda importación no actualiza decisiones humanas ni duplica datos, incluso si un revisor cambió el scope o archivó la relación original.

Normalizaciones conservadas en `import_metadata.original.normalizations`:

- `direction=context` → `orientation=neutral`.
- El tipo original `input` → `process` (recursos); se conserva el tipo original para revisión.
- Las unidades separadas por ` / ` generan componentes propuestos con identidad estable. Por ejemplo, `INST-001` conserva su código y sus vínculos, con componentes `EUR` y `FTE`. Es una propuesta de delimitación, no una definición validada; se revisan nombres, alcance, fórmula, unidades y frecuencia antes de publicar.
- Frecuencias compuestas como `annual/biennial` → `irregular` provisionalmente; la frecuencia original se conserva. Las expresiones ambiguas sin separador también requieren revisión metodológica.
- Las justificaciones importadas son generales del expediente, no específicas de cada vínculo. La interfaz lo indica.

Las reglas baseline ≤2025 y target son instrucciones originales del análisis. No se ejecutan como mediciones ni se aplican a otros ciclos. Una meta exige componente, scope exacto, operador, tipo, plazo y cita verificable; la baseline exige una observación aprobada de esa misma serie y una razón documentada. Las metas relativas desde cero no son calculables.

## Aplicación en producción

El 4 de octubre de 2026 se fusionó la implementación en `main` y Vercel completó el despliegue de producción. Se aplicaron ambas migraciones al proyecto `gostbdmrzchccnydftgd` y se importó el anexo tras validar sus referencias contra la base real. Se incorporaron 98 indicadores, 428 vínculos y 324 decisiones de aplicabilidad como propuestas. Los tres indicadores y vínculos heredados se conservaron; el total es 101 indicadores, 431 vínculos y 149 componentes. No se cargaron mediciones.

La segunda importación añadió cero indicadores y mantuvo los conteos. Los snapshots del texto oficial/estado de publicación y de las evaluaciones coincidieron antes y después. En el despliegue inicial, el RPC y el endpoint respondían con `pending_review` y ocultaban todas las propuestas; por eso ninguna ficha mostraba sus indicadores importados. La actualización `public_indicator_proposals` añade la previsualización explícita del anexo descrita arriba. Los gráficos siguen requiriendo observaciones documentadas y publicadas.

Las migraciones quedaron registradas por el servicio de Supabase con sus nombres y versiones de aplicación: `visual_indicators` (`20261004104048`), `indicator_import_review` (`20261004104255`) y `public_indicator_proposals` (`20261004110111`). Estas versiones remotas difieren de los timestamps de los archivos locales. No volver a aplicarlas ni ejecutar un `db push` general sin reconciliar el historial.

Tras la tercera migración, el RPC anónimo devuelve las propuestas correspondientes: 50.10 → `INST-001` (Recursos del Defensor del Pueblo), 50.62 → `MIG-010` (Incidentes de devolución colectiva/no devolución) y 50.1 → propuesta de verificación documental, sin indicadores. Los conteos y snapshots oficiales se conservaron; no se publicaron decisiones editoriales ni mediciones.

Frontend CI pasó en `main`. La sección pública se comprobó en producción en Chromium a ancho móvil y de escritorio. La gestión está disponible en `/admin/indicators` con la autenticación administrativa existente.

### Repetir la validación o instalar en otro entorno

En un entorno donde todavía no estén aplicadas, instalar en este orden sobre el esquema HRCT existente:

1. `supabase/migrations/20261004093520_visual_indicators.sql`.
2. `supabase/migrations/20261004093818_indicator_import_review.sql`.
3. `supabase/migrations/20261004105020_public_indicator_proposals.sql`.

El historial del repositorio contiene migraciones anteriores con nombres de ocho dígitos y versiones repetidas por fecha. Estas migraciones se generaron con Supabase CLI; no ejecutar un `db push` general sin reconciliar primero ese historial. Se pueden aplicar los SQL concretos pendientes mediante el proceso habitual de migración del entorno, dejando registrados sus nombres/versiones. Requieren PostgreSQL ≥15 (`UNIQUE NULLS NOT DISTINCT`).

Validación local del anexo, sin credenciales ni escritura:

```bash
npm run indicators:validate
```

Tras aplicar las migraciones, validar contra el proyecto ya configurado (la referencia se comprueba contra `NEXT_PUBLIC_SUPABASE_URL`):

```bash
node --env-file=.env.local scripts/import-indicators.mjs --database --project=gostbdmrzchccnydftgd
```

Importar explícitamente las propuestas, solo cuando corresponda al entorno autorizado:

```bash
node --env-file=.env.local scripts/import-indicators.mjs --write --project=gostbdmrzchccnydftgd
```

Desplegar después el frontend por su procedimiento habitual. Revisar primero catálogo/componentes, luego aplicabilidad y vínculos, y finalmente mediciones documentadas. No publicar todo el seed en bloque: sus filas son propuestas. En entornos sin las migraciones, la ficha presenta un error recuperable de consulta, nunca una falsa ausencia de datos; la gestión presenta el paso pendiente.

## Contrato de importación de mediciones

El formulario de lote acepta un array de 1–500 objetos y lo inserta de forma atómica como borradores. Campos obligatorios: `component_id`, `country_iso2`, `scope`, `period_start`, `period_end`, `unit`, `source_title`, `source_url`, `citation`, `publication_date`, `retrieved_at`, `series_key`, `methodology_version`. `indicator_id` viene del expediente del indicador y no se toma del JSON.

`scope` es un objeto con claves estables `territory` y `population`, y dimensiones adicionales de texto cuando proceda; el orden de las claves es irrelevante. País y componente tienen columnas propias. Se rellena exactamente uno de `numeric_value`, `boolean_value`, `text_value`, o ninguno cuando se documenta `missing_reason`. Un booleano desconocido se registra con `missing_reason`, nunca con `false`. Opcionales: `evidence_id`, `break_before`, `comparability_notes`, `quality_notes`, `supersedes_id`. Autor, editorial_status y selección pública los controla el servidor. Usar timestamps ISO con zona; el formulario individual indica UTC.

La revisión muestra las fuentes alternativas y el UUID necesario para añadir una corrección o documentar una baseline. No se puede sobrescribir una observación ya publicada.

## Validación

```bash
npm test
npm run indicators:validate
npm run build
npx playwright install --with-deps chromium
npm run test:indicators:ui
```

Los tests ejecutan las tres migraciones en PGlite/PostgreSQL aislado: validación e idempotencia del anexo, conservación de revisiones humanas y archivos tras cambios de scope, previsualización del anexo sin filtración de borradores privados, exclusión de TEST, publicación, permisos públicos, unidades/tipos, reutilización entre recomendaciones, ventanas históricas, fuentes alternativas, correcciones, baseline y metas por scope. También verifican puntos porcentuales, cero, desconocidos, huecos, rupturas, desagregaciones y obsolescencia.

`tests/indicator-preview-fixtures.mjs` contiene exclusivamente datos sintéticos identificados como TEST para una previsualización aislada; no se importa desde `src`, las migraciones ni el seed. La navegación y el gráfico se verificaron en Chromium a ancho móvil y de escritorio, incluida la tabla, el histórico, el selector de población, el foco de puntos y la recuperación de errores.

Referencias técnicas consultadas: [RLS y grants en Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [triggers](https://supabase.com/docs/guides/database/postgres/triggers). La consulta pública mantiene derechos del invocante; el único trigger con derechos de propietario escribe auditoría privada, tiene `search_path` fijo y no admite ejecución pública.
