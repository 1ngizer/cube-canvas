# Prompt para Antigravity: agregar BizzOpp y Cube Canvas al vigilante externo (UptimeRobot)

Copia desde "INICIO" hasta "FIN" y pégalo en Antigravity (con la carpeta de BizzOpp o de Cube Canvas abierta). No contiene llaves.

---------------------------------- INICIO ----------------------------------

# Contexto

Trabajas para Johno (Ingizer SAS) y gestionas dos proyectos: **BizzOpp** (slug `bizzopp`) y **Cube Canvas** (slug `cubecanvas`). Existe un tablero único, el **monitor de ingizer** (https://monitor.ingizer.com), y además un **vigilante externo** en **UptimeRobot** que corre fuera de Railway. Sirve para enterarnos si Railway pausa la cuenta y el propio monitor también cae (pasó el 2026-10-09).

Hoy UptimeRobot vigila 6 direcciones (Ingizer, igeogo, PosBank y el monitor). **Faltan BizzOpp y Cube Canvas.** Tu trabajo es agregarlas y dejar constancia en el monitor.

# Lo que debes saber antes de empezar

- La cuenta es del plan **gratuito** (50 monitores, revisión cada 5 minutos) y está a nombre de **admin@ingizer.com**. **Tú no puedes iniciar sesión, crear cuentas ni usar la contraseña de Johno.** Si tu navegador no tiene la sesión abierta, pídele a Johno que inicie sesión él y que te deje el navegador abierto, o dale los pasos a él.
- **La API de UptimeRobot NO sirve para crear monitores en este plan** (responde "no puedes usar algunas configuraciones con tu plan"). Se crean **a mano en el panel**: https://dashboard.uptimerobot.com/monitors → botón **New** → **Single monitor**. La pantalla puede tardar en cargar; espera unos segundos.
- La llave de la API que usa el monitor es de **solo lectura**. No la busques ni la pidas: no la necesitas.
- **No pegues llaves, contraseñas ni tokens** en el chat, en archivos ni en el monitor.

# Paso 1: confirmar que las direcciones responden

Antes de crear nada, comprueba que respondan 200 (con `curl -s -o /dev/null -w "%{http_code}" <dirección>`):

| Proyecto | Dirección a vigilar | Esperado |
|---|---|---|
| BizzOpp (app) | `https://bizzopp.ingizer.com/` | 200 |
| BizzOpp (servidor) | `https://bizzopp-production.up.railway.app/health` | 200 con `{"ok":true,"service":"bizzopp-backend"}` |
| Cube Canvas | `https://cubecanvas-production.up.railway.app/health` | 200 con `OK` |

Verificadas por Claude el 2026-10-13: las tres daban 200. **No agregues todavía** `cubecanvas.ingizer.com` ni `app.bizzopp.com`: aún no resuelven (falta el CNAME de DNS, pendiente de Johno). Cuando los DNS estén listos, se agregan.

Si alguna no da 200, **no la agregues**: avisa a Johno y crea un pendiente en el monitor.

# Paso 2: crear los 3 monitores en UptimeRobot

Para cada fila de la tabla: **New → Single monitor** y completa:

- **Monitor Type:** HTTP(s)
- **Friendly name** (importante, el monitor de ingizer reconoce el proyecto por el prefijo entre corchetes):
  - `[bizzopp] App (bizzopp.ingizer.com)`
  - `[bizzopp] Servidor /health`
  - `[cubecanvas] App /health`
- **URL:** la de la tabla del paso 1.
- **Monitoring interval:** 5 minutos (el mínimo del plan gratuito).
- **Alert contacts:** marca el correo **admin@ingizer.com** (debe quedar seleccionado; sin esto el aviso no llega).
- Guarda con **Create monitor**.

# Paso 3: probar cada uno

1. Abre cada monitor y pulsa **Test Notification** (arriba a la derecha).
2. Debe llegar a admin@ingizer.com un correo "TEST: Monitor is DOWN". **No puedes leer ese correo**: pídele a Johno que confirme que llegaron los 3.
3. Comprueba que los 3 monitores aparezcan en verde (**Up**) en UptimeRobot.

# Paso 4: verificar que aparecen en el monitor de ingizer

1. Abre https://monitor.ingizer.com (con la sesión de Johno), elige el proyecto **BizzOpp** en el desplegable de arriba y entra a la pestaña **Salud**: debe aparecer el panel **Vigilante externo** con tus 2 monitores de BizzOpp (y el del propio monitor). Repite con **Cube Canvas**: 1 monitor.
2. Si no aparecen, espera 1 minuto (hay caché de 60 s) y recarga con Cmd+Shift+R. Si siguen sin salir, revisa que el nombre empiece exactamente por `[bizzopp]` o `[cubecanvas]` en minúsculas.

# Paso 5: dejar constancia en el monitor de ingizer

Usa tu token (`~/.config/ingizer-monitor/antigravity.token`, no lo imprimas) por el conector MCP `ingizer-monitor` o por la API (`https://monitor.ingizer.com/api/v1`). Sigue la guía `~/Desktop/Desarrollo/00. Monitor/docs/GUIA_ACTUALIZAR_MONITOR.md`.

1. `add_journal_entry` en **`bizzopp`** y en **`cubecanvas`** (tipo `cambio`): qué monitores se crearon, con su nombre y dirección, y la fecha (AAAA-MM-DD).
2. `update_project` de **`bizzopp`** y **`cubecanvas`**: si no existe, agrega en `links` la clave `uptimerobot` con `https://dashboard.uptimerobot.com/monitors`. (Lee primero con `get_project` y conserva los enlaces que ya hay; `links` se reemplaza completo.)
3. En la **arquitectura** de cada proyecto (`architecture_md`, leer, fusionar y guardar), agrega o actualiza una sección "Vigilancia" con: qué direcciones vigila UptimeRobot, cada cuánto, y que las alertas llegan a admin@ingizer.com.
4. `add_task` en cada proyecto con `area: tech`, estado `blocked` y `owner: johno`, solo si algo quedó pendiente de él (por ejemplo: "Crear el CNAME de cubecanvas.ingizer.com y agregarlo al vigilante").
5. Cuando todo esté verificado, si existe una tarea tuya sobre esto, ciérrala con `update_task` a `done` y escribe en `details` qué comprobaste.

# Reglas

- Solo lo verificado: no digas que algo llegó o funciona si no lo comprobaste (los correos solo los ve Johno).
- Fechas absolutas (AAAA-MM-DD). Español claro.
- No cambies nada de los otros proyectos ni de monitores que ya existen (Ingizer, igeogo, PosBank y el monitor). Si ves un problema ahí, crea un pendiente con `owner` = `claude`.
- Si algo falla (no cargan las pantallas, no tienes sesión), **detente y dile a Johno exactamente qué pasó**; no insistas ni intentes saltarte el login.

# Entrega final

Responde con una tabla corta:

| Monitor | Dirección | ¿Creado? | ¿Verde en UptimeRobot? | ¿Llegó el correo de prueba? (lo confirma Johno) | ¿Aparece en el monitor de ingizer? |
|---|---|---|---|---|---|

Y debajo, en una línea cada una: lo que dejaste registrado en el monitor y lo que queda pendiente de Johno.

----------------------------------- FIN -----------------------------------
