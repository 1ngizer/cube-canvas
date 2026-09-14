import React, { useState, useMemo, useEffect, useRef } from "react";
import BccCanvas from "./components/BccCanvas";
import ModuleModal from "./components/ModuleModal";
import AiSettingsModal from "./components/AiSettingsModal";
import StressTestModal from "./components/StressTestModal";
import WaterfallModal from "./components/WaterfallModal";
import InvestorPitchModal from "./components/InvestorPitchModal";
import { calculateBccMetrics, formatCurrency } from "./utils/finance";
import { exportCanvasToExcel } from "./utils/excelExport";

// Escenario Maestro: El Caso de la Pizzería (Caja $1M, Horno $150M, Utilidad Proyectada $15M)
const PRESET_PIZZERIA_CASE = {
  id: "pizzeria_case",
  name: "Caso Pizzería: Expansión Horno $150M",
  nsmGoal: "10X",
  targetCustomer: "Familias y ejecutivos de la zona",
  valueProposition: "Pizza artesanal horneada a la piedra en menos de 10 minutos",
  cashData: {
    cashOnHand: 1000000,
    bankAccounts: 2000000,
    platforms: 1500000,
    receivables: 1000000,
  },
  products: [
    { id: "P1", name: "Pizza Artesanal a la Piedra", income: 25000000, custom: 0, consumption: 850, growth: 35 },
    { id: "P2", name: "Línea de Cafetería & Bebidas", income: 7000000, custom: 0, consumption: 1100, growth: 20 },
    { id: "P3", name: "Combos Ejecutivos & Delivery", income: 6000000, custom: 0, consumption: 350, growth: 50 },
    { id: "P4", name: "Postres & Entradas", income: 0, custom: 0, consumption: 0, growth: 0 },
    { id: "P5", name: "Eventos Institucionales", income: 0, custom: 0, consumption: 0, growth: 0 },
  ],
  requirements: {
    production: { w: 7500000, a: 150000000, ss: 3000000 }, // El Horno $150M en (A)
    marketing: { w: 2000000, a: 0, ss: 1500000 },
    support: { w: 1000000, a: 0, ss: 500000 },
    administration: { w: 2500000, a: 0, ss: 1000000 },
    development: { w: 1000000, a: 0, ss: 500000 },
  },
  cogsData: {
    P1: 5500000,
    P2: 1500000,
    P3: 1500000,
  },
  fundingSources: {
    masterEquity: 5000000,
    teamContributions: 0,
    bankLoan: 0,
    bankRateEA: 20,
    bankTermMonths: 36,
    assetInvestorCapital: 150000000, // Inversionista que financia el horno
    assetInvestorTermMonths: 24,
    assetInvestorReturnPercent: 15,
    equityInvestorCapital: 0,
    equityOfferedPercent: 0,
  },
};

const PRESET_CONSERVATIVE_CASE = {
  id: "conservative_case",
  name: "Caso Defensivo: Crédito Bancario Menor",
  nsmGoal: "3X",
  targetCustomer: "Clientes locales",
  valueProposition: "Punto de venta tradicional",
  cashData: {
    cashOnHand: 2000000,
    bankAccounts: 1000000,
    platforms: 500000,
    receivables: 500000,
  },
  products: [
    { id: "P1", name: "Pizzas Clásicas", income: 18000000, custom: 0, consumption: 600, growth: 10 },
    { id: "P2", name: "Bebidas", income: 4000000, custom: 0, consumption: 500, growth: 10 },
  ],
  requirements: {
    production: { w: 6000000, a: 40000000, ss: 2000000 },
    marketing: { w: 1000000, a: 0, ss: 500000 },
    support: { w: 500000, a: 0, ss: 500000 },
    administration: { w: 1500000, a: 0, ss: 500000 },
    development: { w: 0, a: 0, ss: 0 },
  },
  cogsData: {
    P1: 4500000,
    P2: 1000000,
  },
  fundingSources: {
    masterEquity: 3000000,
    teamContributions: 0,
    bankLoan: 40000000,
    bankRateEA: 22,
    bankTermMonths: 36,
    assetInvestorCapital: 0,
    assetInvestorTermMonths: 24,
    assetInvestorReturnPercent: 15,
    equityInvestorCapital: 0,
    equityOfferedPercent: 0,
  },
};

