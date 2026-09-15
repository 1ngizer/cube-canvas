import React from "react";
import { formatCurrency } from "../utils/finance";

export default function Results({ results }) {
  if (!results) return null;

  const {
    initialCash,
    debtPayment,
    salesMode,
    projectedSales,
    totalUnits,
    products,
    totalOperatingCosts,
    operatingCashFlow,
    finalCash,
    netCashDelta,
    breakEvenSales,
    operatingMarginPercent,
    status,
    statusTitle,
    statusDesc,
    statusIcon,
  } = results;

  const isDeltaPositive = netCashDelta >= 0;

  return (
    <div className="card results-card">
      {/* HEADER VISIBLE EN IMPRESIÓN */}
      <div className="print-header">
        <h2>Cube Canvas – Reporte de Proyección de Caja</h2>
        <p>Fecha de emisión: {new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {/* BANNER DE ESTADO Y SEMÁFORO */}
      <div className={`status-banner status-${status}`}>
        <div className="status-icon">{statusIcon}</div>
        <div className="status-text">
          <h4>{statusTitle}</h4>
          <p>{statusDesc}</p>
        </div>
      </div>

      {/* KPI PRINCIPAL */}
      <div className="main-kpi">
        <div className="main-kpi-label">Efectivo Final Proyectado</div>
        <div className="main-kpi-value">{formatCurrency(finalCash)}</div>
      </div>

      {/* MÉTRICAS SECUNDARIAS */}
      <div className="kpi-grid">
        <div className="kpi-box">
          <div className="kpi-box-label">Flujo Operativo (EBITDA preliminar)</div>
          <div
            className="kpi-box-value"
            style={{ color: operatingCashFlow >= 0 ? "#34d399" : "#f87171" }}
          >
            {formatCurrency(operatingCashFlow)}
          </div>
        </div>

        <div className="kpi-box">
          <div className="kpi-box-label">Variación Neta de Caja</div>
          <div
            className="kpi-box-value"
            style={{ color: isDeltaPositive ? "#34d399" : "#f87171" }}
          >
            {isDeltaPositive ? "+" : ""}
            {formatCurrency(netCashDelta)}
          </div>
        </div>

        <div className="kpi-box">
          <div className="kpi-box-label">Margen Operativo</div>
          <div className="kpi-box-value">{operatingMarginPercent}%</div>
        </div>

        <div className="kpi-box">
          <div className="kpi-box-label">Punto de Equilibrio Estimado</div>
          <div className="kpi-box-value" style={{ color: "#93c5fd" }}>
            {breakEvenSales > 0 ? formatCurrency(breakEvenSales) : "N/A"}
          </div>
        </div>

        {salesMode === "products" && (
          <div className="kpi-box">
            <div className="kpi-box-label">Volumen Total Proyectado</div>
            <div className="kpi-box-value">
              {totalUnits.toLocaleString("es-CO")} unidades ({products?.length || 0} ítems)
            </div>
          </div>
        )}

        <div className="kpi-box">
          <div className="kpi-box-label">Compromiso Total de Deuda</div>
          <div className="kpi-box-value" style={{ color: "#f87171" }}>
            {formatCurrency(debtPayment)}
          </div>
        </div>
      </div>

      {/* DESGLOSE DEL FLUJO */}
      <div className="flow-breakdown">
        <h4 style={{ fontSize: "0.9rem", color: "#9ca3af", marginBottom: "0.5rem" }}>
          Desglose del Movimiento de Fondos
        </h4>
        <div className="breakdown-row">
          <span>(+) Efectivo disponible inicial</span>
          <span>{formatCurrency(initialCash)}</span>
        </div>
        <div className="breakdown-row">
          <span>(+) Ventas proyectadas {salesMode === "products" ? "(desglosadas)" : ""}</span>
          <span style={{ color: "#34d399" }}>+{formatCurrency(projectedSales)}</span>
        </div>
        <div className="breakdown-row">
          <span>(-) Costos operativos (Fijos + Variables)</span>
          <span style={{ color: "#f87171" }}>-{formatCurrency(totalOperatingCosts)}</span>
        </div>
        <div className="breakdown-row">
          <span>(-) Amortización de deudas</span>
          <span style={{ color: "#f87171" }}>-{formatCurrency(debtPayment)}</span>
        </div>
        <div className="breakdown-row total">
          <span>(=) Efectivo Neto Disponible</span>
          <span style={{ color: finalCash >= 0 ? "#60a5fa" : "#ef4444" }}>
            {formatCurrency(finalCash)}
          </span>
        </div>
      </div>
    </div>
  );
}
