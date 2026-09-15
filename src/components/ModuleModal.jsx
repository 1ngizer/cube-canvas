import React, { useState, useMemo, useEffect } from "react";
import {
  formatCurrency,
  calculateLoanMonthlyPayment,
  calculateLoanAmortizationSchedule,
  calculateEquityValuation,
} from "../utils/finance";
import { queryAiCopilot } from "../utils/aiService";

const ALL_MODULES = [
  { id: "1A", group: "Estrategia & Ventas", name: "North Star Metric (NSM) & OKRs" },
  { id: "1B", group: "Estrategia & Ventas", name: "Disponibilidad de Caja & Cartera" },
  { id: "1D", group: "Estrategia & Ventas", name: "Catálogo y Proyección de Productos (P1..P9)" },
  { id: "2A", group: "Costos & Runway", name: "Runway, Burn Rate & Estructura de Gastos" },
  { id: "2C", group: "Costos & Runway", name: "Requerimientos de Inversión (W, A, SS)" },
  { id: "3A", group: "Bootstrapping", name: "Master (Aporte del Fundador & Reinversión)" },
  { id: "3B", group: "Bootstrapping", name: "Volunteer (Horas de Mentoría & Sweat Equity)" },
  { id: "3C", group: "Bootstrapping", name: "Team (Aportes del Equipo Inicial)" },
  { id: "4A", group: "Blitzscaling", name: "Inversionista de Equity (Acciones & Valoración)" },
  { id: "4B", group: "Blitzscaling", name: "Inversor de Activo / Deuda (Caso Horno $150M)" },
  { id: "4C", group: "Blitzscaling", name: "Crédito Bancario Tradicional (Amortización)" },
];

