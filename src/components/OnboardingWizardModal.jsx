import React, { useState } from "react";
import { SECTOR_TEMPLATES } from "../utils/sectorTemplates";
import { formatCurrency, calculateLoanMonthlyPayment } from "../utils/finance";

export default function OnboardingWizardModal({ isOpen, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState("pizzeria_case");

  // Estado del formulario guiado
  const [formData, setFormData] = useState({
    name: "Mi Nueva Pizzería Artesanal",
    sector: "Gastronomía",
    currency: "COP",
    valueProposition: "Pizza artesanal horneada a la piedra en menos de 10 minutos",
    nsmGoal: "10X",
    taxRatePercent: 35,
    initialCash: 5000000,
    mainProduct: {
      name: "Pizza Artesanal Especial",
      monthlySales: 25000000,
      cogs: 5500000,
    },
    secondProduct: {
      name: "Bebidas & Cafetería",
      monthlySales: 7000000,
      cogs: 1500000,
    },
    capexAsset: {
      name: "Horno Industrial a la Piedra",
      amount: 150000000,
    },
    monthlyPayroll: 14000000, // Nómina mensual (W)
    monthlyOpex: 5500000, // Suministros y gastos fijos (SS)
    fundingMethod: "asset_investor", // "asset_investor" | "bank_loan" | "mixed" | "bootstrapping"
    masterEquity: 5000000,
    bankLoan: 0,
    bankTermMonths: 36,
    bankGraceMonths: 0,
    bankRateEA: 20,
    assetInvestorCapital: 150000000,
    assetInvestorTermMonths: 24,
    assetInvestorGraceMonths: 0,
    assetInvestorReturn: 15,
    equityInvestorCapital: 0,
    equityOfferedPercent: 0,
  });

  if (!isOpen) return null;

  const handleSelectTemplate = (templateId) => {
    setSelectedTemplateId(templateId);
    const tmpl = SECTOR_TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;

    const mainProd = tmpl.products[0] || { name: "Producto 1", income: 10000000 };
    const secondProd = tmpl.products[1] || { name: "Producto 2", income: 3000000 };
    const cogs1 = tmpl.cogsData[mainProd.id] || tmpl.cogsData["P1"] || 0;
    const cogs2 = tmpl.cogsData[secondProd.id] || tmpl.cogsData["P2"] || 0;

    let totalW = 0;
    let totalSS = 0;
    let totalA = 0;
    Object.values(tmpl.requirements || {}).forEach((req) => {
      totalW += req.w || 0;
      totalSS += req.ss || 0;
      totalA += req.a || 0;
    });

    const initCash =
      (tmpl.cashData?.cashOnHand || 0) +
      (tmpl.cashData?.bankAccounts || 0) +
      (tmpl.cashData?.platforms || 0);

    setFormData({
      ...formData,
      name: tmpl.name.replace(/^[^\w\s]+/, "").trim(),
      sector: tmpl.sector || "General",
      currency: tmpl.currency || "COP",
      valueProposition: tmpl.valueProposition || "",
      nsmGoal: tmpl.nsmGoal || "10X",
      taxRatePercent: tmpl.taxRatePercent || 35,
      initialCash: initCash,
      mainProduct: {
        name: mainProd.name,
        monthlySales: mainProd.income,
        cogs: cogs1,
      },
      secondProduct: {
        name: secondProd.name,
        monthlySales: secondProd.income,
        cogs: cogs2,
      },
      capexAsset: {
        name: totalA > 0 ? "Activo de Producción (CAPEX)" : "Equipamiento",
        amount: totalA,
      },
      monthlyPayroll: totalW,
      monthlyOpex: totalSS,
      masterEquity: tmpl.fundingSources?.masterEquity || 0,
      bankLoan: tmpl.fundingSources?.bankLoan || 0,
      bankTermMonths: tmpl.fundingSources?.bankTermMonths || 36,
      bankRateEA: tmpl.fundingSources?.bankRateEA || 20,
      bankGraceMonths: tmpl.fundingSources?.bankGraceMonths || 0,
      assetInvestorCapital: tmpl.fundingSources?.assetInvestorCapital || 0,
      assetInvestorTermMonths: tmpl.fundingSources?.assetInvestorTermMonths || 24,
      assetInvestorReturn: tmpl.fundingSources?.assetInvestorReturnPercent || 15,
      assetInvestorGraceMonths: tmpl.fundingSources?.assetInvestorGraceMonths || 0,
      equityInvestorCapital: tmpl.fundingSources?.equityInvestorCapital || 0,
      equityOfferedPercent: tmpl.fundingSources?.equityOfferedPercent || 0,
    });
  };

  // Cálculos rápidos para vista previa
  const totalEstimatedSales =
    (Number(formData.mainProduct.monthlySales) || 0) +
    (Number(formData.secondProduct.monthlySales) || 0);
  const totalEstimatedCogs =
    (Number(formData.mainProduct.cogs) || 0) +
    (Number(formData.secondProduct.cogs) || 0);
  const totalEstimatedOpex =
    (Number(formData.monthlyPayroll) || 0) + (Number(formData.monthlyOpex) || 0);
  const estimatedOperatingProfit =
    totalEstimatedSales - (totalEstimatedCogs + totalEstimatedOpex);

  const bankPayment = calculateLoanMonthlyPayment(
    formData.bankLoan,
    formData.bankRateEA,
    formData.bankTermMonths,
    formData.bankGraceMonths
  );
  const assetPayment = calculateLoanMonthlyPayment(
    formData.assetInvestorCapital,
    formData.assetInvestorReturn,
    formData.assetInvestorTermMonths,
    formData.assetInvestorGraceMonths
  );
  const totalEstimatedDebt = bankPayment + assetPayment;
  const estimatedTax =
    formData.taxRatePercent > 0 && estimatedOperatingProfit > 0
      ? Math.round(estimatedOperatingProfit * (formData.taxRatePercent / 100))
      : 0;
  const estimatedNetProfit = estimatedOperatingProfit - estimatedTax;
  const estimatedDscr =
    totalEstimatedDebt > 0
      ? (estimatedNetProfit / totalEstimatedDebt).toFixed(2)
      : "99.0";

  const handleFinish = () => {
    // Convertir a estructura formal de Cube Canvas
    const tmpl = SECTOR_TEMPLATES.find((t) => t.id === selectedTemplateId);

    const newCanvasState = {
      id: `custom_${Date.now()}`,
      name: formData.name || "Nuevo Proyecto",
      currency: formData.currency,
      nsmGoal: formData.nsmGoal,
      targetCustomer: tmpl?.targetCustomer || "Mercado objetivo definido",
      valueProposition: formData.valueProposition,
      taxRatePercent: Number(formData.taxRatePercent) || 0,
      cashData: {
        cashOnHand: Math.round(formData.initialCash * 0.4),
        bankAccounts: Math.round(formData.initialCash * 0.6),
        platforms: 0,
        receivables: Math.round(totalEstimatedSales * 0.1),
      },
      products: [
        {
          id: "P1",
          name: formData.mainProduct.name || "Producto Principal",
          income: Number(formData.mainProduct.monthlySales) || 0,
          custom: 0,
          consumption: 100,
          growth: 20,
        },
        {
          id: "P2",
          name: formData.secondProduct.name || "Producto Secundario",
          income: Number(formData.secondProduct.monthlySales) || 0,
          custom: 0,
          consumption: 50,
          growth: 15,
        },
      ],
      requirements: {
        production: {
          w: Math.round(formData.monthlyPayroll * 0.5),
          a: Number(formData.capexAsset.amount) || 0,
          ss: Math.round(formData.monthlyOpex * 0.5),
        },
        marketing: {
          w: Math.round(formData.monthlyPayroll * 0.15),
          a: 0,
          ss: Math.round(formData.monthlyOpex * 0.2),
        },
        support: {
          w: Math.round(formData.monthlyPayroll * 0.1),
          a: 0,
          ss: Math.round(formData.monthlyOpex * 0.1),
        },
        administration: {
          w: Math.round(formData.monthlyPayroll * 0.15),
          a: 0,
          ss: Math.round(formData.monthlyOpex * 0.15),
        },
        development: {
          w: Math.round(formData.monthlyPayroll * 0.1),
          a: 0,
          ss: Math.round(formData.monthlyOpex * 0.05),
        },
      },
      cogsData: {
        P1: Number(formData.mainProduct.cogs) || 0,
        P2: Number(formData.secondProduct.cogs) || 0,
      },
      fundingSources: {
        masterEquity: Number(formData.masterEquity) || 0,
        teamContributions: 0,
        bankLoan: Number(formData.bankLoan) || 0,
        bankRateEA: Number(formData.bankRateEA) || 20,
        bankTermMonths: Number(formData.bankTermMonths) || 36,
        bankGraceMonths: Number(formData.bankGraceMonths) || 0,
        assetInvestorCapital: Number(formData.assetInvestorCapital) || 0,
        assetInvestorTermMonths: Number(formData.assetInvestorTermMonths) || 24,
        assetInvestorReturnPercent: Number(formData.assetInvestorReturn) || 15,
        assetInvestorGraceMonths: Number(formData.assetInvestorGraceMonths) || 0,
        equityInvestorCapital: Number(formData.equityInvestorCapital) || 0,
        equityOfferedPercent: Number(formData.equityOfferedPercent) || 0,
      },
    };

    onComplete(newCanvasState);
  };

  return (
    <div className="modal-backdrop-simple wizard-modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog-box wizard-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wizard-header">
          <div className="wizard-title-group">
            <span className="wizard-badge">⚡ ASISTENTE DE CREACIÓN RÁPIDA</span>
            <h2>Estructura tu Negocio & Financiación en 5 Minutos</h2>
          </div>
          <button type="button" className="close-drawer-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* BARRA DE PROGRESO DE 4 PASOS */}
        <div className="wizard-steps-tracker">
          <div
            className={`wizard-step-node ${currentStep >= 1 ? "active" : ""}`}
            onClick={() => setCurrentStep(1)}
          >
            <span className="step-num">1</span>
            <span className="step-lbl">Industria & Moneda</span>
          </div>
          <div
            className={`wizard-step-node ${currentStep >= 2 ? "active" : ""}`}
            onClick={() => setCurrentStep(2)}
          >
            <span className="step-num">2</span>
            <span className="step-lbl">Ventas & Costos</span>
          </div>
          <div
            className={`wizard-step-node ${currentStep >= 3 ? "active" : ""}`}
            onClick={() => setCurrentStep(3)}
          >
            <span className="step-num">3</span>
            <span className="step-lbl">Máquinas & Nómina</span>
          </div>
          <div
            className={`wizard-step-node ${currentStep >= 4 ? "active" : ""}`}
            onClick={() => setCurrentStep(4)}
          >
            <span className="step-num">4</span>
            <span className="step-lbl">Estructura Capital</span>
          </div>
        </div>

        {/* CONTENIDO DEL PASO ACTIVO */}
        <div className="wizard-body">
          {/* PASO 1 */}
          {currentStep === 1 && (
            <div className="wizard-step-content">
              <h3>Paso 1: Elige tu Industria y Parámetros Base</h3>
              <p className="wizard-subtext">
                Selecciona una plantilla preconfigurada con cifras reales de mercado o personaliza desde cero.
              </p>

              <div className="sector-cards-grid">
                {SECTOR_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className={`sector-card ${selectedTemplateId === tmpl.id ? "selected" : ""}`}
                    onClick={() => handleSelectTemplate(tmpl.id)}
                  >
                    <h4>{tmpl.name}</h4>
                    <p className="sector-tag">{tmpl.sector} • {tmpl.currency}</p>
                    <p className="sector-desc">{tmpl.valueProposition}</p>
                  </div>
                ))}
              </div>

              <div className="wizard-form-row mt-4">
                <div className="wizard-field">
                  <label>Nombre de tu Empresa / Proyecto:</label>
                  <input
                    type="text"
                    className="input-control"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="wizard-field">
                  <label>Moneda del Modelo:</label>
                  <select
                    className="input-control"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  >
                    <option value="COP">COP ($ Pesos Colombianos)</option>
                    <option value="USD">USD ($ Dólares Americanos)</option>
                    <option value="MXN">MXN ($ Pesos Mexicanos)</option>
                    <option value="EUR">EUR (€ Euros)</option>
                  </select>
                </div>
              </div>

              <div className="wizard-form-row">
                <div className="wizard-field full-width">
                  <label>Propuesta de Valor (¿Qué resuelve tu negocio y por qué te compran?):</label>
                  <input
                    type="text"
                    className="input-control"
                    value={formData.valueProposition}
                    onChange={(e) => setFormData({ ...formData, valueProposition: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* PASO 2 */}
          {currentStep === 2 && (
            <div className="wizard-step-content">
              <h3>Paso 2: Ventas Mensuales y Margen Bruto (COGS)</h3>
              <p className="wizard-subtext">
                Define tus dos líneas principales de ingresos con la capacidad instalada que buscas financiar.
              </p>

              <div className="wizard-two-col-box">
                <div className="wizard-box-panel">
                  <h4>Línea de Venta 1 (Principal)</h4>
                  <div className="wizard-field mb-2">
                    <label>Nombre del Producto/Servicio:</label>
                    <input
                      type="text"
                      className="input-control"
                      value={formData.mainProduct.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          mainProduct: { ...formData.mainProduct, name: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="wizard-field mb-2">
                    <label>Ventas Mensuales Estimadas ({formData.currency}):</label>
                    <input
                      type="number"
                      className="input-control"
                      value={formData.mainProduct.monthlySales}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          mainProduct: {
                            ...formData.mainProduct,
                            monthlySales: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <div className="wizard-field">
                    <label>Costo de Insumos Directos (COGS / Materia Prima):</label>
                    <input
                      type="number"
                      className="input-control"
                      value={formData.mainProduct.cogs}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          mainProduct: {
                            ...formData.mainProduct,
                            cogs: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="wizard-box-panel">
                  <h4>Línea de Venta 2 (Complementaria)</h4>
                  <div className="wizard-field mb-2">
                    <label>Nombre del Producto/Servicio:</label>
                    <input
                      type="text"
                      className="input-control"
                      value={formData.secondProduct.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          secondProduct: { ...formData.secondProduct, name: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="wizard-field mb-2">
                    <label>Ventas Mensuales Estimadas ({formData.currency}):</label>
                    <input
                      type="number"
                      className="input-control"
                      value={formData.secondProduct.monthlySales}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          secondProduct: {
                            ...formData.secondProduct,
                            monthlySales: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <div className="wizard-field">
                    <label>Costo de Insumos Directos (COGS):</label>
                    <input
                      type="number"
                      className="input-control"
                      value={formData.secondProduct.cogs}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          secondProduct: {
                            ...formData.secondProduct,
                            cogs: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="wizard-calc-banner">
                <span>Ventas Totales: <strong>{formatCurrency(totalEstimatedSales, formData.currency)}/mes</strong></span>
                <span>Margen Bruto (COGS): <strong>{formatCurrency(totalEstimatedSales - totalEstimatedCogs, formData.currency)}/mes</strong></span>
              </div>
            </div>
          )}

          {/* PASO 3 */}
          {currentStep === 3 && (
            <div className="wizard-step-content">
              <h3>Paso 3: Máquinas, Equipos (CAPEX), Nómina y Gastos Fijos</h3>
              <p className="wizard-subtext">
                En la metodología BCC, el activo clave (A) habilita el crecimiento. La nómina (W) y suministros (SS) sostienen la operación.
              </p>

              <div className="wizard-form-row">
                <div className="wizard-field">
                  <label>Activo / Máquina a Financiar (CAPEX - Bloque A):</label>
                  <input
                    type="text"
                    className="input-control"
                    value={formData.capexAsset.name}
                    placeholder="Ej. Horno de Piedra, Máquina de Confección, Servidor"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capexAsset: { ...formData.capexAsset, name: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="wizard-field">
                  <label>Valor Total del Activo / Horno ({formData.currency}):</label>
                  <input
                    type="number"
                    className="input-control"
                    value={formData.capexAsset.amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capexAsset: {
                          ...formData.capexAsset,
                          amount: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div className="wizard-form-row">
                <div className="wizard-field">
                  <label>Nómina Total Mensual del Equipo (W - Trabajo):</label>
                  <input
                    type="number"
                    className="input-control"
                    value={formData.monthlyPayroll}
                    onChange={(e) =>
                      setFormData({ ...formData, monthlyPayroll: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="wizard-field">
                  <label>Gastos Fijos Operativos y Suministros (SS - Alquiler/Servicios):</label>
                  <input
                    type="number"
                    className="input-control"
                    value={formData.monthlyOpex}
                    onChange={(e) =>
                      setFormData({ ...formData, monthlyOpex: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="wizard-field">
                  <label>Tasa Estimada de Impuesto de Renta (%):</label>
                  <input
                    type="number"
                    className="input-control"
                    value={formData.taxRatePercent}
                    onChange={(e) =>
                      setFormData({ ...formData, taxRatePercent: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="wizard-calc-banner">
                <span>EBITDA Operativo Mensual: <strong>{formatCurrency(estimatedOperatingProfit, formData.currency)}</strong></span>
                <span>Utilidad Neta Post-Impuestos ({formData.taxRatePercent}%): <strong>{formatCurrency(estimatedNetProfit, formData.currency)}</strong></span>
              </div>
            </div>
          )}

          {/* PASO 4 */}
          {currentStep === 4 && (
            <div className="wizard-step-content">
              <h3>Paso 4: Estructura del Capital Stack (¿Quién pone el dinero?)</h3>
              <p className="wizard-subtext">
                Compara las opciones de financiamiento para cubrir la maquinaria ({formatCurrency(formData.capexAsset.amount, formData.currency)}).
              </p>

              <div className="wizard-funding-grid">
                {/* OPCIÓN INVERSIONISTA DE ACTIVO */}
                <div className="funding-box-option">
                  <h4>🤝 Opción A: Inversionista de Maquinaria (Activo 4B)</h4>
                  <p className="f-desc">Un tercero compra el activo y tú le pagas cuotas fijas mensuales.</p>
                  <div className="wizard-field mb-2">
                    <label>Capital Aportado ({formData.currency}):</label>
                    <input
                      type="number"
                      className="input-control"
                      value={formData.assetInvestorCapital}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          assetInvestorCapital: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="wizard-field mb-2">
                    <label>Plazo (Meses):</label>
                    <input
                      type="number"
                      className="input-control"
                      value={formData.assetInvestorTermMonths}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          assetInvestorTermMonths: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="wizard-field mb-2">
                    <label>Meses de Gracia a Capital:</label>
                    <input
                      type="number"
                      className="input-control"
                      value={formData.assetInvestorGraceMonths}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          assetInvestorGraceMonths: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="wizard-field">
                    <label>Retorno Anual Pactado (%):</label>
                    <input
                      type="number"
                      className="input-control"
                      value={formData.assetInvestorReturn}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          assetInvestorReturn: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <span className="cuota-preview">
                    Cuota mensual: {formatCurrency(assetPayment, formData.currency)}
                  </span>
                </div>

                {/* OPCIÓN CRÉDITO BANCARIO */}
                <div className="funding-box-option">
                  <h4>🏦 Opción B: Crédito Bancario Tradicional (4C)</h4>
                  <p className="f-desc">Préstamo amortizable con cuota fija del sistema financiero.</p>
                  <div className="wizard-field mb-2">
                    <label>Monto del Crédito ({formData.currency}):</label>
                    <input
                      type="number"
                      className="input-control"
                      value={formData.bankLoan}
                      onChange={(e) =>
                        setFormData({ ...formData, bankLoan: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="wizard-field mb-2">
                    <label>Plazo (Meses):</label>
                    <input
                      type="number"
                      className="input-control"
                      value={formData.bankTermMonths}
                      onChange={(e) =>
                        setFormData({ ...formData, bankTermMonths: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="wizard-field mb-2">
                    <label>Meses de Gracia a Capital:</label>
                    <input
                      type="number"
                      className="input-control"
                      value={formData.bankGraceMonths}
                      onChange={(e) =>
                        setFormData({ ...formData, bankGraceMonths: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="wizard-field">
                    <label>Tasa Bancaria (% E.A.):</label>
                    <input
                      type="number"
                      className="input-control"
                      value={formData.bankRateEA}
                      onChange={(e) =>
                        setFormData({ ...formData, bankRateEA: Number(e.target.value) })
                      }
                    />
                  </div>
                  <span className="cuota-preview">
                    Cuota mensual: {formatCurrency(bankPayment, formData.currency)}
                  </span>
                </div>
              </div>

              {/* RADAR DE VIABILIDAD FINAL */}
              <div
                className={`wizard-viability-radar ${
                  Number(estimatedDscr) >= 1.25 ? "viable" : "alert"
                }`}
              >
                <div className="radar-header">
                  <strong>DIAGNÓSTICO EN TIEMPO REAL:</strong>
                  <span className="radar-dscr">DSCR: {estimatedDscr}x</span>
                </div>
                <p>
                  {Number(estimatedDscr) >= 1.25
                    ? "🟢 Excelente capacidad de pago. Tu flujo post-impuestos cubre holgadamente las cuotas de financiamiento."
                    : "⚠️ Alerta de liquidez: La cuota mensual es muy alta en relación a la utilidad neta. Aumenta el plazo o aporta más recursos propios."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* PIE Y BOTONES DE NAVEGACIÓN */}
        <div className="wizard-footer">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                ← Anterior
              </button>
            )}
          </div>
          <div className="wizard-btn-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            {currentStep < 4 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCurrentStep(currentStep + 1)}
              >
                Siguiente →
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-success-wizard"
                onClick={handleFinish}
              >
                🚀 Generar Mi Cube Canvas Completo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
