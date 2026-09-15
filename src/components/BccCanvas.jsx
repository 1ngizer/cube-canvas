import React from "react";
import { formatCurrency } from "../utils/finance";

export default function BccCanvas({ state, metrics, onOpenModule }) {
  const { products, areas, fundingSources, status, statusTitle, statusDesc, statusIcon } = metrics;

  return (
    <div className="bcc-canvas-wrapper">
      {/* CABECERA CORPORATIVA BCC */}
      <div className="bcc-header-row">
        <div className="bcc-title-group">
          <span className="bcc-brand">Cube Canvas powerApp (+IA+Strategy) ® V. 1.0</span>
          <span className="bcc-sub-id">BO: 1F1000001</span>
        </div>
        <div className="bcc-meta-group">
          <span className="bcc-horizon-badge">Cierre proyección: 5 years</span>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 1. BLOQUE SUPERIOR VERDE: GROWTH STRATEGY & INGRESOS */}
      {/* ================================================================= */}
      <div className="bcc-card bcc-green-card">
        <div className="bcc-card-header green-header">
          <div className="header-left">
            <span className="header-title">growth strategy</span>
            <button
              type="button"
              className="module-trigger-btn green-btn"
              onClick={() => onOpenModule("1A")}
              title="Abrir módulo de Estrategia y North Star Metric"
            >
              [1A] (NSM) North Star Metric - OKR Sales: <strong>{metrics.nsmGoal}</strong> ✏️
            </button>
          </div>
          <div className="header-right">
            <button
              type="button"
              className="module-trigger-btn green-btn-ghost"
              onClick={() => onOpenModule("1D")}
            >
              [1D] Gestionar Productos (P1..P9) ✏️
            </button>
          </div>
        </div>

        {/* GRILLA HORIZONTAL DE PRODUCTOS (P1..P9) */}
        <div className="bcc-products-scroll-container">
          <div className="bcc-products-grid">
            {products.map((p) => (
              <div key={p.id} className="bcc-product-column">
                <div className="product-badge-header">
                  <span className="p-code">{p.code}</span>
                  <span className="p-name" title={p.name}>{p.name}</span>
                </div>

                <div className="product-subtier-box tier-income">
                  <span className="tier-label">+ income</span>
                  <span className="tier-val">{formatCurrency(p.income)}</span>
                </div>

                <div className="product-subtier-box tier-engagement">
                  <span className="tier-label">consumption</span>
                  <span className="tier-sub">{p.consumption > 0 ? `${p.consumption} u` : "0"}</span>
                </div>

                <div className="product-subtier-box tier-growth">
                  <span className="tier-label">Growth / Exp</span>
                  <span className="tier-sub">{p.growth > 0 ? `+${p.growth}%` : "Estable"}</span>
                </div>

                <div className="product-subtotal-box">
                  <span className="subtotal-label">[1D] = ∑ proj</span>
                  <span className="subtotal-val">{formatCurrency(p.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TOTAL VENTAS & CAJA DISPONIBLE */}
        <div className="bcc-green-summary-bar">
          <div className="total-sales-badge">
            <span>TOTAL VENTAS PROYECTADAS [1D]:</span>
            <strong>{formatCurrency(metrics.totalProductSales)}</strong>
          </div>

          <div
            className="cash-receivables-group clickable"
            onClick={() => onOpenModule("1B")}
            title="Abrir módulo de Caja y Cartera"
          >
            <div className="cash-box">
              <span className="box-code">[1C] ∑ CASH AVAILABLE:</span>
              <strong className="box-val">{formatCurrency(metrics.totalCashAvailable)}</strong>
            </div>
            <span className="plus-sign">+</span>
            <div className="cash-box">
              <span className="box-code">[1B] ∑ RECEIVABLE:</span>
              <strong className="box-val">{formatCurrency(metrics.receivables)}</strong>
            </div>
            <span className="edit-hint">✏️</span>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 2. CINTURÓN CENTRAL: PUENTE ESTRATÉGICO, RUNWAY Y CAPITAL */}
      {/* ================================================================= */}
      <div className="bcc-card bcc-bridge-card">
        <div className="bridge-grid">
          {/* LADO IZQUIERDO: BOOTSTRAPPING */}
          <div className="bridge-side bootstrapping-side">
            <div className="side-title">
              <span>👈 BOOTSTRAPPING</span>
              <small>(Recursos Propios)</small>
            </div>
            <div className="sources-tags-row">
              <button
                type="button"
                className="source-tag"
                onClick={() => onOpenModule("3A")}
              >
                <strong>[3A] Master:</strong> {formatCurrency(fundingSources.masterEquity)}
              </button>
              <button
                type="button"
                className="source-tag"
                onClick={() => onOpenModule("3B")}
              >
                <strong>[3B] Volunteer:</strong> {formatCurrency(fundingSources.volunteerHoursValue)}
              </button>
              <button
                type="button"
                className="source-tag"
                onClick={() => onOpenModule("3C")}
              >
                <strong>[3C] Team:</strong> {formatCurrency(fundingSources.teamContributions)}
              </button>
            </div>
          </div>

          {/* CENTRO: BALANZA, RUNWAY & BURN RATE */}
          <div className="bridge-center">
            <div className={`status-pill status-${status}`}>
              <span className="status-ico">{statusIcon}</span>
              <span className="status-lbl">{statusTitle}</span>
            </div>

            <div className="center-kpi-row">
              <div className="kpi-block">
                <span className="kpi-title">Utilidad Operativa</span>
                <strong className="kpi-number" style={{ color: metrics.operatingProfit >= 0 ? "#10b981" : "#ef4444" }}>
                  {formatCurrency(metrics.operatingProfit)}/mes
                </strong>
              </div>

              <div className="kpi-divider">vs</div>

              <div className="kpi-block">
                <span className="kpi-title">Cuota Comprometida</span>
                <strong className="kpi-number" style={{ color: "#f87171" }}>
                  {formatCurrency(metrics.totalMonthlyDebtService)}/mes
                </strong>
              </div>

              <div className="kpi-divider">=</div>

              <div className="kpi-block">
                <span className="kpi-title">Caja Libre Mensual</span>
                <strong className="kpi-number" style={{ color: metrics.netFreeCashFlow >= 0 ? "#60a5fa" : "#ef4444" }}>
                  {formatCurrency(metrics.netFreeCashFlow)}/mes
                </strong>
              </div>
            </div>

            <div className="runway-metrics-strip">
              <span
                className="clickable-metric"
                onClick={() => onOpenModule("2A")}
                title="Abrir módulo [2A] de Runway & Quemado de Caja"
                style={{ cursor: "pointer" }}
              >
                [1A] BURN RATE ∑: <strong>{formatCurrency(metrics.monthlyBurnRate)}/mes</strong> ✏️
              </span>
              <span>•</span>
              <span
                className="clickable-metric"
                onClick={() => onOpenModule("2A")}
                title="Abrir módulo [2A] de Runway & Quemado de Caja"
                style={{ cursor: "pointer" }}
              >
                [2A] RUNWAY ∑: <strong style={{ color: "#0284c7" }}>{metrics.runwayMonths} meses</strong> ✏️
              </span>
              <span>•</span>
              <span>COBERTURA (DSCR): <strong style={{ color: metrics.coverageRatio >= 1.2 ? "#15803d" : "#b45309" }}>{metrics.coverageRatio}x</strong></span>
            </div>
          </div>

          {/* LADO DERECHO: BLITZSCALING */}
          <div className="bridge-side blitzscaling-side">
            <div className="side-title">
              <span>BLITZSCALING 👉</span>
              <small>(Apalancamiento Externo)</small>
            </div>
            <div className="sources-tags-row">
              <button
                type="button"
                className="source-tag"
                onClick={() => onOpenModule("4A")}
              >
                <strong>[4A] Sponsor/Equity:</strong> {formatCurrency(fundingSources.equityInvestorCapital)} ({fundingSources.equityOfferedPercent}%)
              </button>
              <button
                type="button"
                className="source-tag highlight-tag"
                onClick={() => onOpenModule("4B")}
              >
                <strong>[4B] Inversor Horno/Activo:</strong> {formatCurrency(fundingSources.assetInvestorCapital)}
              </button>
              <button
                type="button"
                className="source-tag"
                onClick={() => onOpenModule("4C")}
              >
                <strong>[4C] BANK:</strong> {formatCurrency(fundingSources.bankLoan)}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 3. BLOQUE INFERIOR AZUL: GROWTH REQUIREMENTS (W, A, SS) & COSTOS */}
      {/* ================================================================= */}
      <div className="bcc-card bcc-blue-card">
        <div className="bcc-card-header blue-header">
          <div className="header-left">
            <span className="header-title">growth requirements</span>
            <span className="header-badge">SG&A + CAPEX + COGS</span>
          </div>
          <div className="header-right">
            <button
              type="button"
              className="module-trigger-btn blue-btn"
              onClick={() => onOpenModule("2C")}
            >
              [2C] Editar Requerimientos (W, A, SS) ✏️
            </button>
          </div>
        </div>

        {/* TABLA DE ÁREAS OKR Y COLUMNAS W, A, SS */}
        <div className="bcc-table-wrapper">
          <table className="bcc-req-table">
            <thead>
              <tr>
                <th style={{ width: "32%" }}>Áreas / OKRs Operativos</th>
                <th style={{ width: "18%" }}>(W) Trabajo / Nómina</th>
                <th style={{ width: "22%" }} className="col-activos">(A) Activos / CAPEX (Horno, etc.)</th>
                <th style={{ width: "18%" }}>(SS) Capital de Trabajo</th>
                <th style={{ width: "10%" }}>Total Área</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((a) => (
                <tr key={a.key}>
                  <td className="area-title-cell">
                    <span className="okr-code">[2C]</span> {a.label}
                  </td>
                  <td className="num-cell">{formatCurrency(a.w)}</td>
                  <td className="num-cell highlight-cell">{formatCurrency(a.a)}</td>
                  <td className="num-cell">{formatCurrency(a.ss)}</td>
                  <td className="num-cell area-total-cell">{formatCurrency(a.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="totals-row">
                <td><strong>TOTAL REQUERIMIENTOS:</strong></td>
                <td><strong>{formatCurrency(metrics.totalW)}</strong></td>
                <td className="highlight-cell"><strong>{formatCurrency(metrics.totalCapexNeeded)}</strong> (CAPEX)</td>
                <td><strong>{formatCurrency(metrics.totalSS)}</strong></td>
                <td className="area-total-cell"><strong>{formatCurrency(metrics.totalSGA)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* RESUMEN DE COGS Y GASTOS OPERATIVOS */}
        <div className="bcc-blue-summary-bar">
          <div className="summary-item">
            <span>Total Nómina & Gastos Fijos (W):</span>
            <strong>{formatCurrency(metrics.totalW)}/mes</strong>
          </div>
          <div className="summary-item">
            <span>Total Costos Variables (COGS):</span>
            <strong>{formatCurrency(metrics.totalCOGS)}/mes</strong>
          </div>
          <div className="summary-item">
            <span>Inversión Única en Activos (A - Horno):</span>
            <strong style={{ color: "#38bdf8" }}>{formatCurrency(metrics.totalCapexNeeded)}</strong>
          </div>
          <div className="summary-item funding-state">
            <span>Estado Cobertura Inversión:</span>
            <strong style={{ color: fundingSources.fundingGap <= 0 ? "#10b981" : "#f59e0b" }}>
              {fundingSources.fundingGap <= 0
                ? "✅ 100% Financiado"
                : `⚠️ Falta levantar ${formatCurrency(fundingSources.fundingGap)}`}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
