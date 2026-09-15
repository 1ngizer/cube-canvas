import React, { useState, useEffect } from "react";
import { queryAiCopilot } from "../utils/aiService";

export default function AiSettingsModal({ isOpen, onClose, state, metrics, onSaveSuccess }) {
  const [provider, setProvider] = useState("gemini");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }

  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      const storedProvider = localStorage.getItem("bcc_ai_provider") || "gemini";
      const storedKey = localStorage.getItem("bcc_ai_api_key") || "";
      setProvider(storedProvider);
      setApiKey(storedKey);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("bcc_ai_provider", provider);
      if (provider === "local") {
        localStorage.removeItem("bcc_ai_api_key");
      } else {
        localStorage.setItem("bcc_ai_api_key", apiKey.trim());
      }
    }
    if (onSaveSuccess) onSaveSuccess();
    onClose();
  };

  const handleClear = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("bcc_ai_api_key");
      localStorage.setItem("bcc_ai_provider", "local");
    }
    setApiKey("");
    setProvider("local");
    setTestResult({
      success: true,
      message: "Clave eliminada. Ahora se usará el Motor Heurístico Experto Offline.",
    });
  };

  const handleTestConnection = async () => {
    if (provider === "local") {
      setTestResult({
        success: true,
        message: "✅ Motor Heurístico Experto Local verificado y listo para operar sin conexión.",
      });
      return;
    }

    if (!apiKey.trim()) {
      setTestResult({
        success: false,
        message: "⚠️ Por favor ingresa una API Key para probar la conexión.",
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const sampleState = state || {
        name: "Test Negocio",
        requirements: { production: { a: 150000000 } },
      };
      const sampleMetrics = metrics || {
        operatingProfit: 15000000,
        totalMonthlyDebtService: 7500000,
        coverageRatio: 2.0,
      };

      const res = await queryAiCopilot({
        provider,
        apiKey: apiKey.trim(),
        moduleId: "1A",
        state: sampleState,
        metrics: sampleMetrics,
        query: "Prueba rápida de validación de credencial API.",
      });

      if (res && !res.includes("Modo Offline Activado")) {
        setTestResult({
          success: true,
          message: `✅ ¡Conexión exitosa con ${provider === "gemini" ? "Google Gemini 2.5 Flash" : "OpenAI GPT-4o-mini"}! La IA responderá en tiempo real a tus consultas.`,
        });
      } else {
        setTestResult({
          success: false,
          message: `⚠️ La API retornó una respuesta offline. Revisa la clave ingresada (${res.slice(0, 120)}...)`,
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: `❌ Error al conectar: ${err.message}`,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="modal-backdrop-simple no-print" onClick={onClose}>
      <div className="modal-dialog-box ai-settings-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <div className="ai-modal-title-group">
            <span className="ai-brand-badge">🤖 GIZER IA</span>
            <h3>Configuración de Asistente Financiero</h3>
          </div>
          <button type="button" className="close-drawer-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <p className="ai-modal-desc">
          Cube Canvas incluye un copiloto financiero con análisis en tiempo real de viabilidad,
          riesgos de liquidez y estructura de capital stack. Puedes conectar tu propio modelo LLM
          o usar el motor heurístico offline gratuito.
        </p>

        {/* SELECCIÓN DE PROVEEDOR */}
        <div className="form-group" style={{ marginTop: "1rem" }}>
          <label className="field-label">Proveedor de Inteligencia Artificial:</label>
          <div className="ai-provider-grid">
            <label className={`ai-provider-card ${provider === "gemini" ? "active" : ""}`}>
              <input
                type="radio"
                name="provider"
                value="gemini"
                checked={provider === "gemini"}
                onChange={(e) => setProvider(e.target.value)}
              />
              <div className="provider-info">
                <span className="provider-name">Google Gemini 2.5 Flash</span>
                <span className="provider-badge rec">Recomendado</span>
                <p className="provider-sub">Ultra rápido, 1M contexto, ideal para finanzas complejas.</p>
              </div>
            </label>

            <label className={`ai-provider-card ${provider === "openai" ? "active" : ""}`}>
              <input
                type="radio"
                name="provider"
                value="openai"
                checked={provider === "openai"}
                onChange={(e) => setProvider(e.target.value)}
              />
              <div className="provider-info">
                <span className="provider-name">OpenAI GPT-4o-mini</span>
                <span className="provider-badge">OpenAI</span>
                <p className="provider-sub">Excelente razonamiento analítico y estructuración estratégica.</p>
              </div>
            </label>

            <label className={`ai-provider-card ${provider === "local" ? "active" : ""}`}>
              <input
                type="radio"
                name="provider"
                value="local"
                checked={provider === "local"}
                onChange={(e) => setProvider(e.target.value)}
              />
              <div className="provider-info">
                <span className="provider-name">Motor Heurístico Local</span>
                <span className="provider-badge offline">Offline / Gratuito</span>
                <p className="provider-sub">Funciona sin internet ni claves usando reglas financieras maestras.</p>
              </div>
            </label>
          </div>
        </div>

        {/* CAMPO DE API KEY */}
        {provider !== "local" && (
          <div className="form-group" style={{ marginTop: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="field-label">
                API Key de {provider === "gemini" ? "Google Gemini" : "OpenAI"}:
              </label>
              <button
                type="button"
                className="toggle-key-btn"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <input
              type={showKey ? "text" : "password"}
              className="input-control"
              placeholder={
                provider === "gemini"
                  ? "Pega tu clave AIzaSy... de Google AI Studio"
                  : "Pega tu clave sk-... de OpenAI"
              }
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <span className="field-hint">
              {provider === "gemini" ? (
                <>
                  Puedes obtener una clave gratuita en{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#0284c7", textDecoration: "underline" }}
                  >
                    Google AI Studio
                  </a>
                  .
                </>
              ) : (
                <>
                  Obtén tu clave en el portal de desarrolladores de{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#0284c7", textDecoration: "underline" }}
                  >
                    OpenAI
                  </a>
                  .
                </>
              )}
            </span>
          </div>
        )}

        {/* MENSAJE DE RESULTADO DE PRUEBA */}
        {testResult && (
          <div className={`ai-test-alert ${testResult.success ? "success" : "warning"}`}>
            {testResult.message}
          </div>
        )}

        <div className="ai-privacy-note">
          🔒 <strong>Seguridad & Privacidad:</strong> Tu clave se guarda exclusivamente en tu navegador (localStorage).
          Nunca viaja a intermediarios ni a servidores de iNGIZER.
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="modal-btn-row" style={{ marginTop: "1rem" }}>
          {provider !== "local" && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleTestConnection}
              disabled={testing}
            >
              {testing ? "Probando..." : "⚡ Probar Conexión"}
            </button>
          )}

          {apiKey && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ color: "#dc2626", borderColor: "#fca5a5" }}
              onClick={handleClear}
            >
              Borrar Clave
            </button>
          )}

          <div style={{ flex: 1 }} />

          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
}
