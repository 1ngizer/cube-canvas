import React, { useState } from "react";
import {
  formatCurrency,
  calculateLoanAmortizationSchedule,
  calculate12MonthForecast,
} from "../utils/finance";

export default function BankDossierModal({ isOpen, onClose, state, metrics }) {
  const [copied, setCopied] = useState(false);
  const [borrowerInfo, setBorrowerInfo] = useState({
    companyLegalName: state?.name || "Empresa Solicitante S.A.S.",
    taxId: "901.234.567-8",
    cityCountry: "Bogotá, Colombia",
    legalRepName: "Representante Legal",
    accountantName: "Contador Público Titulado - T.P. 123456-T",
    bankOfficer: "Oficial de Crédito Empresarial",
    collateralDescription: "Pignoración en primer grado sobre maquinaria / activos adquiridos con pignoración de flujos de caja y aval personal.",
  });

  if (!isOpen) return null;

  const currency = state?.currency || "COP";
  const taxRate = state?.taxRatePercent || 0;
  const capexNeeded = metrics?.totalCapexNeeded ?? 0;
  const investmentNeeded = metrics?.totalInvestmentNeeded ?? 0;
  const operatingProfit = metrics?.operatingProfit ?? 0;
  const monthlyTax = metrics?.monthlyTaxProvision ?? 0;
  const netProfitAfterTax = metrics?.netProfitAfterTax ?? operatingProfit;
  const debtService = metrics?.totalMonthlyDebtService ?? 0;
  const dscr = metrics?.coverageRatio ?? 0;
  const dscrPostTax = metrics?.coverageRatioPostTax ?? dscr;
  const sales = metrics?.totalProductSales ?? 0;
  const netFreeCash = metrics?.netFreeCashFlow ?? 0;
  const cashAvailable = metrics?.totalCashAvailable ?? 0;

  // Parámetros de crédito
  const loanPrincipal =
    Number(state?.fundingSources?.bankLoan) > 0
      ? Number(state.fundingSources.bankLoan)
      : capexNeeded > 0
      ? capexNeeded
      : investmentNeeded;

  const rateEA = Number(state?.fundingSources?.bankRateEA) || 20;
  const termMonths = Number(state?.fundingSources?.bankTermMonths) || 36;
  const graceMonths = Number(state?.fundingSources?.bankGraceMonths) || 0;

  // Tabla de amortización con gracia (primeros 12 meses)
  const amortizationSchedule = calculateLoanAmortizationSchedule(
    loanPrincipal,
    rateEA,
    termMonths,
    12,
    graceMonths
  );

  // Proyección a 12 meses
  const forecast = calculate12MonthForecast(state);

  const handleCopySummary = () => {
    const text = `📑 DOSSIER BANCARIO & SOLICITUD DE CRÉDITO
Solicitante: ${borrowerInfo.companyLegalName} (NIT: ${borrowerInfo.taxId})
Monto Solicitado: ${formatCurrency(loanPrincipal, currency)}
Plazo: ${termMonths} meses (${graceMonths} meses de gracia a capital) | Tasa: ${rateEA}% E.A.
Destino: Adquisición de Activos de Capital (CAPEX) & Expansión de Capacidad

INDICADORES FINANCIEROS Y CAPACIDAD DE PAGO:
• Ventas Proyectadas Mensuales: ${formatCurrency(sales, currency)}
• EBITDA / Utilidad Operativa: ${formatCurrency(operatingProfit, currency)}
• Provisión Impuestos (${taxRate}%): ${formatCurrency(monthlyTax, currency)}
• Utilidad Neta Post-Impuestos: ${formatCurrency(netProfitAfterTax, currency)}
• Servicio Mensual de la Deuda: ${formatCurrency(debtService, currency)}
• Cobertura de Deuda (DSCR Pre-Tax): ${dscr}x
• Cobertura de Deuda (DSCR Post-Tax): ${dscrPostTax}x
• Flujo de Caja Libre Post-Deuda: ${formatCurrency(netFreeCash, currency)}

Garantía: ${borrowerInfo.collateralDescription}
Generado por Cube Canvas (BCC) ® • iNGIZER Capital Stack`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  // Calificación del riesgo crediticio
  let riskBadgeColor = "#10b981";
  let riskGrade = "A1 - EXCELENTE";
  let riskVerdict = "Capacidad de pago holgada. Riesgo de impago mínimo.";

  if (dscrPostTax < 1.0 || operatingProfit <= 0) {
    riskBadgeColor = "#ef4444";
    riskGrade = "C3 - CRÍTICO / ALTO RIESGO";
    riskVerdict = "Flujo de caja insuficiente para servir la deuda. Requiere reestructuración o mayores aportes de equity.";
  } else if (dscrPostTax < 1.25) {
    riskBadgeColor = "#f59e0b";
    riskGrade = "B2 - MODERADO / AJUSTADO";
    riskVerdict = "Capacidad de pago viable con margen estrecho. Se recomienda exigir aval colateral reforzado.";
  }

  return (
    <div className="modal-backdrop-simple bank-dossier-modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog-box bank-dossier-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* BARRA SUPERIOR ACCIONES */}
        <div className="bank-dossier-header-bar no-print">
          <div className="bank-dossier-title-group">
            <span className="bank-pill">🏦 COMITÉ DE RIESGOS & CRÉDITO</span>
            <h3>Dossier de Crédito Bancario y Financiación Estructurada</h3>
          </div>
          <div className="bank-dossier-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCopySummary}
              title="Copiar resumen ejecutivo al portapapeles"
            >
              {copied ? "✅ Copiado" : "📋 Copiar Resumen"}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handlePrint}
              title="Imprimir informe oficial o guardar en PDF"
            >
              🖨️ Imprimir / Guardar PDF
            </button>
            <button
              type="button"
              className="close-drawer-btn"
              onClick={onClose}
              title="Cerrar modal (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* CONTENEDOR DOCUMENTO OFICIAL BANCARIO (IMPRIMIBLE) */}
        <div className="bank-dossier-paper" id="bank-dossier-document">
          {/* ENCABEZADO FORMAL */}
          <div className="dossier-top-sheet">
            <div className="dossier-letterhead">
              <div className="dossier-logo-box">
                <span className="dossier-logo-cube">⬛</span>
                <div>
                  <h1 className="dossier-main-title">EXPEDIENTE DE CRÉDITO EMPRESARIAL</h1>
                  <p className="dossier-subtitle">
                    BUSINESS CUBE COMMANDS (BCC) • INFORME TÉCNICO DE CAPACIDAD DE PAGO
                  </p>
                </div>
              </div>
              <div className="dossier-serial-box">
                <div className="serial-item">
                  <span className="s-label">FECHA DE CORTE:</span>
                  <span className="s-val">{new Date().toLocaleDateString("es-CO", { dateStyle: "long" })}</span>
                </div>
                <div className="serial-item">
                  <span className="s-label">CALIFICACIÓN PRELIMINAR:</span>
                  <span className="s-val" style={{ color: riskBadgeColor, fontWeight: 700 }}>
                    {riskGrade}
                  </span>
                </div>
                <div className="serial-item">
                  <span className="s-label">MONEDA:</span>
                  <span className="s-val">{currency}</span>
                </div>
              </div>
            </div>

            <div className="dossier-memo-grid">
              <div className="memo-cell">
                <span className="m-label">A:</span>
                <span className="m-val">Comité de Crédito / Gerencia de Riesgo Empresarial</span>
              </div>
              <div className="memo-cell">
                <span className="m-label">DE:</span>
                <span className="m-val">{borrowerInfo.companyLegalName}</span>
              </div>
              <div className="memo-cell">
                <span className="m-label">NIT / REGISTRO:</span>
                <span className="m-val">{borrowerInfo.taxId}</span>
              </div>
              <div className="memo-cell">
                <span className="m-label">UBICACIÓN:</span>
                <span className="m-val">{borrowerInfo.cityCountry}</span>
              </div>
              <div className="memo-cell full-width">
                <span className="m-label">OBJETO DE LA OPERACIÓN:</span>
                <span className="m-val">
                  Financiación estructurada para adquisición de activos fijos productivos (CAPEX) y capital de trabajo con fuente de repago proveniente del flujo de caja operacional del negocio.
                </span>
              </div>
            </div>
          </div>

          {/* RESUMEN EJECUTIVO TARJETAS */}
          <div className="dossier-section">
            <h2 className="dossier-section-title">1. TÉRMINOS Y CONDICIONES DE LA FACILIDAD PROPUESTA</h2>
            <div className="dossier-cards-grid">
              <div className="d-card highlight-card">
                <span className="d-card-label">MONTO SOLICITADO</span>
                <strong className="d-card-val primary">{formatCurrency(loanPrincipal, currency)}</strong>
                <span className="d-card-sub">Capital Principal</span>
              </div>
              <div className="d-card">
                <span className="d-card-label">PLAZO TOTAL</span>
                <strong className="d-card-val">{termMonths} Meses</strong>
                <span className="d-card-sub">({(termMonths / 12).toFixed(1)} Años)</span>
              </div>
              <div className="d-card">
                <span className="d-card-label">PERÍODO DE GRACIA</span>
                <strong className="d-card-val">{graceMonths} Meses</strong>
                <span className="d-card-sub">Solo intereses a capital</span>
              </div>
              <div className="d-card">
                <span className="d-card-label">TASA PROPUESTA</span>
                <strong className="d-card-val">{rateEA}% E.A.</strong>
                <span className="d-card-sub">Tasa Efectiva Anual</span>
              </div>
              <div className="d-card highlight-card">
                <span className="d-card-label">CUOTA MENSUAL REGULAR</span>
                <strong className="d-card-val primary">
                  {formatCurrency(metrics?.fundingSources?.monthlyBankPayment || 0, currency)}
                </strong>
                <span className="d-card-sub">Capital + Interés fijo</span>
              </div>
            </div>
          </div>

          {/* MATRIZ DE CAPACIDAD DE PAGO Y RIESGO */}
          <div className="dossier-section">
            <h2 className="dossier-section-title">2. INDICADORES DE SOLVENCIA Y COBERTURA DE DEUDA (DSCR)</h2>
            <div className="dossier-table-wrap">
              <table className="dossier-table">
                <thead>
                  <tr>
                    <th>Indicador Financiero</th>
                    <th>Valor Mensual</th>
                    <th>% sobre Ventas</th>
                    <th>Criterio Técnico / Estándar Bancario</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Ingresos Operacionales Proyectados (Ventas)</strong></td>
                    <td><strong>{formatCurrency(sales, currency)}</strong></td>
                    <td>100.0%</td>
                    <td>Capacidad instalada con el activo financiado</td>
                  </tr>
                  <tr>
                    <td>(-) Costos Variables de Venta (COGS)</td>
                    <td>{formatCurrency(metrics?.totalCOGS || 0, currency)}</td>
                    <td>{sales > 0 ? ((metrics?.totalCOGS / sales) * 100).toFixed(1) : 0}%</td>
                    <td>Insumos directos de producción</td>
                  </tr>
                  <tr>
                    <td>(-) Gastos Operativos de Nómina y Soporte (W + SS)</td>
                    <td>{formatCurrency(metrics?.monthlyOperatingSGA || 0, currency)}</td>
                    <td>{sales > 0 ? ((metrics?.monthlyOperatingSGA / sales) * 100).toFixed(1) : 0}%</td>
                    <td>Personal, administración y suministros</td>
                  </tr>
                  <tr className="row-subtotal">
                    <td><strong>(=) EBITDA / Utilidad Operacional Bruta</strong></td>
                    <td><strong>{formatCurrency(operatingProfit, currency)}</strong></td>
                    <td><strong>{metrics?.operatingMarginPercent || 0}%</strong></td>
                    <td>Flujo bruto generado por la operación</td>
                  </tr>
                  <tr>
                    <td>(-) Provisión Impuesto sobre la Renta ({taxRate}%)</td>
                    <td>{formatCurrency(monthlyTax, currency)}</td>
                    <td>{sales > 0 ? ((monthlyTax / sales) * 100).toFixed(1) : 0}%</td>
                    <td>Obligación tributaria estimada corporativa</td>
                  </tr>
                  <tr className="row-subtotal highlight-green">
                    <td><strong>(=) Utilidad Operacional Post-Impuestos</strong></td>
                    <td><strong>{formatCurrency(netProfitAfterTax, currency)}</strong></td>
                    <td>{sales > 0 ? ((netProfitAfterTax / sales) * 100).toFixed(1) : 0}%</td>
                    <td>Flujo neto real disponible para la deuda</td>
                  </tr>
                  <tr className="row-debt">
                    <td><strong>(-) Servicio Mensual de la Deuda Total</strong></td>
                    <td><strong>{formatCurrency(debtService, currency)}</strong></td>
                    <td>{sales > 0 ? ((debtService / sales) * 100).toFixed(1) : 0}%</td>
                    <td>Cuotas fijas de amortización exigibles</td>
                  </tr>
                  <tr className="row-total">
                    <td><strong>(=) Flujo de Caja Libre Disponible</strong></td>
                    <td><strong>{formatCurrency(netFreeCash, currency)}</strong></td>
                    <td>{sales > 0 ? ((netFreeCash / sales) * 100).toFixed(1) : 0}%</td>
                    <td>Superávit mensual de caja después de obligaciones</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* RADAR DE COBERTURA */}
            <div className="dossier-risk-summary-box" style={{ borderColor: riskBadgeColor }}>
              <div className="risk-metric-tag">
                <span className="r-label">RATIO DSCR POST-TAX:</span>
                <span className="r-value" style={{ color: riskBadgeColor }}>
                  {dscrPostTax}x
                </span>
                <span className="r-target">(Exigido por Banca: &gt; 1.25x)</span>
              </div>
              <div className="risk-metric-text">
                <strong>Diagnóstico de Riesgo: </strong>
                {riskVerdict}
              </div>
            </div>
          </div>

          {/* DESTINO DEL CAPITAL Y GARANTÍAS */}
          <div className="dossier-section page-break">
            <h2 className="dossier-section-title">3. DESTINACIÓN DE FONDOS Y ESTRUCTURA DE GARANTÍAS</h2>
            <div className="dossier-two-col">
              <div className="dossier-box">
                <h3 className="box-title">Distribución de la Inversión (CAPEX vs Capital de Trabajo)</h3>
                <ul className="dossier-list">
                  <li>
                    <strong>Activos de Capital (CAPEX - Bloque A): </strong>
                    <span>{formatCurrency(capexNeeded, currency)}</span>
                    <p className="sub-desc">Maquinaria, hornos, equipos de producción o tecnología esencial.</p>
                  </li>
                  <li>
                    <strong>Capital de Trabajo Inicial (Bloque SS): </strong>
                    <span>{formatCurrency(metrics?.totalSS || 0, currency)}</span>
                    <p className="sub-desc">Inventarios iniciales y colchón de liquidez operativa.</p>
                  </li>
                  <li>
                    <strong>Caja Disponible Actual del Solicitante: </strong>
                    <span>{formatCurrency(cashAvailable, currency)}</span>
                    <p className="sub-desc">Saldos bancarios verificados para arranque.</p>
                  </li>
                </ul>
              </div>

              <div className="dossier-box">
                <h3 className="box-title">Garantías y Mitigantes de Riesgo</h3>
                <div className="form-group mb-2">
                  <label className="text-xs font-bold text-gray-700">DESCRIPCIÓN DE GARANTÍAS PROPUESTAS:</label>
                  <textarea
                    className="dossier-input-area"
                    rows={3}
                    value={borrowerInfo.collateralDescription}
                    onChange={(e) =>
                      setBorrowerInfo({ ...borrowerInfo, collateralDescription: e.target.value })
                    }
                  />
                </div>
                <div className="guarantee-bullets">
                  <div className="g-bullet">✔️ <strong>Prenda Comercial:</strong> Registro ante Garantías Mobiliarias sobre activo adquirido.</div>
                  <div className="g-bullet">✔️ <strong>Pignoración de Flujos:</strong> Instrucción irrevocable a cuentas recaudadoras.</div>
                  <div className="g-bullet">✔️ <strong>Póliza Todo Riesgo:</strong> Endoso a favor del acreedor sobre la maquinaria.</div>
                </div>
              </div>
            </div>
          </div>

          {/* TABLA DE AMORTIZACIÓN (PRIMEROS 12 MESES) */}
          <div className="dossier-section">
            <h2 className="dossier-section-title">
              4. TABLA DE AMORTIZACIÓN FRANCESA CON GRACIA (AÑO 1)
            </h2>
            <div className="dossier-table-wrap">
              <table className="dossier-table tight-table">
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th>Régimen</th>
                    <th>Saldo Inicial</th>
                    <th>Cuota Total</th>
                    <th>Intereses</th>
                    <th>Abono Capital</th>
                    <th>Saldo Final</th>
                  </tr>
                </thead>
                <tbody>
                  {amortizationSchedule.map((row) => (
                    <tr key={row.month} className={row.isGrace ? "row-grace" : ""}>
                      <td><strong>Mes {row.month}</strong></td>
                      <td>
                        <span className={`pill-regime ${row.isGrace ? "grace" : "amort"}`}>
                          {row.isGrace ? "Solo Interés" : "Amortización"}
                        </span>
                      </td>
                      <td>{formatCurrency(row.startingBalance, currency)}</td>
                      <td><strong>{formatCurrency(row.payment, currency)}</strong></td>
                      <td className="text-red">{formatCurrency(row.interest, currency)}</td>
                      <td className="text-green">{formatCurrency(row.principalPaid, currency)}</td>
                      <td><strong>{formatCurrency(row.endingBalance, currency)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PROYECCIÓN DE FLUJO DE CAJA A 12 MESES */}
          <div className="dossier-section">
            <h2 className="dossier-section-title">5. ESTADO DE FLUJO DE CAJA MENSUAL PROYECTADO (AÑO 1)</h2>
            <div className="dossier-table-wrap">
              <table className="dossier-table tight-table">
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th>Ingresos</th>
                    <th>Costos Directos</th>
                    <th>Gastos Opex</th>
                    <th>Impuestos</th>
                    <th>Servicio Deuda</th>
                    <th>Flujo Neto</th>
                    <th>Saldo Caja Final</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.months.map((m) => (
                    <tr key={m.month}>
                      <td><strong>Mes {m.month}</strong></td>
                      <td>{formatCurrency(m.revenue, currency)}</td>
                      <td>{formatCurrency(m.cogs, currency)}</td>
                      <td>{formatCurrency(m.totalMonthlyOpex, currency)}</td>
                      <td>{formatCurrency(m.taxProvision || 0, currency)}</td>
                      <td className="text-red">{formatCurrency(m.debtService, currency)}</td>
                      <td className={m.netCashFlow >= 0 ? "text-green font-bold" : "text-red font-bold"}>
                        {formatCurrency(m.netCashFlow, currency)}
                      </td>
                      <td className="font-bold">{formatCurrency(m.endingCash, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* BLOQUE DE FIRMAS Y RATIFICACIÓN */}
          <div className="dossier-section dossier-signatures-section">
            <h2 className="dossier-section-title">6. FIRMAS DE RADICACIÓN Y CERTIFICACIÓN TÉCNICA</h2>
            <p className="dossier-legal-disclaimer">
              Los suscritos certificamos bajo la gravedad de juramento que la información financiera y operativa suministrada en este expediente refleja fielmente las expectativas comerciales, capacidad operativa y modelos de costos de la compañía.
            </p>

            <div className="dossier-signatures-grid">
              <div className="sig-box">
                <div className="sig-line" />
                <input
                  type="text"
                  className="sig-name-input"
                  value={borrowerInfo.legalRepName}
                  onChange={(e) => setBorrowerInfo({ ...borrowerInfo, legalRepName: e.target.value })}
                />
                <span className="sig-role">Representante Legal Solicitante</span>
                <span className="sig-doc">C.C. / ID Legal</span>
              </div>

              <div className="sig-box">
                <div className="sig-line" />
                <input
                  type="text"
                  className="sig-name-input"
                  value={borrowerInfo.accountantName}
                  onChange={(e) => setBorrowerInfo({ ...borrowerInfo, accountantName: e.target.value })}
                />
                <span className="sig-role">Contador Público Titulado / Auditor</span>
                <span className="sig-doc">Dictamen y Certificación Financiera</span>
              </div>

              <div className="sig-box">
                <div className="sig-line" />
                <input
                  type="text"
                  className="sig-name-input"
                  value={borrowerInfo.bankOfficer}
                  onChange={(e) => setBorrowerInfo({ ...borrowerInfo, bankOfficer: e.target.value })}
                />
                <span className="sig-role">Oficial de Crédito / Analista de Riesgos</span>
                <span className="sig-doc">Entidad Financiera Evaluadora</span>
              </div>
            </div>
          </div>

          {/* PIE DE PÁGINA */}
          <div className="dossier-footer">
            <span>Cube Canvas (BCC) ® • iNGIZER Advanced Financial Stack Engine</span>
            <span>Documento generado con rigor matemático bajo normas IFRS / NIIF</span>
          </div>
        </div>
      </div>
    </div>
  );
}
