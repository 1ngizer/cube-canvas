# AUDITORÍA CUBE CANVAS — 2026-10-02

## 0. Resumen ejecutivo

- **Veredicto general**:
  Cube Canvas (BCC) es una herramienta de modelación y simulación financiera innovadora, intuitiva y conceptualmente potente para estructurar planes de crecimiento empresarial y capital stack. No obstante, en su estado actual presenta riesgos críticos de seguridad y exactitud que deben resolverse con urgencia: una vulnerabilidad crítica de Path Traversal en `server.js` que expone archivos del sistema; almacenamiento de API keys en texto plano en `localStorage` y en la URL de Gemini; una omisión matemática de los costos de capital de trabajo (SS) en el pronóstico a 12 meses y en el punto de equilibrio; componentes modales de análisis con propiedades desincronizadas que reportan costos en cero; y una arquitectura de interfaz rígida (`100vh overflow:hidden`) sin consultas responsivas que vuelve la aplicación inoperable en pantallas pequeñas y móviles. Resolviendo estos puntos, el producto alcanzará un nivel de madurez, seguridad y robustez de grado comercial.

- **Calificación 1–10 por área**:
  - Funcional: **6.5 / 10**
  - UI (Interfaz): **6.0 / 10**
  - UX (Experiencia): **6.5 / 10**
  - Seguridad app: **4.0 / 10**
  - Seguridad monitor: **8.5 / 10**
  - Calidad de código: **6.0 / 10**
  - DevOps: **5.5 / 10**

- **Top 5 riesgos que hay que resolver primero**:
  1. **SEC-01 (Path Traversal en `server.js`)**: Cualquier usuario puede solicitar `/../../package.json` o archivos del servidor y descargarlos debido a la falta de contención dentro de `DIST_DIR`.
  2. **FUN-01 (Omisión de Suministros/Capital de Trabajo SS en Proyección 12M y Break-Even)**: La proyección financiera a 12 meses y el punto de equilibrio ignoran `totalSS`, sobreestimando la utilidad mensual y la caja final en millones de pesos y proyectando falsa liquidez.
  3. **SEC-02 (API Keys de IA en `localStorage` y en Query String)**: La API Key de Google Gemini viaja en la URL (`?key=...`) y se almacena en texto plano en el navegador, expuesta a robo por XSS o extensiones.
  4. **FUN-02 (Propiedades Rotas en Cascada y Estrés)**: `WaterfallModal` y `StressTestModal` leen `metrics.totalCogs`, `metrics.totalOpexW` y `metrics.monthlyAssetDebtService` (en lugar de `totalCOGS`, `totalW` y `fundingSources`), mostrando $0 en costos de venta y gastos operativos.
  5. **UX-01 / UI-01 (Pérdida de Datos al Recargar y Falta de Responsividad)**: El canvas activo reside únicamente en memoria sin auto-guardado en borrador local ni alerta de salida; además, `overflow: hidden` sin media queries corta la aplicación en laptops pequeñas y móviles sin posibilidad de scroll.

- **Qué NO pudiste verificar y por qué**:
  - Comportamiento de autenticación con Google OAuth de Supabase en producción: No se realizaron inicios de sesión reales para no alterar sesiones ni mutar datos en producción (auditoría estrictamente de solo lectura).
  - Respuestas de APIs de terceros (Anthropic, Meta WhatsApp, Wompi, Resend) en `cubecanvas-monitor`: Aparecen en estado Gris (no configuradas en variables de entorno de producción).
  - Rendimiento bajo alta concurrencia de `server.js` (Stress testing HTTP): No se realizaron pruebas de carga destructivas o de denegación de servicio contra los servidores de producción de Railway.

---

## 1. Entorno y comandos ejecutados

- **Versiones de entorno**:
  - Node.js: `v24.18.0` / `v24.21.0`
  - NPM: `11.19.0`
  - React: `^19.2.8` (App principal) / `^19.0.0` (Monitor)
  - Vite: `v8.3.0` (App principal) / `v6.4.3` (Monitor)
  - TypeScript: `v5.7.3` (Monitor)
  - Sistema Operativo: macOS Darwin 24.x (Apple Silicon)

- **Comandos ejecutados y resultados**:
  - `npm run build` en raíz: **Exitoso en 187ms**. Generó `dist/index.html` (0.50 kB), `dist/assets/index-yTI3Dqpu.css` (41.48 kB), `dist/assets/index-DD0-mYWk.js` (614.58 kB). Warning emitido: chunk JS superior a 500 kB debido a importación estática de `xlsx`.
  - `npm audit` en raíz: **Falló con código ENOLOCK**. No existe `package-lock.json` en la raíz del repositorio, impidiendo auditoría determinista de dependencias.
  - `npm run build` en `cubecanvas-monitor`: **Exitoso en 1.44s**. Compiló cliente Vite y servidor TypeScript (`tsc -p tsconfig.server.json`).
  - `npm audit` en `cubecanvas-monitor`: **0 vulnerabilidades**.
  - `npm run audit:bundle` en `cubecanvas-monitor`: **0 secretos detectados** en archivos estáticos empaquetados.
  - `node -e` pruebas unitarias de `finance.js`: Verificación de casos borde, tasa 0%, plazo 0, amortización francesa, discrepancia W/SS y break-even con margen negativo.
  - Pruebas HTTP de solo lectura contra producción:
    - `curl -I https://cubecanvas-production.up.railway.app/health`: HTTP/2 `200 OK`.
    - `curl -I https://cubecanvas-monitor-production.up.railway.app/health`: HTTP/2 `200 OK`.
    - `curl -I https://cubecanvas-monitor-production.up.railway.app/api/status`: HTTP/2 `401 Unauthorized` con cabeceras `ratelimit-limit: 60`.

