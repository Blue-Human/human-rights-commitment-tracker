Las series publicadas el 4 de octubre de 2026 contienen 239 observaciones de España, 16 indicadores y 25 series con ámbitos separados, de 2015 a 2025. Aportan mediciones a 86 recomendaciones del catálogo aprobado. No modifican valoraciones de cumplimiento ni crean metas o baselines.

La ampliación `data/indicators/history-housing-2026-10-04/` añade 11 observaciones, dos indicadores y cinco recomendaciones: el total pasa a 250 observaciones, 18 indicadores, 27 series y 91 recomendaciones con mediciones. HOU-001 recoge una única estimación oficial aproximada de 290.000 viviendas sociales de titularidad autonómica y municipal publicada por MITMA en octubre de 2020. Se conserva como dato histórico; no se repite en años posteriores ni se interpreta como un censo a 31 de diciembre. HOU-005 recoge las calificaciones definitivas de vivienda protegida de 2015–2024, transcritas y contrastadas con la tabla 1.2, página 7, del boletín anual 2024 de MIVAU. Incluyen promoción pública y privada, venta y alquiler: no son entregas de vivienda pública de alquiler ni permiten reconstruir su parque. La captura registra el SHA-256 del PDF consultado y el de cada transcripción. No se carga el porcentaje de hogares cubiertos como «% stock», porque tiene un denominador distinto.

Los gráficos y una interpretación breve aparecen al principio de cada recomendación, antes de su valoración. Las métricas sin observaciones se conservan en un apartado desplegable cuando existen otras con datos. Si una serie solo contiene datos anteriores a la ventana reciente, la ficha abre todo el histórico para mostrarla. La portada no contiene gráficos de indicadores.

Las fuentes se conservan en `data/indicators/history-2026-10-04/`: respuestas oficiales JSON-stat de Eurostat, filas de ejecución presupuestaria del Defensor del Pueblo y transcripción contrastada de las tablas del informe de Interior. Cada captura tiene URL, fecha de recuperación y SHA-256. Interior bloquea la descarga directa; la captura es una transcripción manual de las tablas consultadas en el navegador, no una copia binaria del PDF. Su publicación se fecha mediante la nota oficial de presentación del 3 de junio de 2026.

Eurostat utiliza el año estadístico de cada observación. La fecha de publicación guardada corresponde a la versión disponible del conjunto, no a la primera publicación histórica de cada dato; la UI la denomina «Versión de fuente». En EU-SILC, la renta se refiere generalmente al año anterior al de la encuesta. La fuente mantiene la definición AROPE Europa 2030 incluso para observaciones retrospectivas; no se concatena con la definición Europa 2020.

Se conservan las banderas de estimación, provisionalidad, fiabilidad, definición diferente y ruptura. Las rupturas y cambios de bandera de definición abren un tramo metodológico distinto: ni las líneas ni los cambios atraviesan esos límites. La AOD cambia a equivalente de donación en 2018. La discapacidad corresponde a limitación de actividad declarada, no al reconocimiento administrativo. El índice de GEI usa 1990 = 100; no constituye una meta de HRCT. Las brechas por país de nacimiento son diferencias descriptivas y no identifican etnia ni prueban discriminación.

Los valores derivados de EDU-002, RAC-005 y DIG-003 restan dos tasas oficiales del mismo periodo y denominador, según la fórmula de cada componente. DIG-003 es bienal desde 2021. No se interpolan huecos ni se convierten ausencias en ceros. En presupuesto se usan obligaciones reconocidas al cierre, en euros nominales. Se excluyen páginas con año o fecha ambiguos; no se utiliza la dotación como gasto ejecutado. Interior separa tasas y número de hechos; ambos incluyen infracciones e incidentes además de delitos y están afectados por denuncia y detección.

Validación reproducible, sin red ni credenciales:

```sh
node scripts/historical-indicators.mjs
node scripts/historical-indicators.mjs --capture=data/indicators/history-housing-2026-10-04
npm test
```

`node scripts/historical-indicators.mjs --sql` genera una carga transaccional para un operador de servidor. Resuelve las identidades por códigos; revisa unidades y estados del catálogo, publica mediante el procedimiento de revisión existente y conserva su auditoría. Repetir la carga no produce duplicados ni cambios de auditoría. Un conflicto con un dato ya publicado aborta toda la transacción y exige una corrección explícita.

Para la ampliación de vivienda se usa `node scripts/historical-indicators.mjs --capture=data/indicators/history-housing-2026-10-04 --sql`. La fuente del boletín tiene fecha de publicación pública del 4 de julio de 2025; la edición del PDF está fechada en junio. No requiere nuevas tablas ni migraciones.

`scripts/collect-historical-indicators.mjs` documenta las consultas y extracción de esta captura. No publica datos. Para una actualización futura, crear una nueva carpeta y versión fechada, revisar los cambios y añadir observaciones o correcciones por el flujo editorial. No sobrescribir la captura publicada. Las restantes series sin fuente contrastada siguen sin mediciones y se presentan de forma compacta.
