<!-- Instrucciones del monitor de ingizer (copia de 00. Monitor/docs/GUIA_ACTUALIZAR_MONITOR.md). Sin secretos. -->
Tu token está en `~/.config/ingizer-monitor/antigravity.token`. Donde la guía dice `<tu-nombre>`, usa `antigravity`.


# 0. Qué es el monitor y para qué te lo pido

El monitor de ingizer (https://monitor.ingizer.com) es el tablero único de todos los proyectos. Johno lo abre, elige un proyecto en el desplegable de arriba y ve **solo ese proyecto**: Resumen, Salud, Arquitectura, Pendientes, Entregables, Diario, Historial y CRM. Otras IAs lo leen por la API.

Tu trabajo es dejarlo **exacto y al día**, y mantenerlo así en cada sesión futura. Si algo hecho no está en el monitor, para el equipo no pasó.

Proyectos y su identificador (`slug`, siempre en minúsculas):

| slug | Proyecto | Lo gestiona |
|---|---|---|
| `ingizer` | Ingizer: diagnóstico financiero con IA | Claude |
| `igeogo` | igeogo | Claude |
| `posbank` | PosBank | Claude |
| `bizzopp` | BizzOpp | Antigravity |
| `cubecanvas` | Cube Canvas | Antigravity |
| `infra` | Infraestructura compartida (Supabase, Anthropic, Resend, Wompi, Meta, Railway, DNS, GitHub) | Claude (lo técnico) |

Solo edita los proyectos que gestionas. Si ves un problema en otro, **no lo edites**: crea un pendiente en ese proyecto con `owner` igual a la IA que lo gestiona.

# 1. Cómo acceder (haz esto primero)

Tu token está en `~/.config/ingizer-monitor/antigravity.token` (por ejemplo `claude-code.token` o `antigravity.token`). Léelo solo cuando lo uses. Nunca lo imprimas, lo pegues en un documento, en el chat, ni lo escribas en el monitor.

**Opción A, conector MCP (si tu herramienta lo trae):** el servidor se llama `ingizer-monitor`, URL `https://monitor.ingizer.com/mcp`. Herramientas: `list_projects`, `get_project`, `get_health`, `list_journal`, `add_journal_entry`, `list_tasks`, `add_task`, `update_task`, `list_deliverables`, `add_deliverable`, `update_project`.

**Opción B, API REST (si no ves esas herramientas):** base `https://monitor.ingizer.com/api/v1`. En la terminal:

```bash
TOKEN=$(cat ~/.config/ingizer-monitor/antigravity.token)
curl -s -H "Authorization: Bearer $TOKEN" https://monitor.ingizer.com/api/v1/projects
```

Endpoints:
- `GET /projects` y `GET /projects/<slug>` (arquitectura, pendientes en texto, tareas, entregables, diario)
- `PUT /projects/<slug>` con JSON: `description`, `status` (activo|en_desarrollo|pausado|archivado), `stack` (lista), `urls`, `links` (objetos), `architecture_md`, `pendientes_md`
- `GET /tasks?slug=<slug>&done=1`, `POST /tasks`, `PATCH /tasks/<id>`
- `GET /deliverables?slug=<slug>`, `POST /deliverables`
- `GET /journal?slug=<slug>`, `POST /journal`
- `GET /health`

**Comprobación obligatoria antes de seguir:** llama a `list_projects` (o `GET /projects`). Debes ver los 6 proyectos. Si recibes 401, tu token no sirve: **detente** y avisa a Johno. No intentes arreglarlo.

# 2. Reglas que no se negocian

1. **Cero secretos.** Ni llaves (`sk-ant-`, `prv_`, `ghp_`, `re_`, `imk_`, JWT), ni contraseñas, ni cadenas de conexión con credenciales, ni datos personales de clientes (correos, teléfonos, cédulas, nombres de personas naturales). De una credencial escribe solo su nombre ("la variable `WOMPI_EVENTS_SECRET` en Railway"). El monitor rechaza lo que parece una llave; no intentes evadirlo.
2. **Solo lo verificado.** Registra lo que leíste en el código, probaste o viste. Si no pudiste comprobarlo, escríbelo con "sin verificar".
3. **Fechas absolutas** AAAA-MM-DD. Nunca "ayer" ni "la semana pasada".
4. **Lee antes de escribir.** `architecture_md` y `pendientes_md` **reemplazan todo el texto**: primero `get_project`, conserva lo que sigue vigente, cambia solo lo que corresponde. Cada edición queda en el historial y se puede deshacer, pero no dependas de eso.
5. **Un push no despliega.** Los servicios de Railway no están conectados a GitHub; se despliega con `railway up`. Siempre aclara si algo está solo en el repositorio o ya en producción.
6. **Español claro**, para alguien de negocio. Define las siglas la primera vez.
7. **Sin duplicados.** Antes de crear un pendiente o entregable, busca uno igual (`list_tasks`, `list_deliverables`).

# 3. Cómo cargar cada tipo de información (el formato exacto)

## 3.1 Arquitectura (`architecture_md`)

Es Markdown. Se muestra tal cual en la pestaña Arquitectura. Usa **siempre esta plantilla** (omite una sección solo si de verdad no aplica; máximo unas 150 líneas):

```markdown
# <Nombre del proyecto>: arquitectura (actualizado AAAA-MM-DD)

## Qué es
Dos o tres frases: para quién es, qué problema resuelve, estado (en producción / en desarrollo / piloto).

## Componentes
- **<Componente>** (<repositorio o servicio>): qué hace, tecnología, dónde corre (Railway, Netlify, Supabase...).

## Flujos principales
1. <Flujo>: paso a paso en una línea cada paso (quién hace qué).

## Datos
- Base de datos y tablas principales (solo nombres), qué guarda cada una, políticas de seguridad (RLS) en una frase.

## Integraciones externas
- <Servicio>: para qué se usa y qué variable de entorno usa (**solo el nombre**, nunca el valor).

## Direcciones y despliegue
- Dominios y servicios de Railway (nombre del proyecto y del servicio), cómo se despliega, cómo se comprueba que está sano (`/health`).

## Estado verificado
- Qué está probado y cómo (fecha). Qué **no** está probado.

## Riesgos y deuda técnica
- Lista corta, lo más serio primero.
```

## 3.2 Pendientes (tareas, pestaña Pendientes)

Cada pendiente es una tarea con campos. Usa `add_task` / `POST /tasks`:

| Campo | Cómo llenarlo |
|---|---|
| `slug` | Proyecto al que pertenece. |
| `title` | Verbo en infinitivo + resultado concreto, máx. 300 caracteres. Bien: "Publicar la landing con los tres planes". Mal: "Landing". |
| `details` | Por qué importa, qué falta, **cómo se sabe que está listo**, rutas o enlaces. Sin secretos. |
| `priority` | `alta` solo si hay riesgo de dinero, seguridad, caída o fecha límite; si no, `media` o `baja`. |
| `area` | A qué área de gerencia pertenece: `tech`, `comercial`, `marketing`, `contabilidad`, `finanzas`, `estrategia` o `legal`. Si la omites se deduce del título, pero **indícala siempre**: el tablero de Johno se organiza por área. |
| `owner` | Quién lo hace: `johno`, `claude`, `antigravity`, `chatgpt` o `copilot`. Si lo omites se usa el recomendado. |
| `due_date` | AAAA-MM-DD si hay fecha límite real. |
| `status` | `not_started` (1. Not Started), `ongoing` (2. Ongoing), `blocked` (3. Blocked), `in_review` (4. In Review) o `done` (5. Done). Los nombres antiguos en español se aceptan, pero usa los de inglés. |

Quién debería hacerlo (el monitor lo recomienda solo y lo muestra como "Recomendado"): lo técnico, la IA que gestiona el proyecto; comercial y marketing, ChatGPT redacta (guiones, copy, campañas) y Johno ejecuta; finanzas y estrategia, Claude analiza con datos reales y Johno decide; contabilidad y legal, Johno con su contador o abogado (la IA solo prepara el borrador). Si no estás de acuerdo con la recomendación, cámbiala con `update_task` (`owner`) y explica por qué en `details`.

Los pendientes **no son solo técnicos**: cuando detectes trabajo comercial, de marketing, contable, financiero, estratégico o legal, créalo también, con su área. Márcalo como propuesto ("Propuesto por <IA> el AAAA-MM-DD; confirma si aplica") cuando lo deduces tú y no lo pidió Johno.

Reglas de estado:
- Empiezas algo: `ongoing`.
- Terminaste y falta que alguien lo revise o apruebe (Johno, el contador, el abogado, la otra IA): `in_review`, diciendo en `details` quién debe revisar.
- Depende de Johno o de un tercero: `blocked`, y en `details` di **qué se necesita y de quién** (ejemplo: "Bloqueado: Johno debe iniciar sesión en Supabase").
- Terminado, revisado y verificado: `done` (queda solo una línea en el diario) y agrega en `details` cómo lo verificaste.
- No existe borrar: lo que ya no aplica se cierra en `done` con la nota "ya no aplica: <razón>".

El campo `pendientes_md` del proyecto es solo texto de apoyo (notas largas, contexto). **La lista oficial son las tareas.** No dupliques tareas dentro de ese texto.

## 3.3 Entregables (pestaña Entregables)

`add_deliverable` / `POST /deliverables`: `slug`, `title`, `kind` (informe, documento, guía, release, demo, borrador), `url` (https, opcional), `notes` (ruta del archivo o descripción), `delivered_at` (AAAA-MM-DD **de cuando se entregó de verdad**; no se puede corregir después, así que verifica la fecha). Un entregable es algo terminado que alguien puede abrir: un informe, un release desplegado, una guía, una demo.

## 3.4 Diario (pestaña Diario)

`add_journal_entry` / `POST /journal`: `slug`, `kind`, `summary`, `details`.
- `cambio`: algo que cambió (código, configuración, despliegue).
- `decision`: algo que se decidió y **por qué**.
- `incidente`: algo falló (qué pasó, impacto, causa, qué se hizo, prevención).
- `nota`: contexto que conviene recordar.

`summary`: una línea con el proyecto y el resultado, máx. 500 caracteres. Ejemplo: "Ingizer: corregido el envío del consentimiento; en producción desde 2026-10-11". `details`: qué se hizo, cómo se verificó, qué quedó pendiente.

## 3.5 Datos del proyecto (pestaña Resumen)

`update_project` con `description` (2 a 4 frases), `status`, `stack` (lista de tecnologías), `urls` (producción, API, salud...) y `links` (repositorio, Railway, Notion, Supabase). Los valores deben ser enlaces públicos o internos de navegación; nada con claves dentro.

## 3.6 CRM (pestaña CRM)

El CRM **no se escribe en el monitor**: se lee en vivo del propio producto.
- `ingizer`: se lee del backend de Ingizer (leads, etapas, notas). Para cambiar un lead se usa el CRM de la app.
- `bizzopp`: se lee la tabla `leads` (intenciones de inversión).
- `igeogo`, `posbank`, `cubecanvas`, `infra`: aún sin CRM conectado.
Lo que sí te toca: si cambias o creas el CRM de tu producto, anótalo en la arquitectura (sección Datos) y deja un pendiente "Conectar el CRM de <proyecto> al monitor" indicando qué tabla o ruta de solo lectura habría que exponer.

# 4. Sincronización inicial (hazla ahora, una sola vez, proyecto por proyecto)

Para **cada proyecto que gestionas**, en este orden. No pases al siguiente proyecto hasta cerrar el anterior.

1. **Leer el monitor:** `get_project` y `list_tasks` (con `done=true`) del proyecto. Anota qué hay.
2. **Leer la realidad:** README, carpeta `docs/`, informes de auditoría, listas de pendientes, migraciones, rutas del servidor, nombres de variables de entorno, `package.json`, `git log` reciente y `git status`.
3. **Arquitectura:** reescribe `architecture_md` con la plantilla 3.1, describiendo **lo que existe hoy**, no lo que se planeó.
4. **Datos del proyecto:** corrige `description`, `status`, `stack`, `urls` y `links` si están desactualizados.
5. **Pendientes:**
   - Cierra (`done`) los ya resueltos, con la prueba en `details`.
   - Corrige prioridad, responsable o texto de los que cambiaron.
   - Crea los que falten (busca duplicados antes).
   - Pon `blocked` los que dependen de Johno o terceros, diciendo qué se necesita.
   - Quita de los textos cualquier dato personal de clientes.
6. **Entregables:** registra cada informe, guía, documento o release ya entregado que falte, con su fecha real.
7. **Diario:** una entrada `nota` "Sincronización inicial": qué corregiste y qué discrepancias había entre el monitor y la realidad.
8. **Verificación:** vuelve a llamar `get_project` y comprueba que quedó lo que escribiste (arquitectura, conteo de tareas, entregables).

Solo Claude: `ingizer`, `igeogo`, `posbank` y los pendientes técnicos de `infra`. Solo Antigravity: `bizzopp` y `cubecanvas`; además, en `cubecanvas` decide cuál de los dos proyectos de Railway es el vigente y registra la decisión.

# 5. Rutina permanente (desde ahora, en cada sesión)

**Al empezar:** `list_projects` y `get_health` (mira qué está en rojo o amarillo); `get_project` y `list_tasks` del proyecto en que vas a trabajar; lee las últimas entradas del diario. Si el monitor contradice el código, el código manda: corrige el monitor.

**Mientras trabajas:** trabajo nuevo que no harás ahora, `add_task`. Empiezas, `ongoing`. Terminas y falta revisión, `in_review`. Terminado y verificado, `done`. Tomas una decisión, entrada `decision`. Algo falla en producción, entrada `incidente` y un pendiente de prevención. Generas un informe, guía, release o demo, `add_deliverable`.

**Al terminar (siempre, aunque la sesión sea corta):**
1. Entrada de diario `cambio`: qué cambió, dónde, si está desplegado y cómo se verificó.
2. Pendientes cerrados en `done`; los que quedaron a medias en `ongoing`, `in_review` o `blocked`, con la razón.
3. Si cambió algo estructural (rutas, tablas, servicios, integraciones, variables nuevas por nombre, dominios): actualiza `architecture_md` (leer, fusionar, guardar).
4. Si cambió un enlace o dirección: `update_project` con `urls` o `links`.
5. Comprueba con `get_project` que quedó guardado.

# 6. Lista de comprobación final (respóndela al terminar)

Entrega esta tabla a Johno con números reales:

| Proyecto | Arquitectura reescrita (sí/no) | Tareas creadas | Cerradas | Modificadas | Bloqueadas | Entregables nuevos | Entrada de diario (sí/no) |
|---|---|---|---|---|---|---|---|

Después, en tres secciones cortas:
- **Diferencias importantes** entre el monitor y la realidad.
- **Decisiones que solo Johno puede tomar** (numeradas, con tu recomendación).
- **Lo que necesita que Johno haga con su sesión** (iniciar sesión, pagos, tokens).

# 7. Si algo falla

- **401:** token revocado o mal leído. Detente y avisa. No insistas.
- **400 "parece incluir una llave o un secreto":** quita ese texto y usa el nombre de la variable en vez del valor.
- **No logras conectarte:** sigue con tu trabajo y al final entrega, en una sección "Para registrar en el monitor", el texto exacto (arquitectura, tareas, entregables, diario) listo para copiar.
- **Un campo que no puedes corregir** (por ejemplo la fecha de un entregable): déjalo anotado en esa sección; no crees un duplicado.