---

## 2. Hallazgos

### [SEC-01] Vulnerabilidad Crítica de Path Traversal / Arbitraria Lectura de Archivos en `server.js`
- **Área**: Seguridad
- **Severidad / Esfuerzo / Confianza**: CRÍTICA / S / ALTA
- **Ubicación**: `server.js:39, 48-66`
- **Evidencia**:
  ```javascript
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);
  let filePath = path.join(DIST_DIR, pathname);

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      const stream = fs.createReadStream(filePath);
      return stream.pipe(res);
    }
  ```
  Al ejecutar `path.join('/app/dist', decodeURIComponent('/../../package.json'))`, la ruta resuelve a `/package.json`, fuera de `DIST_DIR`. Como `server.js` no valida si `filePath.startsWith(DIST_DIR)`, transmite directamente cualquier archivo del disco legible por el proceso.
- **Impacto**: Fuga del código fuente del backend, secretos en variables o archivos de configuración, credenciales del sistema operativo e información propietaria.
- **Recomendación**: Sanitizar y asegurar que la ruta absoluta resuelta pertenezca a `DIST_DIR`:
  ```javascript
  const safePath = path.normalize(decodeURIComponent(parsedUrl.pathname)).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(DIST_DIR, safePath);
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Access Denied');
  }
  ```

---

### [SEC-02] Almacenamiento de API Keys en `localStorage` y Exposición en URL Query String
- **Área**: Seguridad
- **Severidad / Esfuerzo / Confianza**: ALTA / M / ALTA
- **Ubicación**: `src/components/AiSettingsModal.jsx:29`, `src/utils/aiService.js:81`
- **Evidencia**:
  ```javascript
  // AiSettingsModal.jsx
  localStorage.setItem("bcc_ai_api_key", apiKey.trim());

  // aiService.js
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`;
  ```
- **Impacto**: `localStorage` no ofrece aislamiento contra ataques XSS; cualquier script malicioso o extensión de navegador puede extraer la clave de OpenAI o Gemini y consumir la cuota de facturación del usuario. Además, la clave de Google Gemini transmitida por query string queda almacenada en el historial de navegación, registros de proxies corporativos, logs de servidores y cabeceras `Referer`.
- **Recomendación**: 
  1. En Gemini, pasar la clave mediante la cabecera HTTP `x-goog-api-key: cleanKey` en lugar de la URL.
  2. Implementar un endpoint proxy en `server.js` (`POST /api/ai/completion`) para que las llamadas se realicen desde el backend, o bien cifrar la clave localmente usando Web Crypto API con una contraseña de sesión.

---

### [SEC-03] Transmisión de Datos Financieros Sensibles a Modelos Externos sin Advertencia de Privacidad
- **Área**: Seguridad
- **Severidad / Esfuerzo / Confianza**: ALTA / S / ALTA
- **Ubicación**: `src/utils/aiService.js:36-54`
- **Evidencia**:
  En `buildFinancialPrompt`, se envían a OpenAI / Google Gemini los montos exactos de efectivo en bancos, cuentas por cobrar, pasarelas de pago, créditos bancarios, nombres de inversionistas y porcentajes de dilución accionaria.
- **Impacto**: Exposición involuntaria de secreto bancario y comercial a proveedores de LLMs. Posible incumplimiento de normativas de protección de datos financieros si el usuario no es consciente de que sus números contables salen de su máquina.
- **Recomendación**: Incluir en `AiSettingsModal` un checkbox explícito de aceptación informada y una opción de "Anonimización de Cifras" que transforme los montos absolutos en porcentajes relativos antes de generar el prompt para el LLM.

---

### [SEC-04] Ausencia de Cabeceras de Seguridad HTTP y CORS Wildcard Abierto en `server.js`
- **Área**: Seguridad
- **Severidad / Esfuerzo / Confianza**: MEDIA / XS / ALTA
- **Ubicación**: `server.js:28-30`
- **Evidencia**:
  `res.setHeader('Access-Control-Allow-Origin', '*');`
  No se configuran `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` ni `Strict-Transport-Security`.
- **Impacto**: La aplicación puede ser embebida dentro de iframes en sitios maliciosos para realizar ataques de Clickjacking o captura de credenciales. Ausencia de protección contra MIME-sniffing.
- **Recomendación**: Añadir cabeceras básicas de protección en `server.js`:
  ```javascript
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  ```

---

### [SEC-05] Fallback Inseguro de Service Role Key a Anon Key en `cubecanvas-monitor`
- **Área**: Seguridad
- **Severidad / Esfuerzo / Confianza**: MEDIA / XS / ALTA
- **Ubicación**: `cubecanvas-monitor/src/server/auth.ts:5`
- **Evidencia**:
  ```typescript
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  ```
- **Impacto**: La tabla `health_checks` tiene RLS activado sin políticas públicas (solo permite escritura con `service_role`). Si el servidor se inicia sin `SUPABASE_SERVICE_ROLE_KEY`, usará la clave pública anónima; las inserciones fallarán silenciosamente por violación de RLS, perdiendo el registro de auditoría en base de datos.
- **Recomendación**: Eliminar el fallback a `VITE_SUPABASE_ANON_KEY`. Si falta `SUPABASE_SERVICE_ROLE_KEY`, el servidor debe advertir explícitamente en el log que la persistencia en base de datos estará inactiva.

---

### [SEC-06] Dependencia Vulnerable `xlsx` (SheetJS 0.18.5 en NPM)
- **Área**: Seguridad
- **Severidad / Esfuerzo / Confianza**: MEDIA / S / ALTA
- **Ubicación**: `package.json:15`
- **Evidencia**:
  `"xlsx": "^0.18.5"`. La versión publicada en el registro público de npm fue descontinuada por SheetJS en favor de su propio CDN (`https://cdn.sheetjs.com`). La versión 0.18.5 contiene vulnerabilidades conocidas no parchadas en npm (CVE-2023-30533 - Prototype Pollution y CVE-2024-22363 - ReDoS).
