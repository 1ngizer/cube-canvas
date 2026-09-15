import React from "react";
import { formatCurrency } from "../utils/finance";

export default function WaterfallModal({ isOpen, onClose, state, metrics }) {
  if (!isOpen) return null;

  const sales = metrics.totalProductSales || 0;
  const cogs = metrics.totalCogs || 0;
  const grossProfit = sales - cogs;
  const opexW = metrics.totalOpexW || 0;
  const operatingProfit = metrics.operatingProfit || 0;
  const assetDebt = metrics.monthlyAssetDebtService || 0;
  const bankDebt = metrics.monthlyBankDebtService || 0;
  const totalDebt = metrics.totalMonthlyDebtService || 0;
  const netFreeCash = metrics.netFreeCashFlow || 0;

  // Porcentajes sobre ventas
  const getPct = (val) => (sales > 0 ? ((val / sales) * 100).toFixed(1) : "0.0");

  const steps = [
    {
      title: "1. Ventas Proyectadas (P1..P9)",
      subtitle: "Ingresos brutos mensuales por capacidad instalada",
      amount: sales,
      type: "positive",
      badge: "100%",
      subitems: (state.products || []).filter((p) => p.income > 0).map((p) => ({
        label: p.name,
        val: p.income,
      })),
    },
    {
      title: "2. (-) Costos Directos de Ventas (COGS)",
      subtitle: "Materia prima, insumos directos y producción variable",
      amount: -cogs,
      type: "negative",
      badge: `-${getPct(cogs)}%`,
    },
    {
      title: "3. (=) Margen Bruto de Contribución",
      subtitle: "Fondos disponibles para cubrir costos fijos y crecimiento",
      amount: grossProfit,
      type: "subtotal",
      badge: `${getPct(grossProfit)}%`,
    },
    {
      title: "4. (-) Gastos Operacionales (Nómina & OPEX W)",
      subtitle: "Nómina fija de cocina, administración, marketing y ventas",
      amount: -opexW,
      type: "negative",
      badge: `-${getPct(opexW)}%`,
      subitems: [
        { label: "Producción & Cocina (W)", val: state.requirements?.production?.w || 0 },
        { label: "Marketing & Ventas (W)", val: state.requirements?.marketing?.w || 0 },
        { label: "Administración & Legal (W)", val: state.requirements?.administration?.w || 0 },
        { label: "Soporte (W)", val: state.requirements?.support?.w || 0 },
        { label: "Tecnología (W)", val: state.requirements?.development?.w || 0 },
      ].filter((x) => x.val > 0),
    },
    {
      title: "5. (=) Utilidad Operacional Proyectada (EBITDA)",
      subtitle: "La capacidad real del negocio para pagar deudas e inversionistas",
      amount: operatingProfit,
      type: operatingProfit >= 0 ? "highlight-green" : "highlight-red",
      badge: `${getPct(operatingProfit)}%`,
    },
    {
      title: "6. (-) Servicio de Deuda de Activo / Horno [4B]",
      subtitle: `Financiación privada del activo (${state.fundingSources?.assetInvestorTermMonths || 24} meses al ${state.fundingSources?.assetInvestorReturnPercent || 15}%)`,
      amount: -assetDebt,
      type: "debt",
      badge: `-${getPct(assetDebt)}%`,
    },
    {
      title: "7. (-) Servicio de Deuda Bancaria [4C]",
      subtitle: `Amortización crédito cuota fija (${state.fundingSources?.bankTermMonths || 36} meses al ${state.fundingSources?.bankRateEA || 20}% EA)`,
      amount: -bankDebt,
      type: "debt",
      badge: `-${getPct(bankDebt)}%`,
    },
    {
      title: "8. (=) Flujo de Caja Libre Neto Final",
      subtitle: "Excedente real de liquidez mensual para reinversión, reservas o dividendos",
      amount: netFreeCash,
      type: netFreeCash >= 0 ? "final-positive" : "final-negative",
      badge: `${getPct(netFreeCash)}%`,
    },
  ];

  return (
    <div className="modal-backdrop-simple no-print" onClick={onClose}>
      <div className="modal-dialog-box waterfall-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <div className="ai-modal-title-group">
            <span className="waterfall-badge">🌊 FLUJO DE CAJA CASCADA</span>
            <h3>Desglose de Ingresos, Utilidad y Servicio de Deuda</h3>
          </div>
          <button type="button" className="close-drawer-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <p className="ai-modal-desc">
          Visualiza exactamente cómo se distribuye cada peso de ventas y comprueba matemáticamente si
          la utilidad operacional de la nueva capacidad es suficiente para pagar el activo ({formatCurrency(metrics.totalCapexNeeded)}).
        </p>

        {/* INDICADOR RESUMEN DE COBERTURA */}
        <div className="waterfall-summary-pill-row">
          <div className="summary-mini-card">
            <span className="lbl">Utilidad Operacional</span>
            <span className="val green">{formatCurrency(operatingProfit)}/mes</span>
          </div>
          <div className="summary-op-icon">-</div>
          <div className="summary-mini-card">
            <span className="lbl">Cuotas Comprometidas</span>
            <span className="val orange">{formatCurrency(totalDebt)}/mes</span>
          </div>
          <div className="summary-op-icon">=</div>
          <div className="summary-mini-card">
            <span className="lbl">Caja Libre Restante</span>
            <span className={`val ${netFreeCash >= 0 ? "blue" : "red"}`}>
              {formatCurrency(netFreeCash)}/mes
            </span>
          </div>
          <div className="summary-mini-card dscr-card">
            <span className="lbl">Ratio Cobertura (DSCR)</span>
            <span className={`val ${metrics.coverageRatio >= 1.25 ? "green" : "red"}`}>
              {metrics.coverageRatio}x {metrics.coverageRatio >= 1.25 ? "✅" : "⚠️"}
            </span>
          </div>
        </div>

        {/* LISTA DE CASCADA INTERACTIVA */}
        <div className="waterfall-steps-container">
          {steps.map((step, idx) => (
            <div key={idx} className={`waterfall-step-row ${step.type}`}>
              <div className="step-left">
                <div className="step-title-line">
                  <span className="step-title">{step.title}</span>
                  <span className="step-badge">{step.badge}</span>
                </div>
                <div className="step-sub">{step.subtitle}</div>

                {step.subitems && step.subitems.length > 0 && (
                  <div className="step-subitems-list">
                    {step.subitems.map((sub, sIdx) => (
                      <div key={sIdx} className="subitem-row">
                        <span>• {sub.label}</span>
                        <strong>{formatCurrency(sub.val)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="step-right">
                <span className="step-amount">
                  {step.amount < 0 ? `-${formatCurrency(Math.abs(step.amount))}` : formatCurrency(step.amount)}
                </span>
                {sales > 0 && (
                  <div className="step-bar-wrap">
                    <div
                      className={`step-bar-fill ${step.type}`}
                      style={{
                        width: `${Math.min(100, Math.max(5, (Math.abs(step.amount) / sales) * 100))}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* NOTA DE CONCLUSIÓN ESTRATÉGICA */}
        <div className="waterfall-conclusion-card">
          <span className="conclusion-icon">💡</span>
          <p>
            {netFreeCash >= 0 ? (
              <>
                <strong>Capacidad de Pago Comprobada:</strong> Tras pagar los gastos operativos y la cuota del activo de{" "}
                <strong>{formatCurrency(totalDebt)}/mes</strong>, al negocio le queda un colchón mensual de{" "}
                <strong style={{ color: "#0284c7" }}>{formatCurrency(netFreeCash)}</strong>. Esto demuestra a cualquier banco o inversionista que la operación es viable y autosuficiente.
              </>
            ) : (
              <>
                <strong>Alerta de Déficit:</strong> Los compromisos de deuda exceden la utilidad en{" "}
                <strong style={{ color: "#dc2626" }}>{formatCurrency(Math.abs(netFreeCash))}/mes</strong>. Se sugiere renegociar un plazo más amplio (ej. 36 o 48 meses) o cambiar parte de la deuda por inversión de Equity [4A].
              </>
            )}
          </p>
        </div>

        {/* BOTONES DE PIE */}
        <div className="modal-btn-row" style={{ marginTop: "1rem" }}>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar Cascada
          </button>
        </div>
      </div>
    </div>
  );
}
