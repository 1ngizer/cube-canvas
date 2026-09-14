# Cube Canvas – Resumen del proyecto

## 1. Visión general
**Cube Canvas** es una aplicación web diseñada para calcular el impacto de planes de crecimiento en el efectivo disponible de un negocio.  Permite al usuario ingresar:
- Efectivo disponible inicial
- Deudas totales
- Ventas proyectadas por producto/servicio
- Costos fijos y variables
- Información de productos/servicios del modelo de negocio

Con esos datos la herramienta calcula el efectivo disponible después de pagar deudas y cubrir costos, facilitando la toma de decisiones estratégicas.

---

## 2. Stack tecnológico (decidido)
| Capa | Tecnologías elegidas |
|------|----------------------|
| Front‑end | **React** (v18) + **Vite** (scaffolding) |
| CSS | CSS vanilla (variables definidas en `src/index.css`) |
| Build | Vite | 
| Hosting | (pendiente – se puede desplegar en Netlify, Vercel, Cloud Run, etc.) |
| Persistencia | (por ahora **no** se persiste, la app es de una sola sesión) |
| Lógica financiera | JavaScript puro (funciones que replicarán las fórmulas del Excel) |

---

## 3. Estado actual del repositorio (al 22‑08‑2026)
```
/Ingizer
└─ cube-canvas/                     ← carpeta del proyecto
   ├─ index.html                   ← plantilla Vite
   ├─ package.json                 ← dependencias básicas (react, vite)
   ├─ src/
   │   ├─ main.jsx                 ← punto de entrada
   │   ├─ App.jsx                  ← **todavía contiene la plantilla Vite** (no se ha reemplazado en el árbol de archivos)
   │   ├─ App.css                  ← estilos base
   │   ├─ index.css                ← variables CSS (ya sobrescritas con tema neutro)
   │   └─ assets/…                ← logos de Vite/React (no usados todavía)
   └─ public/…                     ← recursos estáticos
```

### Acciones completadas
1. **Creación del workspace** bajo `~/Desktop/Backup/Desarrollo/04. Cube Canvas` y sincronización con `~/Desktop/Backup/Ingizer/cube-canvas`.
2. **Inicialización y arquitectura modular** con React 18/19 y Vite.
3. **Sistema de diseño y tokens** en `src/index.css` (Dark Theme con soporte responsive y `@media print` para exportación en PDF).
4. **Formulario estructurado (`FinancialForm.jsx`)** con soporte dual:
   - Modo Venta Global.
   - Modo Desglose Dinámico de Productos (agrega/elimina filas con precio unitario, unidades y subtotal en vivo).
5. **Panel de Resultados (`Results.jsx`)** con semáforo de liquidez (verde/amarillo/rojo), KPI de efectivo final, margen operativo, punto de equilibrio (break-even) y tabla de flujo de fondos.
6. **Motor de cálculo (`finance.js`)** con funciones puras probadas unitariamente.
7. **Gestor de Escenarios en `App.jsx`**:
   - 3 Escenarios base preconfigurados (Moderado, Agresivo, Defensivo).
   - Persistencia local completa con `localStorage` (guardar simulación con nombre personalizado, cargar y eliminar).
8. **Exportación ejecutiva**: Botón de imprimir / guardar reporte en PDF optimizado.

---

## 4. Próximos pasos (tareas pendientes)
| # | Tarea | Estado |
|---|-------|--------|
| 1 | **Obtener el modelo Excel del cliente** con fórmulas definitivas de amortización bancaria e impuestos para calibración fina. | **Pendiente** (solicitado al cliente). |
| 2 | **Branding corporativo final**: Incorporar imagotipo oficial de Ingizer / Cube Canvas en SVG y favicon. | Pendiente |
| 3 | **Configurar despliegue continuo** (Vercel / Netlify) bajo subdominio de `ingizer.com`. | **Config lista** (`vercel.json` y `netlify.toml` en la raíz, build verificado). Falta: conectar el repo en Vercel/Netlify (cuenta del usuario) y apuntar subdominio. |
| 4 | **Autenticación / Multi-usuario** (en caso de requerir guardar escenarios en la nube con base de datos en vez de solo localStorage). | Backlog futuro |


---

## 5. Preguntas abiertas (para seguir el desarrollo en la nueva cuenta)
1. **Modelo financiero** – Necesitamos el archivo Excel o al menos una descripción de las fórmulas clave (p.ej., `Efectivo disponible = efectivo_inicial + ventas - costos_fijos - costos_variables - deudas`).
2. **Persistencia** – ¿Debe la aplicación guardar los canvases entre sesiones? Si es así, ¿prefiere `localStorage` o una API backend?
3. **Branding** – Colores y tipografía corporativa de Ingizer (para aplicar en `src/index.css`).
4. **Despliegue** – ¿Tiene preferencia por Netlify, Vercel, Cloud Run, o se quiere desplegar dentro del dominio `ingizer.com`?
5. **Multiplicidad de usuarios** – ¿La herramienta será multi‑usuario con cuentas, o solo una herramienta interna de un usuario?

---

## 6. Cómo continuar desde otra cuenta de Antigravity
1. **Clonar el proyecto** (si ya está en un repo) o copiar la carpeta `cube-canvas` a la nueva máquina.
2. Ejecutar `npm install` y `npm run dev` para verificar que el scaffolding funciona.
3. Aplicar el parche de `App.jsx` (ver el bloque de diff en la tarea `task.md`).
4. Crear los nuevos componentes (`FinancialForm.jsx`, `Results.jsx`) siguiendo la estructura descrita en el plan.
5. Importar la lógica financiera una vez que tenga el modelo Excel.
6. Continuar con la lista de tareas del `task.md`.

---

**Resumen**
- El proyecto está preparado con React + Vite y estilos base. 
- Falta reemplazar la plantilla inicial y crear los componentes de la UI. 
- La pieza clave que bloquea el avance es la lógica financiera del Excel (pendiente de recibir). 
- Con esta documentación la nueva cuenta podrá retomar el desarrollo sin perder contexto.

---

*Este documento se ha guardado como `project_summary.md` en el directorio de artefactos y puede convertirse a PDF con cualquier herramienta de conversión de markdown a PDF (por ejemplo, `pandoc`).*