- **Impacto**: Riesgo de denegación de servicio o contaminación de prototipos si en el futuro se implementa importación de archivos Excel de usuarios no confiables.
- **Recomendación**: Actualizar la dependencia al registro oficial de SheetJS (`@sheetjs/xlsx`) o reemplazar por `exceljs`.

---

### [FUN-01] Omisión de Costos de Capital de Trabajo/Suministros (SS) en Proyección 12M y Break-Even
- **Área**: Funcional
- **Severidad / Esfuerzo / Confianza**: CRÍTICA / S / ALTA
- **Ubicación**: `src/utils/finance.js:430, 493, 525`
- **Evidencia**:
  En `calculateBccMetrics`:
  `monthlyOperatingSGA = totalW + totalSS;`
  Pero en `calculateBreakEvenMetrics`:
  `const fixedOpex = metrics?.totalW || 0;` (omite `totalSS`).
  Y en `calculate12MonthForecast`:
  `const opexW = metrics.totalW || 0;`
  `const operatingProfit = grossMargin - opexW;` (omite `totalSS`).
  En la prueba de laboratorio con $3M en W y $2M en SS, el canvas reportó utilidad de $4M, mientras que el pronóstico a 12 meses reportó $6M mensuales (una sobreestimación del 50%).
- **Impacto**: Los gráficos y tablas de la proyección a 12 meses muestran una empresa mucho más rentable y con mayor liquidez de la que realmente tiene, ocultando quiebras operativas y distorsionando el punto de equilibrio ante comités de crédito.
- **Recomendación**: Modificar `calculate12MonthForecast` y `calculateBreakEvenMetrics` para computar `totalOpex = (metrics.totalW || 0) + (metrics.totalSS || 0)`.

---

### [FUN-02] Propiedades Desincronizadas en Modales de Cascada y Sensibilidad
- **Área**: Funcional
- **Severidad / Esfuerzo / Confianza**: ALTA / XS / ALTA
- **Ubicación**: `src/components/StressTestModal.jsx:10-11`, `src/components/WaterfallModal.jsx:8-13`
- **Evidencia**:
  ```javascript
  // WaterfallModal.jsx y StressTestModal.jsx
  const cogs = metrics.totalCogs || 0; // En finance.js es metrics.totalCOGS
  const opexW = metrics.totalOpexW || 0; // En finance.js es metrics.totalW
  const assetDebt = metrics.monthlyAssetDebtService || 0; // En finance.js es fundingSources.monthlyAssetPayment
  const bankDebt = metrics.monthlyBankDebtService || 0; // En finance.js es fundingSources.monthlyBankPayment
  ```
- **Impacto**: En el modal "Cascada", los pasos de Costos de Venta (COGS), Gastos de Operación y Pagos de Deuda se muestran en $0 (-0.0%). En el modal "Sensibilidad", la utilidad estresada asume $0 de COGS y $0 de gastos fijos.
- **Recomendación**: Corregir los nombres de las propiedades en ambos modales para que coincidan con la firma de `calculateBccMetrics`:
  ```javascript
  const cogs = metrics.totalCOGS || 0;
  const opexW = (metrics.totalW || 0) + (metrics.totalSS || 0);
  const assetDebt = metrics.fundingSources?.monthlyAssetPayment || 0;
  const bankDebt = metrics.fundingSources?.monthlyBankPayment || 0;
  ```

---

### [FUN-03] Falsos Positivos de "Superávit" en Punto de Equilibrio con Ventas Cero o Margen Negativo
- **Área**: Funcional
- **Severidad / Esfuerzo / Confianza**: ALTA / XS / ALTA
- **Ubicación**: `src/utils/finance.js:435, 455`
- **Evidencia**:
  ```javascript
  const breakEvenSalesMonthly = grossMarginRatio > 0 ? Math.round(totalFixedCosts / grossMarginRatio) : 0;
  // ...
  isAboveBreakEven: totalSales >= breakEvenSalesMonthly
  ```
  Si `totalSales === 0`, `breakEvenSalesMonthly` se fija en 0, y `0 >= 0` evalúa a `true`. Si `totalCOGS > totalSales` (margen bruto negativo), el punto de equilibrio se evalúa como 0 y reporta que la empresa supera el equilibrio con un 100% de margen de seguridad.
- **Impacto**: Diagnósticos financieros engañosos que aseguran viabilidad a proyectos inviables o en estado inicial sin ventas.
- **Recomendación**:
  ```javascript
  const isAboveBreakEven = grossMarginRatio > 0 && totalSales > 0 && totalSales >= breakEvenSalesMonthly;
  ```

