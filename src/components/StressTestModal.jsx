import React, { useState, useMemo } from "react";
import { formatCurrency, calculateLoanMonthlyPayment, calculateEquityValuation } from "../utils/finance";

export default function StressTestModal({ isOpen, onClose, state, metrics }) {
  const [demandFactor, setDemandFactor] = useState(100); // 50% a 150%

  if (!isOpen) return null;

  const baseSales = metrics.totalProductSales || 0;
  const baseCogs = metrics.totalCogs || 0;
  const baseOpex = metrics.totalOpexW || 0;
  const debtService = metrics.totalMonthlyDebtService || 0;
  const capexNeeded = metrics.totalCapexNeeded || 150000000;

  // Cálculos bajo estrés de demanda
  const stressedSales = (baseSales * demandFactor) / 100;
  const stressedCogs = (baseCogs * demandFactor) / 100;
  const stressedOperatingProfit = stressedSales - stressedCogs - baseOpex;
  const stressedNetCash = stressedOperatingProfit - debtService;
  const stressedDscr = debtService > 0 ? (stressedOperatingProfit / debtService).toFixed(2) : 999;

  // Umbral de ruptura (Break-Even de Deuda)
  // ¿A qué porcentaje de demanda la utilidad operacional iguala exactamente la cuota de deuda?
  // stressedSales - stressedCogs - baseOpex = debtService
  // (baseSales - baseCogs) * (factor/100) = debtService + baseOpex
  const grossProfitBase = baseSales - baseCogs;
  const breakEvenDemandPercent =
    grossProfitBase > 0
      ? Math.max(0, Math.round(((debtService + baseOpex) / grossProfitBase) * 100))
      : 100;

  const maxDropTolerated = 100 - breakEvenDemandPercent;

  // -----------------------------------------------------------------
  // COMPARADOR RÁPIDO DE ALTERNATIVAS PARA FINANCIAR EL ACTIVO ($150M)
  // -----------------------------------------------------------------
  // Alternativa 1: Crédito Bancario 36 meses al 20% E.A.
  const altBankPayment = calculateLoanMonthlyPayment(capexNeeded, 20, 36);
  const altBankDscr = altBankPayment > 0 ? (metrics.operatingProfit / altBankPayment).toFixed(2) : 999;

  // Alternativa 2: Inversor de Activo 24 meses con 15% de retorno
  const altAssetPayment = (capexNeeded * 1.15) / 24;
  const altAssetDscr = altAssetPayment > 0 ? (metrics.operatingProfit / altAssetPayment).toFixed(2) : 999;

  // Alternativa 3: Inversor de Equity (20% de participación)
  const altEquityVal = calculateEquityValuation(capexNeeded, 20);

  return (
    <div className="modal-backdrop-simple no-print" onClick={onClose}>
      <div className="modal-dialog-box stress-test-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <div className="ai-modal-title-group">
            <span className="stress-badge">⚡ SIMULADOR DE ESTRÉS</span>
            <h3>Sensibilidad de Ventas & Comparador de Capital</h3>
          </div>
          <button type="button" className="close-drawer-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <p className="ai-modal-desc">
          Evalúa qué sucede con la capacidad de pago del negocio si la demanda fluctúa,
          y compara las opciones de financiación para el activo clave ({formatCurrency(capexNeeded)}).
        </p>

        {/* CONTROL DESLIZANTE DE SENSIBILIDAD */}
        <div className="stress-control-card">
          <div className="stress-slider-header">
            <label className="field-label">Escenario de Demanda / Ventas:</label>
            <span className={`stress-factor-tag ${demandFactor >= 100 ? "positive" : demandFactor >= breakEvenDemandPercent ? "neutral" : "negative"}`}>
              {demandFactor}% de lo proyectado {demandFactor === 100 ? "(Caso Base)" : demandFactor > 100 ? `(+${demandFactor - 100}%)` : `(${demandFactor - 100}%)`}
            </span>
          </div>

          <input
            type="range"
            min="40"
            max="160"
            step="5"
            value={demandFactor}
            onChange={(e) => setDemandFactor(Number(e.target.value))}
            className="stress-slider"
          />

          <div className="slider-markers">
            <span onClick={() => setDemandFactor(60)}>Crisis (-40%)</span>
            <span onClick={() => setDemandFactor(80)}>Bajo (-20%)</span>
            <span onClick={() => setDemandFactor(100)} style={{ fontWeight: 800 }}>Base (100%)</span>
            <span onClick={() => setDemandFactor(120)}>Optimista (+20%)</span>
            <span onClick={() => setDemandFactor(150)}>Exponencial (+50%)</span>
          </div>
        </div>

        {/* RESULTADOS EN TIEMPO REAL BAJO ESTRÉS */}
        <div className="stress-kpi-grid">
          <div className="stress-kpi-box">
            <span className="kpi-title">Ventas Simuladas</span>
            <span className="kpi-num">{formatCurrency(stressedSales)}</span>
            <span className="kpi-sub">Base: {formatCurrency(baseSales)}</span>
          </div>

          <div className="stress-kpi-box">
            <span className="kpi-title">Utilidad Operativa</span>
            <span className={`kpi-num ${stressedOperatingProfit > 0 ? "" : "danger"}`}>
              {formatCurrency(stressedOperatingProfit)}
            </span>
            <span className="kpi-sub">Base: {formatCurrency(metrics.operatingProfit)}</span>
          </div>

          <div className="stress-kpi-box">
            <span className="kpi-title">Cuota de Deuda (Fija)</span>
            <span className="kpi-num" style={{ color: "#d97706" }}>
              {formatCurrency(debtService)}
            </span>
            <span className="kpi-sub">Compromiso mensual</span>
          </div>

          <div className="stress-kpi-box">
            <span className="kpi-title">Caja Libre Restante</span>
            <span className={`kpi-num ${stressedNetCash >= 0 ? "success" : "danger"}`}>
              {formatCurrency(stressedNetCash)}
            </span>
            <span className="kpi-sub">DSCR: {stressedDscr}x</span>
          </div>
        </div>

        {/* ALERTA DE RESISTENCIA Y PUNTO DE EQUILIBRIO */}
        <div className={`stress-threshold-banner ${maxDropTolerated > 25 ? "safe" : maxDropTolerated > 0 ? "warning" : "danger"}`}>
          <div className="banner-icon">
            {maxDropTolerated > 25 ? "🛡️" : maxDropTolerated > 0 ? "⚠️" : "🚨"}
          </div>
          <div className="banner-text">
            <strong>Colchón de Seguridad Financiero:</strong>{" "}
            {maxDropTolerated > 0 ? (
              <>
                Tus ventas pueden caer hasta un <strong>{maxDropTolerated}%</strong> (hasta el nivel del {breakEvenDemandPercent}% de lo presupuestado) antes de que la utilidad sea insuficiente para cubrir las cuotas de deuda.
              </>
            ) : (
              <>
                <strong>¡Déficit crítico!</strong> La cuota de deuda actual supera la utilidad generada bajo este escenario. Se requeriría inyección de caja externa para no entrar en impago.
              </>
            )}
          </div>
        </div>

        {/* COMPARADOR DE CAPITAL STACK PARA EL ACTIVO */}
        <h4 className="stress-section-title">
          ⚖️ Comparador: 3 Formas de Financiar el Activo Clave ({formatCurrency(capexNeeded)})
        </h4>

        <div className="stack-options-grid">
          {/* OPCIÓN A: INVERSOR DE ACTIVO */}
          <div className="stack-option-card">
            <div className="card-header-tag asset">Opción A: Inversor de Activo [4B]</div>
            <div className="card-main-metric">{formatCurrency(altAssetPayment)}/mes</div>
            <ul className="card-features">
              <li>⏱️ Plazo: 24 meses</li>
              <li>📈 Retorno: 15% total pactado</li>
              <li>🛡️ Dilución: <strong>0% (100% tuyo)</strong></li>
              <li>📊 Cobertura actual: <strong>{altAssetDscr}x</strong></li>
            </ul>
            <div className="card-verdict">Ideal si quieres mantener todo el control accionario y pagar con el flujo de la nueva capacidad.</div>
          </div>

          {/* OPCIÓN B: CRÉDITO BANCARIO */}
          <div className="stack-option-card">
            <div className="card-header-tag bank">Opción B: Crédito Bancario [4C]</div>
            <div className="card-main-metric">{formatCurrency(altBankPayment)}/mes</div>
            <ul className="card-features">
              <li>⏱️ Plazo: 36 meses</li>
              <li>🏦 Tasa: 20% E.A. (Fórmula francesa)</li>
              <li>🛡️ Dilución: <strong>0% (100% tuyo)</strong></li>
              <li>📊 Cobertura actual: <strong>{altBankDscr}x</strong></li>
            </ul>
            <div className="card-verdict">Cuota más baja que alivia el flujo mensual, pero exige historial crediticio y garantías reales.</div>
          </div>

          {/* OPCIÓN C: INVERSOR DE EQUITY */}
          <div className="stack-option-card">
            <div className="card-header-tag equity">Opción C: Inversionista Equity [4A]</div>
            <div className="card-main-metric">$0 / mes (Sin deuda)</div>
            <ul className="card-features">
              <li>🤝 Dilución: <strong>20% de acciones</strong></li>
              <li>💎 Val. Post-Money: {formatCurrency(altEquityVal.postMoney)}</li>
              <li>💎 Val. Pre-Money: {formatCurrency(altEquityVal.preMoney)}</li>
              <li>🛡️ Presión de caja: <strong>Cero cuota fija</strong></li>
            </ul>
            <div className="card-verdict">Elimina el riesgo de quiebra por deuda fija, pero entregas utilidades futuras y gobierno corporativo de por vida.</div>
          </div>
        </div>

        {/* PIE DE ACCIONES */}
        <div className="modal-btn-row" style={{ marginTop: "1rem" }}>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar Simulador
          </button>
        </div>
      </div>
    </div>
  );
}
