import React, { useState } from "react";

export default function HelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState("methodology");

  return (
    <div className="modal-backdrop no-print" onClick={onClose}>
      <div
        className="modal-content help-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "850px", width: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* CABECERA */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-badge-green">Manual & Metodología BCC</span>
            <h2>Guía Oficial Cube Canvas & Atajos de Teclado</h2>
            <p className="modal-subtitle">
              Aprende a interpretar el lienzo de viabilidad de crecimiento y capital stack de iNGIZER.
            </p>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* NAVEGACIÓN PESTAÑAS */}
        <div className="help-tabs-bar">
          <button
            type="button"
            className={`help-tab-btn ${activeTab === "methodology" ? "active" : ""}`}
            onClick={() => setActiveTab("methodology")}
          >
            🧭 Metodología BCC
          </button>
          <button
            type="button"
            className={`help-tab-btn ${activeTab === "glossary" ? "active" : ""}`}
            onClick={() => setActiveTab("glossary")}
          >
            📚 Glosario de Indicadores
          </button>
          <button
            type="button"
            className={`help-tab-btn ${activeTab === "shortcuts" ? "active" : ""}`}
            onClick={() => setActiveTab("shortcuts")}
          >
            ⌨️ Atajos de Teclado
          </button>
        </div>

        {/* CUERPO DEL MODAL */}
        <div className="modal-body help-modal-body" style={{ overflowY: "auto", padding: "18px 24px" }}>
          {/* TAB 1: METODOLOGÍA */}
          {activeTab === "methodology" && (
            <div className="help-section">
              <h3>¿Qué es el Business Cube Commands (BCC) Canvas?</h3>
              <p>
                El <strong>Cube Canvas</strong> es un modelo visual en una sola pantalla (100vh) diseñado para resolver la pregunta más crítica de cualquier negocio en expansión:
              </p>
              <div className="help-highlight-box">
                <em>"¿La utilidad operacional que generará mi nueva capacidad instalada (ej. un nuevo horno, máquina o local) es suficiente para pagar el financiamiento sin quebrar la caja actual?"</em>
              </div>

              <div className="help-grid-3cols">
                <div className="help-col-card green">
                  <h4>1. Bloque Verde: Growth Strategy</h4>
                  <p>
                    Ubicado en la parte superior. Modela la <strong>North Star Metric [1A]</strong>, la disponibilidad real de caja en bancos y pasarelas <strong>[1C]</strong>, la cartera por cobrar <strong>[1B]</strong> y la proyección de ventas por producto <strong>P1 a P9 [1D]</strong>.
                  </p>
                </div>

                <div className="help-col-card orange">
                  <h4>2. Puente Central: Capital Stack</h4>
                  <p>
                    Equilibra las fuentes de <strong>Bootstrapping [3A-3C]</strong> (aportes del fundador, horas de mentoría, equipo) contra las fuentes de <strong>Blitzscaling [4A-4C]</strong> (crédito bancario con amortización francesa, inversionista de activo o venta de acciones).
                  </p>
                </div>

                <div className="help-col-card blue">
                  <h4>3. Bloque Azul: Requerimientos [2C]</h4>
                  <p>
                    Desglosa las necesidades de inversión en las 5 áreas clave (Producción, Marketing, Soporte, Admin, Dev) bajo la tríada: <strong>W</strong> (Trabajo/Nómina), <strong>A</strong> (Activos Capex) y <strong>SS</strong> (Capital de Trabajo).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GLOSARIO */}
          {activeTab === "glossary" && (
            <div className="help-section">
              <h3>Glosario de Indicadores Clave</h3>
              <div className="glossary-list">
                <div className="glossary-item">
                  <strong>DSCR (Debt Service Coverage Ratio):</strong>
                  <p>
                    Ratio de Cobertura del Servicio de la Deuda = Utilidad Operativa / Cuotas Mensuales de Deuda.
                    <br />
                    • <strong>&gt; 1.25x (Verde):</strong> Cobertura holgada y saludable. Aprobación bancaria probable.
                    <br />
                    • <strong>1.0x - 1.25x (Amarillo):</strong> Cobertura ajustada; cualquier baja de ventas genera estrés.
                    <br />
                    • <strong>&lt; 1.0x (Rojo):</strong> Déficit operativo; la utilidad no alcanza para pagar las cuotas (asfixia).
                  </p>
                </div>

                <div className="glossary-item">
                  <strong>Valle de la Muerte (Lowest Cash):</strong>
                  <p>
                    El punto mínimo al que desciende el saldo de caja acumulado durante los meses de arranque (ramp-up) antes de que las ventas alcancen su ritmo de régimen.
                  </p>
                </div>

                <div className="glossary-item">
                  <strong>Runway & Burn Rate [2A]:</strong>
                  <p>
                    El <em>Burn Rate</em> es el total de gastos fijos y cuotas que la empresa quema mensualmente. El <em>Runway</em> indica cuántos meses de supervivencia tiene la empresa con su caja actual si no entra un solo peso de ingresos.
                  </p>
                </div>

                <div className="glossary-item">
                  <strong>Amortización Francesa [4C]:</strong>
                  <p>
                    Sistema estándar de cuota fija mensual donde los intereses decrecen en cada mes a medida que el capital adeudado disminuye.
                  </p>
                </div>

                <div className="glossary-item">
                  <strong>Valoración Pre-Money & Post-Money [4A]:</strong>
                  <p>
                    Si un inversionista aporta $50M a cambio del 20% de participación:
                    <br />
                    • Post-Money = $50M / 20% = <strong>$250M</strong>.
                    <br />
                    • Pre-Money = $250M - $50M = <strong>$200M</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ATAJOS DE TECLADO */}
          {activeTab === "shortcuts" && (
            <div className="help-section">
              <h3>Atajos de Teclado para Navegación Rápida</h3>
              <table className="shortcuts-table">
                <thead>
                  <tr>
                    <th>Acción</th>
                    <th>Atajo de Teclado</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Guardar Escenario</strong></td>
                    <td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>S</kbd></td>
                    <td>Abre el modal para guardar la simulación actual en el navegador.</td>
                  </tr>
                  <tr>
                    <td><strong>Descargar Excel (.xlsx)</strong></td>
                    <td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>E</kbd></td>
                    <td>Descarga instantánea del libro corporativo con 5 pestañas.</td>
                  </tr>
                  <tr>
                    <td><strong>Proyección 12 Meses</strong></td>
                    <td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>F</kbd></td>
                    <td>Abre el simulador de ramp-up y análisis de liquidez.</td>
                  </tr>
                  <tr>
                    <td><strong>Exportar JSON</strong></td>
                    <td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>J</kbd></td>
                    <td>Descarga el archivo JSON con todos los datos y fórmulas.</td>
                  </tr>
                  <tr>
                    <td><strong>Imprimir / Exportar PDF</strong></td>
                    <td><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>P</kbd></td>
                    <td>Genera la vista ejecutiva optimizada en una sola página.</td>
                  </tr>
                  <tr>
                    <td><strong>Cerrar Ventana</strong></td>
                    <td><kbd>Esc</kbd></td>
                    <td>Cierra cualquier modal o drawer que esté abierto.</td>
                  </tr>
                  <tr>
                    <td><strong>Abrir esta Guía</strong></td>
                    <td><kbd>?</kbd> o <kbd>F1</kbd></td>
                    <td>Muestra esta ayuda metodológica y tabla de atajos.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="modal-footer" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