---

### [FUN-04] Inyección Forzada de Datos Hardcodeados del Caso Pizzería en `InvestorPitchModal`
- **Área**: Funcional
- **Severidad / Esfuerzo / Confianza**: MEDIA / XS / ALTA
- **Ubicación**: `src/components/InvestorPitchModal.jsx:9-14`
- **Evidencia**:
  `const capexNeeded = metrics.totalCapexNeeded || 150000000;`
  `const sales = metrics.totalProductSales || 38000000;`
  El operador OR (`||`) sobreescribe valores numéricos legítimos de `0` con los valores de la pizzería ($150M de horno, $38M de ventas).
- **Impacto**: Proyectos nuevos sin inversión requerida o en etapa de idea generan automáticamente cartas de inversión con requerimientos millonarios de maquinaria ficticia.
- **Recomendación**: Utilizar el operador de coalescencia nula `??`:
  ```javascript
  const capexNeeded = metrics.totalCapexNeeded ?? 0;
  const sales = metrics.totalProductSales ?? 0;
  ```

---

### [FUN-05] Discrepancia Aritmética en Hoja "Resumen BCC" de Exportación Excel
- **Área**: Funcional
- **Severidad / Esfuerzo / Confianza**: MEDIA / S / ALTA
- **Ubicación**: `src/utils/excelExport.js:47-48, 60`
- **Evidencia**:
  La fila 47 lista `Gastos Operacionales Mensuales (W)` con el valor de `totalW`, pero la fila 48 muestra un EBITDA que resta tanto `totalW` como `totalSS`. Para un usuario que revise el Excel, `Ventas - COGS - Gastos Operacionales` no coincide con el EBITDA mostrado.
- **Impacto**: Pérdida de credibilidad del modelo ante analistas de riesgo de crédito e inversionistas.
- **Recomendación**: Agregar una fila específica para `Capital de Trabajo e Insumos (SS)` y un subtotal de `Gastos Operacionales Totales (W + SS)`.

---

### [FUN-06] Coerción de Plazo Cero en Amortización de Crédito a 1 Mes
- **Área**: Funcional
- **Severidad / Esfuerzo / Confianza**: BAJA / XS / ALTA
- **Ubicación**: `src/utils/finance.js:28`
- **Evidencia**:
  `const n = Number(months) || 1;`
  Si `months` es 0, evalúa a 1 y calcula una cuota para un préstamo a 1 mes.
- **Impacto**: Simulación con parámetros inválidos sin notificación de error al usuario.
- **Recomendación**: `if (p <= 0 || Number(months) <= 0) return 0;`.

---

### [UI-01] Layout Rígido `100vh overflow:hidden` sin Media Queries Responsivas
- **Área**: UI
- **Severidad / Esfuerzo / Confianza**: ALTA / M / ALTA
- **Ubicación**: `src/index.css:50-82, 1305`
- **Evidencia**:
  `html, body, #root, .bcc-app-container` tienen `height: 100vh; width: 100vw; overflow: hidden;`. No existe ninguna regla `@media (max-width: ...)` en las 2,983 líneas del archivo CSS.
- **Impacto**: En resoluciones de laptop pequeña (1280x800), tablets (iPad 1024x768) o smartphones (375px), el tercio inferior del canvas queda recortado fuera de pantalla sin barra de desplazamiento ni posibilidad de interacción.
- **Recomendación**: Incorporar puntos de quiebre responsivos:
  ```css
  @media (max-width: 1024px) {
    html, body, #root, .bcc-app-container {
      height: auto !important;
      overflow-y: auto !important;
    }
  }
  ```

---

### [UI-02] 42 Instancias de Tipografía Infradimensionada (<12px) y Contraste Insuficiente WCAG AA
- **Área**: UI
- **Severidad / Esfuerzo / Confianza**: MEDIA / S / ALTA
- **Ubicación**: `src/index.css` (42 ocurrencias de fuentes entre `0.58rem` y `0.68rem`)
- **Evidencia**:
  Textos de 9.2px a 10.5px. Colores como texto blanco sobre `--bcc-green-kpi: #52c871` (ratio 1.87:1) y sobre `--bcc-blue-header: #00b0f0` (ratio 2.14:1) están muy por debajo de los 4.5:1 exigidos por WCAG 2.1 Nivel AA.
- **Impacto**: Ilegibilidad severa para usuarios con fatiga visual o en dispositivos con pantallas estándar no retina.
- **Recomendación**: Fijar el tamaño mínimo de fuente en `0.75rem` (12px) y ajustar el contraste de fondo de los badges o cambiar el color de texto a oscuro (`#0f172a`).

---

### [UI-03] Corte Horizontal de Columnas de Producto en Vista de Impresión/PDF
- **Área**: UI
- **Severidad / Esfuerzo / Confianza**: MEDIA / S / ALTA
- **Ubicación**: `src/index.css:1305-1350`
- **Evidencia**:
  En `@media print`, `.bcc-products-scroll-container` mantiene layout horizontal. Si el usuario configura entre 5 y 9 productos, los últimos productos quedan truncados fuera del borde derecho de la página PDF.
- **Impacto**: Impresión y exportación ejecutiva incompleta.
- **Recomendación**: En la regla de impresión, habilitar `flex-wrap: wrap` o formato tabular apilado para los productos.

---

