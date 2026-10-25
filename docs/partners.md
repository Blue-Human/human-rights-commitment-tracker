# Portal de partners

Dos pantallas: **Mis proyectos** (`/partners`) y una ficha del proyecto con actividades de la organización, resultados/indicadores compartidos, evidencias verificadas y el formulario para enviar evidencias. Los documentos se referencian mediante fuente y URL; no hay carga de archivos ni edición de mediciones.

## Uso

1. En **Administración → Programmes → Partners**, abre la organización. En **Acceso al portal**, introduce nombre y email, crea la invitación y copia el enlace para entregárselo a esa persona. No se envía correo automáticamente. Cada enlace caduca en siete días, es de un solo uso y permite establecer la contraseña. Una nueva invitación también permite restablecerla.
2. En la asignación del partner al proyecto, activa **Acceso de este partner al proyecto**. Las fechas de asignación, el archivo del proyecto/programa/organización y el estado de acceso limitan la disponibilidad. Una persona pertenece a una organización; puede ver varios proyectos de esa organización.
3. En productos, outcomes e indicadores, activa **Compartir en el portal de partners** para mostrar lo seleccionado a las organizaciones autorizadas del proyecto. En evidencias, además se exige verificación y confidencialidad **Pública** o **Partners**. El campo de selección pública es independiente.

La evidencia enviada por un partner queda como **Pendiente**, con confidencialidad **Partners**, sin compartir y sin selección pública. El autor puede consultar el estado de sus propias aportaciones. Administración la revisa en el editor de evidencias habitual y decide si la comparte. Editar contenido verificado retira ambas selecciones y exige nueva revisión. Los partners no pueden modificar aportaciones existentes, aprobarlas, publicar datos ni alterar evaluaciones estatales.

**Desactivar acceso** en la ficha del partner invalida sus sesiones y enlaces pendientes. Reactivarlo no revive sesiones ni enlaces anteriores; la persona puede entrar con su contraseña existente o recibir una invitación nueva. Retirar el acceso de una asignación afecta solo a ese proyecto.

## Implementación y permisos

Se reutilizan Next.js, Material UI, Supabase y el patrón REST del repositorio. Supabase Auth conserva y comprueba contraseñas; las claves administrativas y los tokens Auth nunca llegan al navegador. No se añaden proveedores, dependencias o variables obligatorias. Se usan `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `ADMIN_SESSION_SECRET`, ya existentes.

La sesión del portal es una cookie independiente `hrct_partner`, firmada con HMAC y dominio criptográfico propio, `HttpOnly`, `SameSite=Lax`, segura en producción y con duración de 12 horas. Cada página/acción consulta la cuenta activa, organización y versión de sesión. Los cambios de acceso y nuevas invitaciones incrementan esa versión. La comprobación de contraseña utiliza los límites de Supabase Auth; las llamadas pasan por el servidor de la aplicación. El portal no acepta la cookie administrativa y viceversa.

`partner_accounts` vincula identidad Auth y organización. `partner_invitations` conserva únicamente el hash del secreto y usa una reserva de cinco minutos para coordinar el cambio de contraseña con su consumo. La contraseña no se guarda en tablas operativas. Metadatos y cambios de permisos quedan en el historial privado `programme_audit`. No hay registro público de cuentas ni asignación automática por email de contacto.

Todas las tablas operativas, cuentas e invitaciones tienen RLS y privilegios revocados para `PUBLIC`, `anon` y `authenticated`. Los RPC `hrct_partner_*` son `SECURITY INVOKER`, exclusivos del servidor y vuelven a comprobar acceso al proyecto. Las respuestas seleccionan campos expresamente; no reutilizan el workspace administrativo. Presupuestos, contactos, donantes, financiación, contexto interno, riesgos, hipótesis, notas, referencias de archivos privados e historial editorial no se incluyen. Los borradores de otras personas no son visibles. Los proyectos y sus aportaciones no afectan a `commitments`, `assessments`, evidencia estatal ni indicadores públicos.

Aplicar `supabase/migrations/20261008184713_partner_portal.sql` antes de desplegar el frontend. No se crean organizaciones, cuentas ni invitaciones de ejemplo en producción. Las pruebas usan identidades sintéticas y Auth simulado; producción se comprueba en modo de lectura.

## Comprobación

`npm test` incluye firma/caducidad de sesiones, exclusión de permisos anónimos, invitaciones de un solo uso, reservas concurrentes, revocación, aislamiento de organizaciones/proyectos, proyección privada, correcciones de mediciones y envío sin aprobación automática. `npm run test:programmes:ui` prueba invitación, activación, acceso, envío, revisión administrativa, enlace usado, contraseña incorrecta, cierre de sesión, retirada de acceso y móvil, junto con el flujo MEL existente. CI ejecuta ambas comprobaciones y la regresión del tracker público.

La migración aplicada conserva exactamente los hashes de los 328 compromisos y las 332 evaluaciones estatales; no añade cuentas, invitaciones ni accesos. Los advisors no añaden errores de seguridad ni claves foráneas sin índice al módulo. Las tablas privadas producen el aviso informativo esperado de [RLS sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy); los dos avisos de vistas de monitoring ya existentes constan en [Programmes](programmes.md).