// Plantilla en blanco para cualquier nuevo negocio
const EMPTY_CANVAS_TEMPLATE = {
  id: "empty_template",
  name: "Mi Nuevo Proyecto",
  nsmGoal: "10X",
  targetCustomer: "Segmento de mercado objetivo",
  valueProposition: "Propuesta de valor diferenciada",
  cashData: {
    cashOnHand: 0,
    bankAccounts: 0,
    platforms: 0,
    receivables: 0,
  },
  products: [
    { id: "P1", name: "Producto Principal", income: 0, custom: 0, consumption: 0, growth: 0 },
  ],
  requirements: {
    production: { w: 0, a: 0, ss: 0 },
    marketing: { w: 0, a: 0, ss: 0 },
    support: { w: 0, a: 0, ss: 0 },
    administration: { w: 0, a: 0, ss: 0 },
    development: { w: 0, a: 0, ss: 0 },
  },
  cogsData: {
    P1: 0,
  },
  fundingSources: {
    masterEquity: 0,
    teamContributions: 0,
    bankLoan: 0,
    bankRateEA: 20,
    bankTermMonths: 36,
    assetInvestorCapital: 0,
    assetInvestorTermMonths: 24,
    assetInvestorReturnPercent: 15,
    equityInvestorCapital: 0,
    equityOfferedPercent: 0,
  },
};

const STORAGE_KEY = "bcc_canvas_custom_simulations";