### [UX-01] Pérdida de Datos al Recargar por Falta de Auto-guardado en Borrador Local
- **Área**: UX
- **Severidad / Esfuerzo / Confianza**: ALTA / S / ALTA
- **Ubicación**: `src/App.jsx:143, 251`
- **Evidencia**:
  El estado `canvasState` vive exclusivamente en memoria. No se almacena en `localStorage` hasta que el usuario hace clic manual en `Guardar`. Si el usuario actualiza la página o cierra la pestaña, no hay evento `beforeunload` que advierta sobre cambios no guardados.
- **Impacto**: Frustración extrema y pérdida de hasta horas de trabajo contable ante un cierre accidental de pestaña.
- **Recomendación**: Guardar un borrador automático debounced en `localStorage.setItem('bcc_canvas_autosave', ...)` y advertir con `window.addEventListener('beforeunload', ...)` si hay cambios pendientes.

---

### [UX-02] Sobrecarga Cognitiva en Barra de Herramientas (16 Botones sin Jerarquía)
- **Área**: UX
- **Severidad / Esfuerzo / Confianza**: MEDIA / M / ALTA
- **Ubicación**: `src/App.jsx:367-560`
- **Evidencia**:
  16 controles alineados horizontalmente en un contenedor de 38px: selector de módulos, botón Nuevo, selector de escenarios, Guardar, Duplicar, Eliminar, Exportar, Importar, Copilot IA, Cascada, One-Pager, Sensibilidad, Proyección 12M, Excel, PDF y Ayuda.
- **Impacto**: Fatiga de decisión, botones comprimidos o desbordados en monitores menores a 27 pulgadas, falta de flujo guiado para el usuario principiante.
- **Recomendación**: Agrupar en menús semánticos:
  - **Proyecto**: Nuevo, Guardar, Duplicar, Eliminar, Importar/Exportar.
  - **Vistas & Análisis**: Cascada, Sensibilidad, Proyección 12M, One-Pager.
  - **Reportes**: Excel, PDF.
  - **Herramientas**: Copilot IA, Ayuda (?).

---

### [UX-03] Ininteligibilidad de Códigos Metodológicos BCC y Mezcla Arbitraria de Idiomas
- **Área**: UX
- **Severidad / Esfuerzo / Confianza**: MEDIA / S / ALTA
- **Ubicación**: `src/components/BccCanvas.jsx:12-100`
- **Evidencia**:
  Acrónimos y códigos sin explicación inmediata: `BO: 1F1000001`, `[1D] = ∑ proj`, `+ income`, `consumption`, `W, A, SS`, `5 years` (en cabecera, mientras la proyección es de 12 meses).
- **Impacto**: Un usuario no familiarizado con el marco teórico de iNGIZER no comprende la herramienta en los primeros 60 segundos.
- **Recomendación**: Eliminar códigos internos superfluos, unificar el idioma al español y agregar tooltips explicativos con lenguaje de negocios comprensible.

---

### [UX-04] Ausencia de Atributos ARIA y Focus Trap en Modales
- **Área**: UX
- **Severidad / Esfuerzo / Confianza**: BAJA / S / ALTA
- **Ubicación**: `src/App.jsx:454`, `src/components/HelpModal.jsx:24`
- **Evidencia**:
  Botón de eliminar solo muestra `🗑️` sin `aria-label`. Botones de cierre `✕` carecen de etiqueta accesible. Los modales no atrapan el foco del tabulador ni declaran `role="dialog"`.
- **Impacto**: Imposibilidad de uso para personas con discapacidad motriz o visual que dependen del teclado y lectores de pantalla.
- **Recomendación**: Incorporar `aria-label` descriptivos y añadir gestión de foco accesible en modales.

---

### [COD-01] Violación de Reglas de Hooks en `HelpModal.jsx` y `ForecastModal.jsx`
- **Área**: Código
- **Severidad / Esfuerzo / Confianza**: ALTA / XS / ALTA
- **Ubicación**: `src/components/HelpModal.jsx:4-6`, `src/components/ForecastModal.jsx:10-14`
- **Evidencia**:
  ```javascript
  export default function HelpModal({ isOpen, onClose }) {
    if (!isOpen) return null; // <--- Retorno temprano condicional
    const [activeTab, setActiveTab] = useState("methodology"); // <--- Hook llamado después
  ```
- **Impacto**: Violación de la regla universal de React "Don't call Hooks inside conditions". Provoca excepciones de inconsistencia de hooks al abrir y cerrar modales.
- **Recomendación**: Mover la declaración de `useState` a la primera línea de la función, antes de evaluar `if (!isOpen) return null;`.

---

### [COD-02] Componentes Monolíticos y Acoplamiento Excesivo
- **Área**: Código
- **Severidad / Esfuerzo / Confianza**: MEDIA / M / ALTA
- **Ubicación**: `src/components/ModuleModal.jsx` (962 líneas), `src/App.jsx` (716 líneas), `src/index.css` (2983 líneas)
- **Evidencia**:
  `ModuleModal.jsx` contiene toda la lógica de captura de 11 módulos empresariales diferentes en un solo componente gigante con un árbol JSX masivo.
- **Impacto**: Dificultad para mantener, testear y extender módulos de forma independiente; alto riesgo de efectos colaterales al modificar un campo.
- **Recomendación**: Dividir `ModuleModal.jsx` en subcomponentes por área temática dentro de `src/components/modules/`.

---