export default function ModuleModal({ moduleId, state, metrics, onChange, onClose, onOpenAiSettings }) {
  const [currentModuleId, setCurrentModuleId] = useState(moduleId);
  const [activeTab, setActiveTab] = useState("form"); // "form" o "ai"
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiCustomQuestion, setAiCustomQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Clave y proveedor de IA guardados en localStorage
  const aiApiKey = typeof window !== "undefined" ? localStorage.getItem("bcc_ai_api_key") || "" : "";
  const aiProvider = typeof window !== "undefined" ? localStorage.getItem("bcc_ai_provider") || "gemini" : "gemini";

  if (moduleId && currentModuleId !== moduleId && !ALL_MODULES.some(m => m.id === currentModuleId)) {
    setCurrentModuleId(moduleId);
  }

  const currentIndex = ALL_MODULES.findIndex((m) => m.id === currentModuleId);
  const prevModule = currentIndex > 0 ? ALL_MODULES[currentIndex - 1] : null;
  const nextModule = currentIndex < ALL_MODULES.length - 1 ? ALL_MODULES[currentIndex + 1] : null;
  const currentModule = ALL_MODULES[currentIndex] || ALL_MODULES[0];

  // Cálculo de amortización bancaria para 4C
  const bankAmortization = useMemo(() => {
    if (currentModuleId !== "4C") return [];
    return calculateLoanAmortizationSchedule(
      state.fundingSources?.bankLoan || 0,
      state.fundingSources?.bankRateEA || 20,
      state.fundingSources?.bankTermMonths || 36,
      12
    );
  }, [currentModuleId, state.fundingSources]);

  // Cálculo de valoración para 4A
  const equityValuation = useMemo(() => {
    if (currentModuleId !== "4A") return { postMoney: 0, preMoney: 0, dilution: 0 };
    return calculateEquityValuation(
      state.fundingSources?.equityInvestorCapital || 0,
      state.fundingSources?.equityOfferedPercent || 0
    );
  }, [currentModuleId, state.fundingSources]);

  // Cuota del financista de activo para 4B
  const assetMonthlyPayment = useMemo(() => {
    if (currentModuleId !== "4B") return 0;
    return calculateLoanMonthlyPayment(
      state.fundingSources?.assetInvestorCapital || 0,
      state.fundingSources?.assetInvestorReturnPercent || 15,
      state.fundingSources?.assetInvestorTermMonths || 24
    );
  }, [currentModuleId, state.fundingSources]);

  // Llamada al servicio de IA (real o heurístico)
  const handleRunAi = async (queryTopic = "") => {
    setIsGenerating(true);
    try {
      const response = await queryAiCopilot({
        provider: aiProvider,
        apiKey: aiApiKey,
        moduleId: currentModuleId,
        state,
        metrics: metrics || {},
        query: queryTopic || "Analizar viabilidad estratégica y riesgos de este módulo",
      });
      setAiResponse(response);
    } catch (err) {
      setAiResponse("Error al generar análisis con el Copilot: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCustomQuestion = async () => {
    if (!aiCustomQuestion.trim()) return;
    const q = aiCustomQuestion.trim();
    setAiCustomQuestion("");
    setIsGenerating(true);
    try {
      const response = await queryAiCopilot({
        provider: aiProvider,
        apiKey: aiApiKey,
        moduleId: currentModuleId,
        state,
        metrics: metrics || {},
        query: q,
      });
      setAiResponse(response);
    } catch (err) {
      setAiResponse("Error consultando al Copilot: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="module-modal-backdrop" onClick={onClose}>
      <div className="module-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* CABECERA CON IDENTIDAD BCC & NAVEGACIÓN */}
        <div className="drawer-header">
          <div className="drawer-header-left">
            <div className="drawer-badge-row">
              <span className="drawer-module-badge">{currentModule.id}</span>
              <span className="drawer-group-badge">{currentModule.group}</span>
              <span className="drawer-bo-tag">BO: 1F1000001</span>
            </div>
            <h3 className="drawer-title">{currentModule.name}</h3>
          </div>

          <div className="drawer-header-actions">
            <select
              className="module-jump-select"
              value={currentModuleId}
              onChange={(e) => {
                setCurrentModuleId(e.target.value);
                setAiResponse(null);
              }}
              title="Cambiar de módulo de trabajo"
            >
              {ALL_MODULES.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.id}] {m.name}
                </option>
              ))}
            </select>
            <button type="button" className="close-drawer-btn" onClick={onClose} title="Cerrar módulo">
              ✕
            </button>
          </div>
        </div>

        {/* NAVEGACIÓN ANTERIOR / SIGUIENTE */}
        <div className="module-stepper-bar">
          <button
            type="button"
            className="stepper-nav-btn"
            disabled={!prevModule}
            onClick={() => {
              if (prevModule) {
                setCurrentModuleId(prevModule.id);
                setAiResponse(null);
              }
            }}
          >
            ← {prevModule ? `[${prevModule.id}] ${prevModule.name.split(" ")[0]}` : "Inicio"}
          </button>

          <span className="stepper-indicator">
            Módulo {currentIndex + 1} de {ALL_MODULES.length}
          </span>

          <button
            type="button"
            className="stepper-nav-btn"
            disabled={!nextModule}
            onClick={() => {
              if (nextModule) {
                setCurrentModuleId(nextModule.id);
                setAiResponse(null);
              }
            }}
          >
            {nextModule ? `[${nextModule.id}] ${nextModule.name.split(" ")[0]}` : "Final"} →
          </button>
        </div>

        {/* PESTAÑAS: FORMULARIO VS COPILOT IA */}
        <div className="drawer-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === "form" ? "active" : ""}`}
            onClick={() => setActiveTab("form")}
          >
            📝 Formulario de Entrada
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "ai" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("ai");
              if (!aiResponse) handleRunAi("viability");
            }}
          >
            🤖 Gizer IA Copilot {aiApiKey ? "⚡ API Conectada" : "🟢 Modo Experto"}
          </button>
        </div>

        {/* CUERPO DEL DRAWER */}
        <div className="drawer-body">
          {activeTab === "form" && (
            <div className="module-form-content">
              {/* 1A: NORTH STAR METRIC */}
              {currentModuleId === "1A" && (
                <div className="input-group-stack">
                  <div className="notice-box">
                    <strong>Objetivo Estratégico [1A]:</strong> Define la métrica norte que guiará el crecimiento con la nueva capacidad instalada.
                  </div>

                  <div className="input-group">
                    <label>Nombre de la Métrica Norte (NSM)</label>
                    <input
                      type="text"
                      className="input-control"
                      value={state.nsmMetricName || "Pizzas vendidas por semana"}
                      onChange={(e) => onChange({ ...state, nsmMetricName: e.target.value })}
                      placeholder="Ej. Clientes recurrentes por semana"
                    />
                  </div>

                  <div className="input-row-2">
                    <div className="input-group">
                      <label>Multiplicador de Meta (OKR)</label>
                      <input
                        type="text"
                        className="input-control"
                        value={state.nsmGoal || "10X"}
                        onChange={(e) => onChange({ ...state, nsmGoal: e.target.value })}
                        placeholder="Ej. 10X, 5X"
                      />
                    </div>
                    <div className="input-group">
                      <label>Horizonte Temporal</label>
                      <input type="text" className="input-control" defaultValue="5 years" disabled />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Segmento de Clientes Objetivo</label>
                    <input
                      type="text"
                      className="input-control"
                      value={state.targetCustomer || "Familias y ejecutivos"}
                      onChange={(e) => onChange({ ...state, targetCustomer: e.target.value })}
                    />
                  </div>

                  <div className="input-group">
                    <label>Propuesta de Valor Principal</label>
                    <textarea
                      className="input-control"
                      rows={3}
                      value={state.valueProposition || ""}
                      onChange={(e) => onChange({ ...state, valueProposition: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* 1B: CAJA Y CARTERA */}
              {currentModuleId === "1B" && (
                <div className="input-group-stack">
                  <div className="notice-box">
                    <strong>Posición de Liquidez [1B / 1C]:</strong> Efectivo disponible hoy y cuentas por cobrar a clientes.
                  </div>

                  <div className="hero-kpi-badge">
                    <span>Total Liquidez Inmediata [1C]:</span>
                    <strong>
                      {formatCurrency(
                        (state.cashData?.cashOnHand || 0) +
                        (state.cashData?.bankAccounts || 0) +
                        (state.cashData?.platforms || 0)
                      )}
                    </strong>
                  </div>

                  <div className="input-group">
                    <label>Efectivo en Caja Menor / Tienda</label>
                    <div className="input-wrapper">
                      <span className="input-prefix">$</span>
                      <input
                        type="number"
                        className="input-control"
                        value={state.cashData?.cashOnHand ?? ""}
                        onChange={(e) =>
                          onChange({
                            ...state,
                            cashData: { ...state.cashData, cashOnHand: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Cuentas Bancarias Disponibles</label>
                    <div className="input-wrapper">
                      <span className="input-prefix">$</span>
                      <input
                        type="number"
                        className="input-control"
                        value={state.cashData?.bankAccounts ?? ""}
                        onChange={(e) =>
                          onChange({
                            ...state,
                            cashData: { ...state.cashData, bankAccounts: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Pasarelas de Pago Digital (Wompi, Bold, Mercado Pago)</label>
                    <div className="input-wrapper">
                      <span className="input-prefix">$</span>
                      <input
                        type="number"
                        className="input-control"
                        value={state.cashData?.platforms ?? ""}
                        onChange={(e) =>
                          onChange({
                            ...state,
                            cashData: { ...state.cashData, platforms: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>[1B] Cuentas por Cobrar (Cartera a 30-60 días)</label>
                    <div className="input-wrapper">
                      <span className="input-prefix">$</span>
                      <input
                        type="number"
                        className="input-control"
                        value={state.cashData?.receivables ?? ""}
                        onChange={(e) =>
                          onChange({
                            ...state,
                            cashData: { ...state.cashData, receivables: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 1D: PRODUCTOS */}
              {currentModuleId === "1D" && (
                <div className="products-editor-container">
                  <div className="notice-box">
                    <strong>Catálogo y Proyección [1D]:</strong> Estima las ventas mensuales por cada línea de producto.
                  </div>

                  <div className="products-list-stack">
                    {(state.products || []).map((p, idx) => (
                      <div key={p.id} className="product-card-edit">
                        <div className="product-card-header">
                          <span className="p-pill">P{idx + 1}</span>
                          <input
                            type="text"
                            className="input-control p-name-input"
                            value={p.name}
                            onChange={(e) => {
                              const updated = [...state.products];
                              updated[idx].name = e.target.value;
                              onChange({ ...state, products: updated });
                            }}
                          />
                        </div>

                        <div className="product-card-fields">
                          <div className="mini-group">
                            <label>Ventas ($/mes)</label>
                            <input
                              type="number"
                              className="input-control"
                              value={p.income ?? ""}
                              onChange={(e) => {
                                const updated = [...state.products];
                                updated[idx].income = Number(e.target.value);
                                onChange({ ...state, products: updated });
                              }}
                            />
                          </div>
                          <div className="mini-group">
                            <label>Unidades / Mes</label>
                            <input
                              type="number"
                              className="input-control"
                              value={p.consumption ?? ""}
                              onChange={(e) => {
                                const updated = [...state.products];
                                updated[idx].consumption = Number(e.target.value);
                                onChange({ ...state, products: updated });
                              }}
                            />
                          </div>
                          <div className="mini-group">
                            <label>Crecimiento (%)</label>
                            <input
                              type="number"
                              className="input-control"
                              value={p.growth ?? ""}
                              onChange={(e) => {
                                const updated = [...state.products];
                                updated[idx].growth = Number(e.target.value);
                                onChange({ ...state, products: updated });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary add-prod-btn"
                    onClick={() => {
                      const nextId = `P${(state.products || []).length + 1}`;
                      onChange({
                        ...state,
                        products: [
                          ...(state.products || []),
                          { id: nextId, name: `Nueva Línea ${nextId}`, income: 0, consumption: 0, growth: 10 },
                        ],
                      });
                    }}
                  >
                    + Agregar Producto
                  </button>
                </div>
              )}

              {/* 2A: RUNWAY Y BURN RATE */}
              {currentModuleId === "2A" && (
                <div className="input-group-stack">
                  <div className="notice-box">
                    <strong>Análisis de Supervivencia [2A]:</strong> Cuántos meses de caja tienes con los gastos fijos actuales.
                  </div>

                  <div className="hero-kpi-badge">
                    <span>Runway Estimado:</span>
                    <strong>{metrics?.runwayMonths || 0} meses</strong>
                  </div>

                  <div className="calculated-preview-box">
                    <span>Quemado Mensual (Burn Rate):</span>
                    <strong>{formatCurrency(metrics?.monthlyBurnRate || 0)}/mes</strong>
                  </div>
                </div>
              )}

              {/* 2C: REQUERIMIENTOS W, A, SS */}
              {currentModuleId === "2C" && (
                <div className="req-editor-container">
                  <div className="notice-box">
                    <strong>Requerimientos [2C]:</strong> (W) Nómina mensual, (A) Activos Capex únicos (Horno $150M), (SS) Capital de trabajo mensual.
                  </div>

                  {[
                    { key: "production", label: "Área de Producción & Operaciones (Horno)" },
                    { key: "marketing", label: "Área de Marketing, Pauta & Ventas" },
                    { key: "support", label: "Área de Soporte, Meseros & Domicilios" },
                    { key: "administration", label: "Área de Administración & Finanzas" },
                    { key: "development", label: "Área de Tecnología & Software POS" },
                  ].map(({ key, label }) => {
                    const cur = state.requirements?.[key] || { w: 0, a: 0, ss: 0 };
                    return (
                      <div key={key} className="area-edit-block">
                        <h4>{label}</h4>
                        <div className="area-inputs-row">
                          <div className="mini-group">
                            <label>(W) Trabajo / Nómina</label>
                            <input
                              type="number"
                              className="input-control"
                              value={cur.w ?? ""}
                              onChange={(e) => {
                                const reqs = { ...state.requirements };
                                reqs[key] = { ...cur, w: Number(e.target.value) };
                                onChange({ ...state, requirements: reqs });
                              }}
                            />
                          </div>
                          <div className="mini-group highlight-input">
                            <label>(A) Activos / CAPEX</label>
                            <input
                              type="number"
                              className="input-control"
                              value={cur.a ?? ""}
                              onChange={(e) => {
                                const reqs = { ...state.requirements };
                                reqs[key] = { ...cur, a: Number(e.target.value) };
                                onChange({ ...state, requirements: reqs });
                              }}
                            />
                          </div>
                          <div className="mini-group">
                            <label>(SS) Capital Trabajo</label>
                            <input
                              type="number"
                              className="input-control"
                              value={cur.ss ?? ""}
                              onChange={(e) => {
                                const reqs = { ...state.requirements };
                                reqs[key] = { ...cur, ss: Number(e.target.value) };
                                onChange({ ...state, requirements: reqs });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 3A: MASTER */}
              {currentModuleId === "3A" && (
                <div className="input-group-stack">
                  <div className="notice-box">
                    <strong>Aportes del Fundador [3A]:</strong> Capital propio o reinversión de utilidades. No genera deuda ni diluye control.
                  </div>
                  <div className="input-group">
                    <label>Aporte de Capital Propio del Fundador ($)</label>
                    <div className="input-wrapper">
                      <span className="input-prefix">$</span>
                      <input
                        type="number"
                        className="input-control"
                        value={state.fundingSources?.masterEquity ?? ""}
                        onChange={(e) =>
                          onChange({
                            ...state,
                            fundingSources: { ...state.fundingSources, masterEquity: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3B: VOLUNTEER */}
              {currentModuleId === "3B" && (
                <div className="input-group-stack">
                  <div className="notice-box">
                    <strong>Mentoría & Sweat Equity [3B]:</strong> Horas de trabajo voluntario valoradas sin salida de efectivo.
                  </div>
                  <div className="input-row-2">
                    <div className="input-group">
                      <label>Horas Aportadas al Mes</label>
                      <input
                        type="number"
                        className="input-control"
                        value={state.fundingSources?.volunteerHours || 40}
                        onChange={(e) =>
                          onChange({
                            ...state,
                            fundingSources: {
                              ...state.fundingSources,
                              volunteerHours: Number(e.target.value),
                              volunteerHoursValue: Number(e.target.value) * (state.fundingSources?.volunteerHourlyRate || 50000),
                            },
                          })
                        }
                      />
                    </div>
                    <div className="input-group">
                      <label>Tarifa Horaria Referencia ($)</label>
                      <input
                        type="number"
                        className="input-control"
                        value={state.fundingSources?.volunteerHourlyRate || 50000}
                        onChange={(e) =>
                          onChange({
                            ...state,
                            fundingSources: {
                              ...state.fundingSources,
                              volunteerHourlyRate: Number(e.target.value),
                              volunteerHoursValue: (state.fundingSources?.volunteerHours || 40) * Number(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3C: TEAM */}
              {currentModuleId === "3C" && (
                <div className="input-group-stack">
                  <div className="notice-box">
                    <strong>Aportes del Equipo [3C]:</strong> Capital o sacrificio salarial de socios colaboradores.
                  </div>
                  <div className="input-group">
                    <label>Aporte en Capital del Equipo ($)</label>
                    <div className="input-wrapper">
                      <span className="input-prefix">$</span>
                      <input
                        type="number"
                        className="input-control"
                        value={state.fundingSources?.teamContributions ?? ""}
                        onChange={(e) =>
                          onChange({
                            ...state,
                            fundingSources: { ...state.fundingSources, teamContributions: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4A: EQUITY */}
              {currentModuleId === "4A" && (
                <div className="input-group-stack">
                  <div className="notice-box">
                    <strong>Inversionista de Equity [4A]:</strong> Capital de riesgo a cambio de participación societaria. Sin cuota fija de deuda.
                  </div>
                  <div className="input-row-2">
                    <div className="input-group">
                      <label>Ticket de Inversión ($)</label>
                      <div className="input-wrapper">
                        <span className="input-prefix">$</span>
                        <input
                          type="number"
                          className="input-control"
                          value={state.fundingSources?.equityInvestorCapital ?? ""}
                          onChange={(e) =>
                            onChange({
                              ...state,
                              fundingSources: { ...state.fundingSources, equityInvestorCapital: Number(e.target.value) },
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="input-group">
                      <label>Participación Ofrecida (%)</label>
                      <input
                        type="number"
                        className="input-control"
                        value={state.fundingSources?.equityOfferedPercent ?? ""}
                        onChange={(e) =>
                          onChange({
                            ...state,
                            fundingSources: { ...state.fundingSources, equityOfferedPercent: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="calculated-preview-box">
                    <span>Valoración Post-Money Implícita:</span>
                    <strong>{formatCurrency(equityValuation.postMoney)}</strong>
                  </div>
                </div>
              )}

              {/* 4B: INVERSIONISTA DE ACTIVO */}
              {currentModuleId === "4B" && (
                <div className="input-group-stack">
                  <div className="notice-box">
                    <strong>Inversor de Activo [4B]:</strong> Financia el horno y se le paga una cuota mensual pactada de la utilidad operacional.
                  </div>
                  <div className="hero-kpi-badge">
                    <span>Activo Financiado (ej. Horno):</span>
                    <strong>{formatCurrency(state.fundingSources?.assetInvestorCapital || 0)}</strong>
                  </div>

                  <div className="input-group">
                    <label>Capital aportado para el Activo</label>
                    <div className="input-wrapper">
                      <span className="input-prefix">$</span>
                      <input
                        type="number"
                        className="input-control"
                        value={state.fundingSources?.assetInvestorCapital ?? ""}
                        onChange={(e) =>
                          onChange({
                            ...state,
                            fundingSources: { ...state.fundingSources, assetInvestorCapital: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="input-row-2">
                    <div className="input-group">
                      <label>Plazo (Meses)</label>
                      <input
                        type="number"
                        className="input-control"
                        value={state.fundingSources?.assetInvestorTermMonths || 24}
                        onChange={(e) =>
                          onChange({
                            ...state,
                            fundingSources: { ...state.fundingSources, assetInvestorTermMonths: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                    <div className="input-group">
                      <label>Retorno Anual Pactado (%)</label>
                      <input
                        type="number"
                        className="input-control"
                        value={state.fundingSources?.assetInvestorReturnPercent || 15}
                        onChange={(e) =>
                          onChange({
                            ...state,
                            fundingSources: { ...state.fundingSources, assetInvestorReturnPercent: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="calculated-preview-box">
                    <span>Cuota mensual estimada a pagar de la utilidad:</span>
                    <strong>{formatCurrency(assetMonthlyPayment)}/mes</strong>
                  </div>
                </div>
              )}

              {/* 4C: CRÉDITO BANCARIO */}
              {currentModuleId === "4C" && (
                <div className="input-group-stack">
                  <div className="notice-box">
                    <strong>Crédito Bancario [4C]:</strong> Amortización francesa de cuota fija.
                  </div>

                  <div className="input-group">
                    <label>Monto del Préstamo</label>
                    <div className="input-wrapper">
                      <span className="input-prefix">$</span>
                      <input
                        type="number"
                        className="input-control"
                        value={state.fundingSources?.bankLoan ?? ""}
                        onChange={(e) =>
                          onChange({
                            ...state,
                            fundingSources: { ...state.fundingSources, bankLoan: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="input-row-2">
                    <div className="input-group">
                      <label>Tasa (% E.A.)</label>
                      <input
                        type="number"
                        className="input-control"
                        value={state.fundingSources?.bankRateEA || 20}
                        onChange={(e) =>
                          onChange({
                            ...state,
                            fundingSources: { ...state.fundingSources, bankRateEA: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                    <div className="input-group">
                      <label>Plazo (Meses)</label>
                      <input
                        type="number"
                        className="input-control"
                        value={state.fundingSources?.bankTermMonths || 36}
                        onChange={(e) =>
                          onChange({
                            ...state,
                            fundingSources: { ...state.fundingSources, bankTermMonths: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="calculated-preview-box">
                    <span>Cuota Fija Mensual Calculada:</span>
                    <strong>
                      {formatCurrency(
                        calculateLoanMonthlyPayment(
                          state.fundingSources?.bankLoan || 0,
                          state.fundingSources?.bankRateEA || 20,
                          state.fundingSources?.bankTermMonths || 36
                        )
                      )}/mes
                    </strong>
                  </div>

                  {bankAmortization.length > 0 && (
                    <div className="bank-schedule-wrap">
                      <h4 style={{ fontSize: "0.8rem", color: "var(--bcc-blue-dark)", margin: "0.75rem 0 0.4rem" }}>
                        Tabla de Amortización (Primeros 12 meses):
                      </h4>
                      <table className="mini-schedule-table">
                        <thead>
                          <tr>
                            <th>Mes</th>
                            <th>Cuota</th>
                            <th>Interés</th>
                            <th>Abono Capital</th>
                            <th>Saldo Deuda</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bankAmortization.map((row) => (
                            <tr key={row.month}>
                              <td>M{row.month}</td>
                              <td>{formatCurrency(row.payment)}</td>
                              <td>{formatCurrency(row.interest)}</td>
                              <td>{formatCurrency(row.principalPaid)}</td>
                              <td>{formatCurrency(row.balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA: COPILOT IA */}
          {activeTab === "ai" && (
            <div className="ai-copilot-tab">
              <div className="ai-switch-bar">
                <span className="switch-label">
                  Asistente Gizer IA {aiApiKey ? `(${aiProvider.toUpperCase()} API Conectada)` : "(Modo Experto Local)"}:
                </span>
                <button
                  type="button"
                  className="nav-btn btn-save"
                  onClick={onOpenAiSettings}
                  style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem" }}
                  title="Configurar clave de API para usar Gemini o GPT-4o"
                >
                  ⚙️ Configurar API Key
                </button>
              </div>

              {/* BOTONES RÁPIDOS */}
              <div className="ai-prompt-suggestions">
                <label>Análisis Estratégico Rápido:</label>
                <div className="chips-row">
                  <button
                    type="button"
                    className="prompt-chip"
                    onClick={() => handleRunAi("viability")}
                    disabled={isGenerating}
                  >
                    🎯 Evaluar Viabilidad y Riesgos del Módulo [{currentModule.id}]
                  </button>
                  <button
                    type="button"
                    className="prompt-chip"
                    onClick={() => handleRunAi("optimization")}
                    disabled={isGenerating}
                  >
                    💡 Estrategia de Optimización de Capital / Costos
                  </button>
                  <button
                    type="button"
                    className="prompt-chip"
                    onClick={() => handleRunAi("negotiation")}
                    disabled={isGenerating}
                  >
                    🤝 Guía de Negociación para el Emprendedor
                  </button>
                </div>
              </div>

              {/* CONSULTA LIBRE */}
              <div className="ai-custom-query-box">
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "0.35rem" }}>
                  Escribe tu consulta personalizada al Copilot:
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Ej. ¿Cómo negociar una tasa más baja o período de gracia?"
                    value={aiCustomQuestion}
                    onChange={(e) => setAiCustomQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCustomQuestion()}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleCustomQuestion}
                    disabled={isGenerating || !aiCustomQuestion.trim()}
                  >
                    {isGenerating ? "..." : "Consultar"}
                  </button>
                </div>
              </div>

              {/* TARJETA DE RESPUESTA */}
              <div className="ai-response-card">
                <div className="response-header">
                  <span>{isGenerating ? "⏳ Analizando estructura financiera..." : "💡 Diagnóstico & Recomendación Estratégica:"}</span>
                  {aiResponse && (
                    <button
                      type="button"
                      onClick={() => handleRunAi("viability")}
                      style={{ background: "none", border: "none", color: "var(--bcc-blue-text)", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700 }}
                    >
                      🔄 Regenerar
                    </button>
                  )}
                </div>

                {isGenerating ? (
                  <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                    <p>Consultando inteligencia financiera para el Módulo {currentModule.name}...</p>
                  </div>
                ) : (
                  <pre className="advice-pre">
                    {aiResponse || "Haz clic en uno de los botones de análisis para obtener el diagnóstico del Copilot."}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER DEL DRAWER */}
        <div className="drawer-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            ✓ Aplicar y Ver en Canvas
          </button>
        </div>
      </div>
    </div>
  );
}
