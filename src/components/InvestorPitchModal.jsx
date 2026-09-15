import React, { useState } from "react";
import { formatCurrency, calculateEquityValuation } from "../utils/finance";

export default function InvestorPitchModal({ isOpen, onClose, state, metrics }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const capexNeeded = metrics.totalCapexNeeded || 150000000;
  const operatingProfit = metrics.operatingProfit || 15000000;
  const debtService = metrics.totalMonthlyDebtService || 7500000;
  const dscr = metrics.coverageRatio || 2.0;
  const sales = metrics.totalProductSales || 38000000;
  const netFreeCash = metrics.netFreeCashFlow || 8000000;

  const assetDebtTerm = state.fundingSources?.assetInvestorTermMonths || 24;
  const assetDebtReturn = state.fundingSources?.assetInvestorReturnPercent || 15;
  const assetMonthlyPayment = metrics.monthlyAssetDebtService || (capexNeeded * (1 + assetDebtReturn / 100)) / assetDebtTerm;

  const equityCapital = state.fundingSources?.equityInvestorCapital || capexNeeded;
  const equityPct = state.fundingSources?.equityOfferedPercent || 20;
  const equityVal = calculateEquityValuation(equityCapital, equityPct);

  // Texto para copiar a WhatsApp / Correo
  const pitchText = `🚀 PROPUESTA EJECUTIVA DE INVERSIÓN & FINANCIACIÓN
Empresa: ${state.name}
Propuesta de Valor: ${state.valueProposition}
Meta NSM: ${state.nsmMetricName || "Ventas"} (${state.nsmGoal})

💰 OPORTUNIDAD DE INVERSIÓN (CAPEX):
• Activo / Maquinaria a Financiar: ${formatCurrency(capexNeeded)}
• Utilidad Operacional Proyectada (EBITDA): ${formatCurrency(operatingProfit)} / mes
• Ventas Proyectadas: ${formatCurrency(sales)} / mes

📊 ESTRUCTURA DE PAGO AL INVERSIONISTA:
Opción 1: Financista de Activo / Deuda Privada
- Cuota Mensual Comprometida: ${formatCurrency(assetMonthlyPayment)} / mes
- Plazo de Retorno: ${assetDebtTerm} meses
- Retorno Total Pactado: ${assetDebtReturn}%
- Ratio de Cobertura de Deuda (DSCR): ${dscr}x (Utilidad cubre ${dscr} veces la cuota)
- Garantía: El activo queda en prenda o propiedad hasta liquidación.

Opción 2: Inversionista de Equity (Acciones)
- Ticket de Inversión: ${formatCurrency(equityCapital)}
- Participación Ofrecida: ${equityPct}%
- Valoración Post-Money Implícita: ${formatCurrency(equityVal.postMoney)}
- Flujo de Caja Libre Proyectado: ${formatCurrency(netFreeCash)} / mes

Generado con Cube Canvas (BCC) ® • iNGIZER Capital Stack Engine`;

  const handleCopy = () => {
    navigator.clipboard.writeText(pitchText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop-simple no-print" onClick={onClose}>
      <div className="modal-dialog-box pitch-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <div className="ai-modal-title-group">
            <span className="pitch-badge">🎯 ONE-PAGER INVERSOR</span>
            <h3>Ficha de Presentación para Inversionistas & Bancos</h3>
          </div>
          <button type="button" className="close-drawer-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <p className="ai-modal-desc">
          Documento ejecutivo listo para negociar con inversionistas de maquinaria, deuda privada o comités de crédito bancario.
        </p>

        {/* CONTENEDOR DEL ONE-PAGER IMPRIMIBLE */}
        <div className="pitch-paper-container">
          <div className="pitch-brand-bar">
            <div>
              <h2 className="pitch-company-name">{state.name}</h2>
              <p className="pitch-tagline">{state.valueProposition}</p>
            </div>
            <div className="pitch-badge-right">
              <span>MODELO BCC VERIFICADO</span>
              <strong>DSCR: {dscr}x</strong>
            </div>
          </div>

          {/* GRID DE MÉTRICAS CLAVE */}
          <div className="pitch-metrics-strip">
            <div className="pitch-metric-box">
              <span className="label">Activo Necesario (Capex)</span>
              <span className="val highlight">{formatCurrency(capexNeeded)}</span>
            </div>
            <div className="pitch-metric-box">
              <span className="label">Utilidad Operativa Proyectada</span>
              <span className="val green">{formatCurrency(operatingProfit)}/mes</span>
            </div>
            <div className="pitch-metric-box">
              <span className="label">Cobertura de Cuota (DSCR)</span>
              <span className="val blue">{dscr}x</span>
            </div>
            <div className="pitch-metric-box">
              <span className="label">Caja Libre Restante</span>
              <span className="val">{formatCurrency(netFreeCash)}/mes</span>
            </div>
          </div>

          {/* LAS DOS PROPUESTAS ESTRUCTURADAS */}
          <div className="pitch-offers-grid">
            {/* OFERTA 1: FINANCIACIÓN DE ACTIVO */}
            <div className="pitch-offer-card">
              <div className="offer-header">
                <span className="offer-type">Modalidad A: Inversionista de Activo / Deuda</span>
                <h4>Retorno Fijo Mensual Garantizado</h4>
              </div>
              <div className="offer-body">
                <p>
                  Financie la adquisición del activo estratégico con pago mensual de cuota fija directamente de la utilidad operacional generada:
                </p>
                <div className="offer-kpis">
                  <div className="offer-kpi">
                    <span>Cuota Mensual:</span>
                    <strong>{formatCurrency(assetMonthlyPayment)}</strong>
                  </div>
                  <div className="offer-kpi">
                    <span>Plazo de Pago:</span>
                    <strong>{assetDebtTerm} meses</strong>
                  </div>
                  <div className="offer-kpi">
                    <span>Rendimiento:</span>
                    <strong>{assetDebtReturn}% total</strong>
                  </div>
                  <div className="offer-kpi">
                    <span>Garantía:</span>
                    <strong>Reserva de Dominio</strong>
                  </div>
                </div>
                <div className="offer-guarantee-note">
                  🛡️ <strong>Seguridad:</strong> La utilidad mensual de {formatCurrency(operatingProfit)} cubre {dscr} veces la cuota requerida.
                </div>
              </div>
            </div>

            {/* OFERTA 2: EQUITY */}
            <div className="pitch-offer-card">
              <div className="offer-header equity-hdr">
                <span className="offer-type">Modalidad B: Inversor de Equity (Acciones)</span>
                <h4>Participación en el Crecimiento Exponencial</h4>
              </div>
              <div className="offer-body">
                <p>
                  Participe como socio accionista en la expansión de la empresa, compartiendo dividendos y valorización futura:
                </p>
                <div className="offer-kpis">
                  <div className="offer-kpi">
                    <span>Inversión Requerida:</span>
                    <strong>{formatCurrency(equityCapital)}</strong>
                  </div>
                  <div className="offer-kpi">
                    <span>Participación:</span>
                    <strong>{equityPct}%</strong>
                  </div>
                  <div className="offer-kpi">
                    <span>Val. Post-Money:</span>
                    <strong>{formatCurrency(equityVal.postMoney)}</strong>
                  </div>
                  <div className="offer-kpi">
                    <span>Val. Pre-Money:</span>
                    <strong>{formatCurrency(equityVal.preMoney)}</strong>
                  </div>
                </div>
                <div className="offer-guarantee-note">
                  💎 <strong>Potencial:</strong> Sin presión de cuota fija. Retorno vía dividendos y liquidez en rondas futuras.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BARRA DE ACCIONES */}
        <div className="modal-btn-row" style={{ marginTop: "1rem" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCopy}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            {copied ? "✅ ¡Copiado al portapapeles!" : "📋 Copiar Resumen para WhatsApp / Correo"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handlePrint}
            title="Imprimir ficha ejecutiva en papel o PDF"
          >
            🖨️ Imprimir One-Pager
          </button>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