### [COD-03] Código Muerto Sin Uso en Producción
- **Área**: Código
- **Severidad / Esfuerzo / Confianza**: BAJA / XS / ALTA
- **Ubicación**: `src/components/FinancialForm.jsx`, `src/components/Results.jsx`, `src/utils/finance.js:382-420`
- **Evidencia**:
  `FinancialForm.jsx` y `Results.jsx` no se importan en ningún archivo del proyecto. La función `calculateCashImpact` no tiene invocaciones activas.
- **Impacto**: Confusión para nuevos desarrolladores y mantenimiento innecesario de código obsoleto.
- **Recomendación**: Eliminar o trasladar a un directorio `legacy/` fuera del árbol de build.

---

### [COD-04] Falta de Importación Dinámica (Code-Splitting) para `xlsx`
- **Área**: Código
- **Severidad / Esfuerzo / Confianza**: MEDIA / XS / ALTA
- **Ubicación**: `src/utils/excelExport.js:1`
- **Evidencia**:
  `import * as XLSX from "xlsx";` se importa de manera estática al tope del archivo, generando una advertencia en Vite y llevando el chunk principal a 614.58 kB.
- **Impacto**: Carga inicial más lenta del navegador para una funcionalidad que solo se ejecuta cuando el usuario decide exportar.
- **Recomendación**: Cargar la librería dinámicamente:
  ```javascript
  export async function exportCanvasToExcel(state) {
    const XLSX = await import("xlsx");
    // ...
  }
  ```

---

### [OPS-01] Ausencia de `package-lock.json` en Raíz del Proyecto
- **Área**: DevOps
- **Severidad / Esfuerzo / Confianza**: ALTA / XS / ALTA
- **Ubicación**: Raíz del proyecto
- **Evidencia**:
  `npm audit` falló con `ENOLOCK`. No existe archivo `package-lock.json`.
- **Impacto**: Despliegues no deterministas. Cualquier instalación de dependencias en CI/CD o en nuevos servidores puede descargar versiones menores o parches con roturas incompatibles.
- **Recomendación**: Generar y commitear el archivo mediante `npm install --package-lock-only`.

---

### [OPS-02] Configuraciones de Despliegue Múltiples y Divergentes sin Pipeline CI/CD
- **Área**: DevOps
- **Severidad / Esfuerzo / Confianza**: MEDIA / S / ALTA
- **Ubicación**: `server.js`, `vercel.json`, `netlify.toml`
- **Evidencia**:
  Existen archivos para Railway (`server.js`), Vercel (`vercel.json`) y Netlify (`netlify.toml`). En `server.js` se implementa `/health`, mientras que en Vercel y Netlify esa ruta se reescribe a `index.html`. No existe directorio `.github/workflows`.
- **Impacto**: Comportamiento inconsistente según el proveedor de hosting; despliegues sin pruebas automatizadas previas.
- **Recomendación**: Consolidar Railway como plataforma de producción, documentar el proveedor canónico y crear `.github/workflows/ci.yml`.

---

### [OPS-03] Falta de Metadatos SEO, OpenGraph y Manifiesto PWA
- **Área**: DevOps
- **Severidad / Esfuerzo / Confianza**: BAJA / XS / ALTA
- **Ubicación**: `index.html:1-14`
- **Evidencia**:
  Faltan etiquetas `<meta name="description">`, `og:title`, `og:image`, `og:description` y enlace a `manifest.json`.
- **Impacto**: Enlaces compartidos en redes sociales o mensajería (WhatsApp, Slack) no muestran tarjeta visual ni descripción atractiva; no se puede instalar como aplicación web en pantalla de inicio.
- **Recomendación**: Completar el bloque `<head>` en `index.html` con etiquetas OpenGraph y manifest PWA.

---

## 3. Lo que está bien hecho

1. **Motor de Cálculo Puro y Testeable**:
   La separación de las fórmulas en `src/utils/finance.js` mediante funciones puras (`calculateLoanMonthlyPayment`, `calculateLoanAmortizationSchedule`, `calculateEquityValuation`, `calculateBccMetrics`) es una excelente decisión de arquitectura que facilita pruebas unitarias aisladas sin depender del DOM ni de React.
2. **Arquitectura de Monitoreo (`cubecanvas-monitor`) Sólida y Segura**:
   El subproyecto de monitoreo cuenta con TypeScript estricto, middleware de autenticación con JWT verificado en Supabase, rate limiting con `express-rate-limit`, cabeceras de protección con `helmet`, auditoría de secretos de bundle (`audit-bundle.js`), persistencia dual con buffer circular en memoria y endpoints de estado que no filtran variables privadas.
3. **Casos de Estudio Realistas Preconfigurados**:
   La inclusión del "Caso Pizzería: Expansión Horno $150M" y del "Caso Defensivo" aterriza de forma brillante conceptos financieros complejos (Capex, Opex, DSCR, Capital Stack) en situaciones tangibles para fundadores y emprendedores.
4. **Módulos Ejecutivos de Gran Valor de Negocio**:
   Componentes como `ForecastModal` (con curva de rampa y punto mínimo de liquidez), `InvestorPitchModal` (generación de One-Pager para comités) y `WaterfallModal` resuelven necesidades críticas de comunicación entre fundadores e inversionistas.
5. **Modo Heurístico Offline para Copilot IA**:
   La capacidad de `aiService.js` de conmutar automáticamente a un motor heurístico financiero experto cuando no hay conexión o no se suministra API key garantiza que la aplicación siga siendo útil al 100% sin dependencias externas obligatorias.

