import React, { useState, useMemo } from "react";
import {
  formatCurrency,
  calculateBccMetrics,
  calculateBreakEvenMetrics,
  calculate12MonthForecast,
} from "../utils/finance";

export default function ForecastModal({ isOpen, onClose, state }) {
  if (!isOpen) return null;

  const [rampPreset, setRampPreset] = useState("gradual");
  const [postRampGrowth, setPostRampGrowth] = useState(0.01);
  const [deductCapexGap, setDeductCapexGap] = useState(false);

  // Métricas base y punto de equilibrio
  const metrics = useMemo(() => calculateBccMetrics(state), [state]);
  const breakEven = useMemo(() => calculateBreakEvenMetrics(metrics), [metrics]);

  // Cálculo de proyección a 12 meses
  const forecast = useMemo(() => {
    return calculate12MonthForecast(state, {
      rampPreset,
      postRampMonthlyGrowth: Number(postRampGrowth),
      deductCapexGapAtMonth0: deductCapexGap,
    });
  }, [state, rampPreset, postRampGrowth, deductCapexGap]);

  const { summary, months, initialCash } = forecast;

  // Escala para el gráfico de barras
  const maxNetFlow = useMemo(() => {
    const absValues = months.map((m) => Math.abs(m.netCashFlow));
    return Math.max(...absValues, 1000000);
  }, [months]);

  return (
    <div className="modal-backdrop no-print" onClick={onClose}>
      <div
        className="modal-content forecast-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "1100px", width: "95vw", maxHeight: "92vh", display: "flex", flexDirection: "column" }}
      >
        {/* CABECERA */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-badge-green">Proyección 12 Meses & Ramp-Up</span>
            <h2>Curva de Arranque, Valle de la Muerte & Punto de Equilibrio</h2>
            <p className="modal-subtitle">
              Simula la evolución de caja mes a mes durante la puesta en marcha de la nueva capacidad ({state.name || "Proyecto"}).
            </p>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* CONTENIDO SCROLLEABLE */}
        <div className="modal-body" style={{ overflowY: "auto", padding: "16px 24px" }}>
          {/* BARRA DE CONTROLES DE SIMULACIÓN */}
          <div className="forecast-controls-card">
            <div className="forecast-control-item">
              <label>Curva de Puesta en Marcha (Ramp-Up):</label>
              <select
                className="input-select"
                value={rampPreset}
                onChange={(e) => setRampPreset(e.target.value)}
              >
                <option value="gradual">🌱 Gradual (30% → 50% → 75% → 90% → 100%) - Típico Restaurante/Pyme</option>
                <option value="fast">⚡ Rápida (50% → 80% → 100%) - Demanda Insatisfecha</option>
                <option value="immediate">🎯 Inmediata (100% desde Mes 1) - Reemplazo de Equipo</option>
              </select>
            </div>

            <div className="forecast-control-item">
              <label>Crecimiento Orgánico Post-Rampa:</label>
              <select
                className="input-select"
                value={postRampGrowth}
                onChange={(e) => setPostRampGrowth(Number(e.target.value))}
              >
                <option value={0}>0% mensual (Estable a plena capacidad)</option>
                <option value={0.01}>+1% mensual (Crecimiento sostenido)</option>
                <option value={0.02}>+2% mensual (Expansión activa)</option>
                <option value={0.03}>+3% mensual (Alta tracción)</option>
              </select>
            </div>

            <div className="forecast-control-item checkbox-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={deductCapexGap}
                  onChange={(e) => setDeductCapexGap(e.target.checked)}
                />
                <span>Deducir Brecha Capex de Caja Inicial (si falta financiar)</span>
              </label>
            </div>
          </div>

          {/* TARJETAS RESUMEN DE LIQUIDEZ */}
          <div className="forecast-kpi-grid">
            {/* VALLE DE LA MUERTE */}
            <div className={`forecast-kpi-card ${summary.isCashDeficit ? "danger-border" : "safe-border"}`}>
              <div className="kpi-tag">{summary.isCashDeficit ? "🚨 ALERTA ASFIXIA" : "🛡️ VALLE DE LA MUERTE"}</div>
              <div className="kpi-value" style={{ color: summary.isCashDeficit ? "#dc2626" : "#059669" }}>
                {formatCurrency(summary.lowestCash)}
              </div>
              <div className="kpi-meta">
                Punto más bajo de liquidez: <strong>Mes {summary.lowestCashMonth || 1}</strong>
              </div>
              <div className="kpi-tip">
                {summary.isCashDeficit
                  ? `Requiere un colchón extra de ${formatCurrency(summary.cashDeficitAmount)} para no quebrar.`
                  : "Tu saldo de caja se mantiene positivo en todo momento."}
              </div>
            </div>

            {/* MES DE BREAK-EVEN OPERATIVO */}
            <div className="forecast-kpi-card">
              <div className="kpi-tag">⚖️ EQUILIBRIO OPERATIVO</div>
              <div className="kpi-value text-blue">
                Mes {summary.breakEvenMonth}
              </div>
              <div className="kpi-meta">
                Mes en que el flujo neto pasa a ser positivo (+).
              </div>
              <div className="kpi-tip">
                A partir de este mes, la operación genera caja neta mensual.
              </div>
            </div>

            {/* CAJA AL CIERRE DEL AÑO 1 */}
            <div className="forecast-kpi-card">
              <div className="kpi-tag">💰 CAJA FINAL AÑO 1</div>
              <div className="kpi-value" style={{ color: summary.endingYear1Cash >= 0 ? "#059669" : "#dc2626" }}>
                {formatCurrency(summary.endingYear1Cash)}
              </div>
              <div className="kpi-meta">
                Caja inicial: {formatCurrency(initialCash)}
              </div>
              <div className="kpi-tip">
                Generación neta anual: {formatCurrency(summary.totalYearNetCash)}
              </div>
            </div>

            {/* PUNTO DE EQUILIBRIO MENSUAL */}
            <div className="forecast-kpi-card">
              <div className="kpi-tag">🎯 BREAK-EVEN REQUERIDO</div>
              <div className="kpi-value">
                {formatCurrency(breakEven.breakEvenSalesMonthly)}/mes
              </div>
              <div className="kpi-meta">
                Ventas mínimas diarias: <strong>{formatCurrency(breakEven.breakEvenSalesDaily)}/día</strong>
              </div>
              <div className="kpi-tip">
                Margen de seguridad: <strong>{breakEven.marginOfSafetyPercent}%</strong> {breakEven.isAboveBreakEven ? "por encima" : "por debajo"}
              </div>
            </div>
          </div>

          {/* GRÁFICO VISUAL DE FLUJO NETO Y SALDO DE CAJA */}
          <div className="forecast-chart-card">
            <div className="chart-header">
              <h4>📊 Trayectoria Mensual: Flujo Neto Mensual vs. Saldo Acumulado</h4>
              <span className="chart-legend">
                <span className="legend-box green" /> Superávit mensual &nbsp;
                <span className="legend-box red" /> Déficit mensual &nbsp;
                <span className="legend-box blue" /> Saldo Acumulado
              </span>
            </div>

            <div className="forecast-bars-container">
              {months.map((m) => {
                const isPos = m.netCashFlow >= 0;
                const barHeight = Math.min(100, Math.round((Math.abs(m.netCashFlow) / maxNetFlow) * 80) + 10);
                const isLowest = m.month === summary.lowestCashMonth;

                return (
                  <div key={m.month} className={`forecast-bar-col ${isLowest ? "highlight-lowest" : ""}`}>
                    <div className="bar-tooltip-wrap">
                      <div className="bar-val-label" style={{ color: isPos ? "#059669" : "#dc2626" }}>
                        {isPos ? "+" : ""}{formatCurrency(m.netCashFlow)}
                      </div>
                      <div className="bar-container">
                        <div
                          className={`forecast-bar ${isPos ? "bar-positive" : "bar-negative"}`}
                          style={{ height: `${barHeight}px` }}
                        />
                      </div>
                      <div className="cash-indicator-dot" title={`Saldo al cierre: ${formatCurrency(m.endingCash)}`}>
                        <span className="cash-bubble">{formatCurrency(m.endingCash)}</span>
                      </div>
                    </div>
                    <div className="month-label">
                      <strong>M{m.month}</strong>
                      <span className="ramp-tag">{m.rampPercent}%</span>
                      {isLowest && <span className="lowest-badge">Min</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TABLA DETALLADA MES A MES */}
          <div className="forecast-table-card">
            <h4>📋 Detalle Mensual Consolidado (Año 1)</h4>
            <div className="table-responsive">
              <table className="forecast-full-table">
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th>% Cap.</th>
                    <th>Caja Inicial</th>
                    <th>Ventas</th>
                    <th>COGS</th>
                    <th>Margen Bruto</th>
                    <th>Nómina (W)</th>
                    <th>Cuota Deuda</th>
                    <th>Flujo Neto</th>
                    <th>Saldo Final</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) => (
                    <tr
                      key={m.month}
                      className={`${m.isNegativeCash ? "row-danger" : ""} ${
                        m.month === summary.lowestCashMonth ? "row-lowest" : ""
                      }`}
                    >
                      <td><strong>Mes {m.month}</strong></td>
                      <td><span className="badge-pct">{m.rampPercent}%</span></td>
                      <td>{formatCurrency(m.startingCash)}</td>
                      <td className="text-bold text-green">{formatCurrency(m.revenue)}</td>
                      <td>{formatCurrency(m.cogs)}</td>
                      <td>{formatCurrency(m.grossMargin)}</td>
                      <td>{formatCurrency(m.opexW)}</td>
                      <td className="text-orange">{formatCurrency(m.debtService)}</td>
                      <td className={m.netCashFlow >= 0 ? "text-green text-bold" : "text-red text-bold"}>
                        {m.netCashFlow >= 0 ? "+" : ""}{formatCurrency(m.netCashFlow)}
                      </td>
                      <td className={m.endingCash >= 0 ? "text-bold" : "text-red text-bold"}>
                        {formatCurrency(m.endingCash)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="tfoot-totals">
                    <td colSpan="3"><strong>TOTALES AÑO 1</strong></td>
                    <td className="text-green text-bold">{formatCurrency(summary.totalYearRevenue)}</td>
                    <td>{formatCurrency(summary.totalYearCogs)}</td>
                    <td>{formatCurrency(summary.totalYearGrossMargin)}</td>
                    <td>{formatCurrency(summary.totalYearOpex)}</td>
                    <td className="text-orange">{formatCurrency(summary.totalYearDebtService)}</td>
                    <td className={summary.totalYearNetCash >= 0 ? "text-green text-bold" : "text-red text-bold"}>
                      {summary.totalYearNetCash >= 0 ? "+" : ""}{formatCurrency(summary.totalYearNetCash)}
                    </td>
                    <td className="text-blue text-bold">{formatCurrency(summary.endingYear1Cash)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* PIE DEL MODAL */}
        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          <div className="footer-status-text">
            {summary.isCashDeficit ? (
              <span style={{ color: "#dc2626", fontWeight: "600" }}>
                ⚠️ Advertencia: En el Mes {summary.lowestCashMonth} la caja cae a {formatCurrency(summary.lowestCash)}. Considera negociar 2 meses de periodo de gracia en el crédito bancario o inversor.
              </span>
            ) : (
              <span style={{ color: "#059669", fontWeight: "500" }}>
                ✅ Viabilidad confirmada: El colchón de caja absorbe los meses de arranque sin caer en insolvencia.
              </span>
            )}
          </div>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar Proyección
          </button>
        </div>
      </div>
    </div>
  );
}