export default function App() {
  const [canvasState, setCanvasState] = useState(PRESET_PIZZERIA_CASE);
  const [activeModule, setActiveModule] = useState(null); // ID del módulo abierto en el drawer
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [scenarioNameInput, setScenarioNameInput] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showAiSettingsModal, setShowAiSettingsModal] = useState(false);
  const [showStressModal, setShowStressModal] = useState(false);
  const [showWaterfallModal, setShowWaterfallModal] = useState(false);
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const fileInputRef = useRef(null);
  const [hasAiKey, setHasAiKey] = useState(false);

  // Comprobar estado de configuración de IA
  const checkAiConfig = () => {
    if (typeof window !== "undefined") {
      const p = localStorage.getItem("bcc_ai_provider") || "gemini";
      const k = localStorage.getItem("bcc_ai_api_key") || "";
      setHasAiKey(p === "local" || !!k.trim());
    }
  };

  // Cargar simulaciones guardadas de localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedScenarios(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Error leyendo localStorage:", e);
    }
    checkAiConfig();
  }, []);

  const saveToLocal = (list) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error("Error guardando:", e);
    }
  };

  // Cálculo financiero dinámico en tiempo real
  const metrics = useMemo(() => {
    return calculateBccMetrics(canvasState);
  }, [canvasState]);

  const handleSelectScenario = (e) => {
    const val = e.target.value;
    if (val === "pizzeria_case") {
      setCanvasState(PRESET_PIZZERIA_CASE);
    } else if (val === "conservative_case") {
      setCanvasState(PRESET_CONSERVATIVE_CASE);
    } else {
      const found = savedScenarios.find((s) => s.id === val);
      if (found) setCanvasState(found);
    }
  };

  const handleSaveScenario = () => {
    if (!scenarioNameInput.trim()) return;
    const newScen = {
      ...canvasState,
      id: `custom_${Date.now()}`,
      name: scenarioNameInput.trim(),
    };
    const updated = [...savedScenarios, newScen];
    setSavedScenarios(updated);
    saveToLocal(updated);
    setScenarioNameInput("");
    setShowSaveModal(false);
  };

  const handleCreateNewProject = () => {
    const name = newProjectName.trim() || "Nuevo Negocio";
    const newProj = {
      ...EMPTY_CANVAS_TEMPLATE,
      id: `custom_${Date.now()}`,
      name,
    };
    setCanvasState(newProj);
    const updated = [...savedScenarios, newProj];
    setSavedScenarios(updated);
    saveToLocal(updated);
    setNewProjectName("");
    setShowNewModal(false);
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(canvasState, null, 2));
    const downloadAnchor = document.createElement("a");
    const filename = `bcc_${(canvasState.name || "simulacion").toLowerCase().replace(/[^a-z0-9]/g, "_")}.json`;
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed && typeof parsed === "object" && parsed.cashData && parsed.requirements) {
          const importedProject = {
            ...parsed,
            id: `imported_${Date.now()}`,
            name: parsed.name || file.name.replace(".json", ""),
          };
          setCanvasState(importedProject);
          const updated = [...savedScenarios, importedProject];
          setSavedScenarios(updated);
          saveToLocal(updated);
          alert(`✅ Simulación "${importedProject.name}" importada exitosamente.`);
        } else {
          alert("⚠️ El archivo JSON no tiene la estructura compatible de Cube Canvas (BCC).");
        }
      } catch (err) {
        alert(`❌ Error al leer el archivo JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bcc-app-container">
      {/* BARRA DE HERRAMIENTAS SUPERIOR */}
      <header className="bcc-top-navbar no-print">
        <div className="nav-brand-section">
          <div className="ingizer-badge">iNGIZER</div>
          <h1 className="nav-main-title">Business Cube Commands (BCC)</h1>
          <span className="nav-tagline">Growth & Capital Stack Canvas</span>
        </div>

        <div className="nav-actions-section">
          {/* ACCESO RÁPIDO A MÓDULOS DE ENTRADA (1A..4C) */}
          <div className="nav-modules-dropdown-wrap">
            <select
              className="scenario-select"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  setActiveModule(e.target.value);
                }
              }}
              title="Abrir módulo de trabajo estructurado"
            >
              <option value="">📑 Ir a Módulo (1A..4C)...</option>
              <optgroup label="1. Estrategia & Ventas">
                <option value="1A">[1A] North Star Metric (NSM) & OKRs</option>
                <option value="1B">[1B] Disponibilidad de Caja & Cartera</option>
                <option value="1D">[1D] Catálogo de Productos (P1..P9)</option>
              </optgroup>
              <optgroup label="2. Costos & Inversión">
                <option value="2A">[2A] Runway & Quemado de Caja</option>
                <option value="2C">[2C] Requerimientos de Inversión (W, A, SS)</option>
              </optgroup>
              <optgroup label="3. Bootstrapping">
                <option value="3A">[3A] Master (Aportes del Fundador)</option>
                <option value="3B">[3B] Volunteer (Horas de Mentoría)</option>
                <option value="3C">[3C] Team (Aportes del Equipo)</option>
              </optgroup>
              <optgroup label="4. Blitzscaling (Capital Stack)">
                <option value="4A">[4A] Inversionista de Equity (Acciones)</option>
                <option value="4B">[4B] Inversor de Activo (Caso Horno $150M)</option>
                <option value="4C">[4C] Crédito Bancario (Amortización)</option>
              </optgroup>
            </select>
          </div>

          <button
            type="button"
            className="nav-btn btn-new"
            onClick={() => setShowNewModal(true)}
            title="Crear un nuevo proyecto o lienzo en blanco"
          >
            ➕ Nuevo
          </button>

          <div className="scenario-selector-wrap">
            <label>Escenario:</label>
            <select
              className="scenario-select"
              value={canvasState.id}
              onChange={handleSelectScenario}
            >
              <optgroup label="Casos de Estudio">
                <option value="pizzeria_case">🍕 Caso Pizzería (Horno $150M)</option>
                <option value="conservative_case">🛡️ Caso Defensivo (Crédito Menor)</option>
              </optgroup>
              {savedScenarios.length > 0 && (
                <optgroup label="Mis Simulaciones">
                  {savedScenarios.map((s) => (
                    <option key={s.id} value={s.id}>
                      💾 {s.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <button
            type="button"
            className="nav-btn btn-save"
            onClick={() => setShowSaveModal(true)}
            title="Guardar escenario en navegador"
          >
            💾 Guardar
          </button>

          <button
            type="button"
            className="nav-btn btn-io"
            onClick={handleExportJson}
            title="Exportar simulación completa como archivo JSON"
          >
            📥 Exportar
          </button>

          <button
            type="button"
            className="nav-btn btn-io"
            onClick={handleImportClick}
            title="Importar simulación desde archivo JSON"
          >
            📤 Importar
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          <button
            type="button"
            className="nav-btn btn-ai-nav"
            onClick={() => setShowAiSettingsModal(true)}
            title="Configurar Copilot Financiero IA (Gemini, OpenAI o Modo Offline)"
          >
            🤖 Copilot IA
            <span
              className="ai-status-dot"
              style={{ backgroundColor: hasAiKey ? "#10b981" : "#f59e0b" }}
              title={hasAiKey ? "IA activa y lista" : "Sin clave (usando modo heurístico offline)"}
            />
          </button>

          <button
            type="button"
            className="nav-btn btn-waterfall"
            onClick={() => setShowWaterfallModal(true)}
            title="Ver cascada interactiva de flujo de caja: Ventas -> Costos -> Utilidad -> Deuda -> Caja Libre"
          >
            🌊 Cascada
          </button>

          <button
            type="button"
            className="nav-btn btn-pitch"
            onClick={() => setShowPitchModal(true)}
            title="Ficha ejecutiva y One-Pager para comités de crédito, bancos e inversionistas"
          >
            🎯 One-Pager
          </button>

          <button
            type="button"
            className="nav-btn btn-stress"
            onClick={() => setShowStressModal(true)}
            title="Simulador de estrés: fluctuaciones de demanda, punto de equilibrio y comparador de alternativas de financiación"
          >
            ⚡ Sensibilidad
          </button>

          <button
            type="button"
            className="nav-btn btn-excel"
            onClick={() => exportCanvasToExcel(canvasState)}
            title="Exportar libro completo a Excel (.xlsx) con fórmulas, requerimientos 2C y amortización"
          >
            📊 Excel (.xlsx)
          </button>

          <button
            type="button"
            className="nav-btn btn-pdf"
            onClick={handlePrint}
            title="Exportar canvas a PDF o imprimir"
          >
            🖨️ PDF
          </button>
        </div>
      </header>

      {/* MODAL GUARDAR SIMULACIÓN */}
      {showSaveModal && (
        <div className="modal-backdrop-simple no-print" onClick={() => setShowSaveModal(false)}>
          <div className="modal-dialog-box" onClick={(e) => e.stopPropagation()}>
            <h3>Guardar Simulación Actual</h3>
            <p>Ingresa un nombre para recordar este plan de crecimiento:</p>
            <input
              type="text"
              className="input-control"
              placeholder="Ej. Plan Pizzería 2026 con Horno Italiano"
              value={scenarioNameInput}
              autoFocus
              onChange={(e) => setScenarioNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveScenario()}
            />
            <div className="modal-btn-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowSaveModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveScenario}
                disabled={!scenarioNameInput.trim()}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO PROYECTO / LIENZO */}
      {showNewModal && (
        <div className="modal-backdrop-simple no-print" onClick={() => setShowNewModal(false)}>
          <div className="modal-dialog-box" onClick={(e) => e.stopPropagation()}>
            <h3>Crear Nuevo Proyecto / Negocio</h3>
            <p>Inicia un lienzo estructurado en ceros para modelar cualquier empresa o idea:</p>
            <input
              type="text"
              className="input-control"
              placeholder="Ej. Cafetería Especial, Fábrica Textil, Software SaaS"
              value={newProjectName}
              autoFocus
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateNewProject()}
            />
            <div className="modal-btn-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowNewModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateNewProject}
              >
                Crear Lienzo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURACIÓN IA */}
      <AiSettingsModal
        isOpen={showAiSettingsModal}
        onClose={() => {
          setShowAiSettingsModal(false);
          checkAiConfig();
        }}
        state={canvasState}
        metrics={metrics}
        onSaveSuccess={checkAiConfig}
      />

      {/* MODAL SIMULADOR DE ESTRÉS Y SENSIBILIDAD */}
      <StressTestModal
        isOpen={showStressModal}
        onClose={() => setShowStressModal(false)}
        state={canvasState}
        metrics={metrics}
      />

      {/* MODAL FLUJO DE CAJA CASCADA */}
      <WaterfallModal
        isOpen={showWaterfallModal}
        onClose={() => setShowWaterfallModal(false)}
        state={canvasState}
        metrics={metrics}
      />

      {/* MODAL ONE-PAGER INVERSOR */}
      <InvestorPitchModal
        isOpen={showPitchModal}
        onClose={() => setShowPitchModal(false)}
        state={canvasState}
        metrics={metrics}
      />

      {/* LIENZO PRINCIPAL DEL CANVAS BCC (100VH PANTALLA ÚNICA) */}
      <main className="bcc-main-canvas-area">
        <BccCanvas
          state={canvasState}
          metrics={metrics}
          onOpenModule={(modId) => setActiveModule(modId)}
        />
      </main>

      {/* DRAWER / MODAL LATERAL DE ENTRADA INTELIGENTE CON COPILOT IA */}
      {activeModule && (
        <ModuleModal
          moduleId={activeModule}
          state={canvasState}
          metrics={metrics}
          onChange={setCanvasState}
          onClose={() => setActiveModule(null)}
          onOpenAiSettings={() => setShowAiSettingsModal(true)}
        />
      )}

      {/* FOOTER CORPORATIVO COMPACTO */}
      <footer className="bcc-footer-note no-print">
        <span>Business Cube Commands Canvas (BCC) ® • <strong>iNGIZER</strong> Capital Stack Engine</span>
        <span className="footer-legend">🟢 Cobertura saludable &nbsp;|&nbsp; 🟡 Cobertura ajustada &nbsp;|&nbsp; 🔴 Riesgo de liquidez</span>
      </footer>
    </div>
  );
}