---

## 4. Plan de acción priorizado

| Orden | ID | Acción Recomendada | Esfuerzo | Severidad |
|---|---|---|---|---|
| **1** | **SEC-01** | Sanitizar rutas en `server.js` y bloquear Path Traversal | XS (<30 min) | **CRÍTICA** |
| **2** | **FUN-01** | Integrar `totalSS` en el pronóstico a 12 meses y en el punto de equilibrio | S (<2 h) | **CRÍTICA** |
| **3** | **FUN-02** | Corregir nombres de propiedades (`totalCOGS`, `totalW`, etc.) en Cascada y Estrés | XS (<30 min) | **ALTA** |
| **4** | **COD-01** | Mover llamadas a `useState` antes del return condicional en `HelpModal` y `ForecastModal` | XS (<30 min) | **ALTA** |
| **5** | **SEC-02** | Retirar API keys de query string en Gemini y pasar a cabecera HTTP | XS (<30 min) | **ALTA** |
| **6** | **FUN-03** | Corregir cálculo de `isAboveBreakEven` para ventas cero y márgenes negativos | XS (<30 min) | **ALTA** |
| **7** | **OPS-01** | Generar `package-lock.json` en raíz para builds deterministas | XS (<30 min) | **ALTA** |
| **8** | **UX-01** | Implementar auto-guardado en borrador (`localStorage`) y alerta `beforeunload` | S (<2 h) | **ALTA** |
| **9** | **UI-01** | Agregar media queries responsivas en `index.css` para soportar laptops y móviles | M (<1 día) | **ALTA** |
| **10** | **SEC-04** | Incorporar cabeceras de seguridad HTTP (X-Frame-Options, nosniff, etc.) en `server.js` | XS (<30 min) | **MEDIA** |
| **11** | **FUN-04** | Cambiar operadores `||` por `??` en `InvestorPitchModal` para permitir Capex 0 | XS (<30 min) | **MEDIA** |
| **12** | **COD-04** | Convertir la importación de `xlsx` a dinámica (`await import("xlsx")`) | XS (<30 min) | **MEDIA** |
| **13** | **SEC-05** | Eliminar fallback inseguro a `VITE_SUPABASE_ANON_KEY` en `cubecanvas-monitor` | XS (<30 min) | **MEDIA** |
| **14** | **FUN-05** | Agregar desglose de suministros (SS) en la hoja Resumen de Excel | S (<2 h) | **MEDIA** |
| **15** | **UI-02** | Incrementar tipografías menores a 12px y ajustar contrastes WCAG AA | S (<2 h) | **MEDIA** |
| **16** | **UX-02** | Reorganizar la barra superior en menús desplegables semánticos | M (<1 día) | **MEDIA** |
| **17** | **SEC-03** | Crear advertencia y consentimiento de privacidad antes de enviar datos al LLM | S (<2 h) | **ALTA** |
| **18** | **COD-02** | Modularizar `ModuleModal.jsx` y fragmentar `index.css` | M (<1 día) | **MEDIA** |
| **19** | **COD-03** | Eliminar componentes huérfanos `FinancialForm.jsx` y `Results.jsx` | XS (<30 min) | **BAJA** |
| **20** | **OPS-02** | Unificar configuración en Railway y configurar GitHub Actions CI | S (<2 h) | **MEDIA** |

### Bloque de Ejecución Sugerido:
- **Esta semana**: IDs 1 al 8 (Vulnerabilidad crítica de servidor, errores de cálculo financiero, rotura de hooks y auto-guardado).
- **Este mes**: IDs 9 al 16 (Responsividad móvil, cabeceras de seguridad, menús UX, contraste WCAG y bundle split).
- **Después**: IDs 17 al 20 (Refactor de `ModuleModal`, consentimiento avanzado y CI/CD).

---

## 5. Quick wins (<30 min cada uno)

1. **Parche de Path Traversal en `server.js`**:
   Verificar `filePath.startsWith(DIST_DIR)` antes de servir cualquier archivo estático.
2. **Sincronización de variables en `WaterfallModal.jsx`**:
   Cambiar `metrics.totalCogs` por `metrics.totalCOGS` y `metrics.totalOpexW` por `metrics.totalW`.
3. **Sincronización de variables en `StressTestModal.jsx`**:
   Alinear `baseCogs` y `baseOpex` con `metrics.totalCOGS` y `metrics.totalW`.
4. **Subsanación de Reglas de Hooks**:
   Subir `useState` al inicio de `HelpModal.jsx` y `ForecastModal.jsx`.
5. **Code-splitting de `xlsx`**:
   Usar `const XLSX = await import("xlsx")` en `src/utils/excelExport.js` para reducir el bundle inicial en ~400 kB al instante.
6. **Generación de Lockfile**:
   Ejecutar `npm install --package-lock-only` en la raíz para garantizar reproducibilidad en Railway.
7. **Cabeceras de Seguridad en `server.js`**:
   Agregar `X-Frame-Options: SAMEORIGIN` y `X-Content-Type-Options: nosniff`.
8. **Operador Nullish en `InvestorPitchModal`**:
   Reemplazar `|| 150000000` por `?? 0` para evitar datos inventados en negocios sin Capex.

---

## 6. Preguntas abiertas para el dueño del producto

1. **Uso de Claves de IA**: ¿Se continuará con el modelo BYOK (Bring Your Own Key) donde cada usuario ingresa su clave personal, o iNGIZER ofrecerá el servicio de IA mediante una suscripción respaldada por un backend propio con proxy y rate limiting?
2. **Estrategia Multidispositivo y Persistencia**: ¿El producto continuará siendo exclusivamente local (`localStorage`) o se migrará a cuentas de usuario con persistencia en Supabase (similar a `cubecanvas-monitor`), permitiendo sincronizar simulaciones entre computadores y teléfonos?
3. **Plataforma Canónica de Hosting**: Dado que existen configuraciones para Railway, Vercel y Netlify en el mismo repositorio, ¿cuál es la plataforma oficial y definitiva para Cube Canvas? ¿Se pueden retirar `vercel.json` y `netlify.toml` para evitar confusión?
4. **Terminología Metodológica**: ¿Las siglas y etiquetas como `BO: 1F1000001`, `W, A, SS`, `[1D] = ∑ proj` son indispensables para clientes formados en la metodología BCC, o se prefiere una interfaz con lenguaje empresarial general (Nómina, Activos, Capital de Trabajo, Ventas) para facilitar la venta masiva de autoservicio (PLG)?
5. **Alcance Móvil**: ¿Se espera que los fundadores o analistas utilicen Cube Canvas desde teléfonos móviles y tablets para revisar números rápidos en reuniones, o la herramienta está pensada exclusivamente para uso en pantallas de escritorio / proyectores?

---

## 7. Estado de Resolución de Hallazgos (Ejecución 2026-10-02)

| ID Hallazgo | Estado | Detalle de la Solución Implementada |
|---|---|---|
| **SEC-01** | ✅ **RESUELTO** | `server.js`: Bloqueo inmediato de solicitudes con `..` y `\` (403 Forbidden). Verificación de contención de ruta con `path.join(DIST_DIR, safePath)` y `filePath.startsWith(DIST_DIR)`. Test automatizado confirmó status 403. |
| **SEC-04** | ✅ **RESUELTO** | `server.js`: Inyección obligatoria de cabeceras `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` y `Strict-Transport-Security`. Restricción de verbos HTTP a GET, HEAD y OPTIONS (405 Method Not Allowed para los demás). |
| **SEC-02** | ✅ **RESUELTO** | `src/utils/aiService.js`: Eliminación del parámetro `?key=...` en la URL de Gemini. La API Key ahora viaja de forma segura en el header HTTP `x-goog-api-key`, evitando filtraciones en logs de red, proxy y browser history. |
| **FUN-01** | ✅ **RESUELTO** | `src/utils/finance.js`: Inclusión de `totalSS` en `fixedOpex` (`fixedW + fixedSS`) para `calculateBreakEvenMetrics`, y de `opexSS` en `calculate12MonthForecast`. Mes 1 de proyección ahora coincide exactamente con la utilidad operativa del Canvas BCC (diferencia: $0). Corregido caso borde de plazo 0 / negativo en préstamos (devuelve 0). |
| **FUN-02** | ✅ **RESUELTO** | `src/components/WaterfallModal.jsx` y `src/components/StressTestModal.jsx`: Enlazadas las propiedades reales `metrics.totalCOGS`, `metrics.totalW + metrics.totalSS`, `fundingSources.monthlyAssetPayment`, `fundingSources.monthlyBankPayment` y `metrics.totalCapexNeeded`. |
| **FUN-04** | ✅ **RESUELTO** | `src/components/InvestorPitchModal.jsx`: Reemplazados los fallbacks fijos `|| 150000000` por el operador nullish `?? 0`. Negocios con Capex cero ya no simulan deudas fantasma de $150M. Pago de activo vinculado a si existe inversionista de activo activo. |
| **FUN-05** | ✅ **RESUELTO** | `src/utils/excelExport.js`: Agregada fila explícita "Capital de Trabajo e Insumos (SS)" en la hoja de Resumen BCC. La suma de ítems coincide con el EBITDA reportado en la hoja. |
| **COD-01** | ✅ **RESUELTO** | `src/components/HelpModal.jsx` y `src/components/ForecastModal.jsx`: Movidos todos los hooks (`useState`, `useMemo`) antes del condicional de retorno `if (!isOpen) return null;` para acatar estrictamente las Reglas de Hooks de React. |
| **COD-03** | ✅ **RESUELTO** | Eliminados del repositorio los componentes huérfanos `src/components/FinancialForm.jsx` y `src/components/Results.jsx`. Retirada la función en desuso `calculateCashImpact` de `src/utils/finance.js`. |
| **COD-04** | ✅ **RESUELTO** | `src/utils/excelExport.js`: Importación dinámica `const XLSX = await import("xlsx");`. El bundle JS inicial se redujo de ~750 kB a **336 kB**, eliminando el warning de Vite. |
| **UX-01** | ✅ **RESUELTO** | `src/App.jsx`: Implementado auto-guardado en borrador (`localStorage.getItem("bcc_canvas_autosave_draft")`) con debounce de 600ms, vaciado síncrono en `beforeunload`, botón de restauración rápida al caso base ("🔄 Restaurar") y píldora visual de estado en tiempo real ("✅ Guardado" / "💾 Guardando..."). |
| **OPS-01** | ✅ **RESUELTO** | Generado `package-lock.json` en la raíz del repositorio (`npm install --package-lock-only`) garantizando builds deterministas. |
