import React, { useState, useEffect } from "react";
import { queryAiCopilot } from "../utils/aiService";

export default function AiSettingsModal({ isOpen, onClose, state, metrics, onSaveSuccess }) {
  const [provider, setProvider] = useState("server");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }
  const [dataConsent, setDataConsent] = useState(true);

  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      const storedProvider = localStorage.getItem("bcc_ai_provider") || "server";
      const storedKey = localStorage.getItem("bcc_ai_api_key") || "";
      const storedConsent = localStorage.getItem("bcc_ai_data_consent") !== "false";
      setProvider(storedProvider);
      setApiKey(storedKey);
      setDataConsent(storedConsent);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (provider !== "local" && !dataConsent) {
      setTestResult({
        success: false,
        message: "⚠️ Debes marcar la casilla de consentimiento de privacidad para consultar el copiloto IA, o seleccionar el 'Motor Heurístico Local' offline.",
      });
      return;
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("bcc_ai_provider", provider);
      localStorage.setItem("bcc_ai_data_consent", String(dataConsent));
      if (provider === "local" || provider === "server") {
        if (provider === "local") {
          localStorage.removeItem("bcc_ai_api_key");
        }
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
      localStorage.setItem("bcc_ai_provider", "server");
    }
    setApiKey("");
    setProvider("server");
    setTestResult({
      success: true,
      message: "Clave personal eliminada. Se usará el Servidor iNGIZER Cloud o el Motor Heurístico de respaldo.",
    });
  };

  const handleTestConnection = async () => {
    if (provider === "local") {
      setTestResult({
        success: true,
        message: "✅ Motor Heurístico Experto Local verificado y listo para operar 100% offline sin conexión.",
      });
      return;
    }

    if (provider === "server") {
      setTesting(true);
      setTestResult(null);
      try {
        const res = await fetch("/api/ai/copilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: "Test de conectividad. Responde en 1 sola frase corta indicando que estás listo.",
            provider: "server"
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.text) {
            setTestResult({
              success: true,
              message: `✅ ¡Conexión con el Servidor iNGIZER Cloud exitosa! (${data.provider || "Proxy Activo"}). El Copilot responderá automáticamente.`,
            });
          } else if (data.error === "no_server_key") {
            setTestResult({
              success: false,
              message: "ℹ️ El servidor está en línea pero no tiene configurada GEMINI_API_KEY en Railway. Puedes ingresar tu clave personal seleccionando Google Gemini / OpenAI o continuar con el motor heurístico.",
            });
          } else {
            setTestResult({
              success: false,
              message: `⚠️ Servidor respondió: ${data.message || data.error || "Estado no disponible"}`,
            });
          }
        } else {
          setTestResult({
            success: false,
            message: `❌ Error del servidor: HTTP ${res.status}`,
          });
        }
      } catch (err) {
        setTestResult({
          success: false,
          message: `❌ Error al conectar con el servidor: ${err.message}`,
        });
      } finally {
        setTesting(false);
      }
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
          riesgos de liquidez y estructura de capital stack. Puedes usar la IA en la nube de iNGIZER,
          conectar tu propia clave (BYOK) o usar el motor heurístico offline gratuito.
        </p>

        {/* SELECCIÓN DE PROVEEDOR */}
        <div className="form-group" style={{ marginTop: "1rem" }}>
          <label className="field-label">Proveedor de Inteligencia Artificial:</label>
          <div className="ai-provider-grid">
            <label className={`ai-provider-card ${provider === "server" ? "active" : ""}`}>
              <input
                type="radio"
                name="provider"
                value="server"
                checked={provider === "server"}
                onChange={(e) => setProvider(e.target.value)}
              />
              <div className="provider-info">
                <span className="provider-name">🤖 Servidor iNGIZER Cloud</span>
                <span className="provider-badge rec">Recomendado</span>
                <p className="provider-sub">Conexión automática y segura sin necesidad de ingresar claves en el navegador.</p>
              </div>
            </label>

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
                <span className="provider-badge">BYOK Gemini</span>
                <p className="provider-sub">Ultra rápido, 1M contexto, usando tu propia clave de Google AI Studio.</p>
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
                <span className="provider-badge">BYOK OpenAI</span>
                <p className="provider-sub">Excelente razonamiento analítico con tu propia clave de OpenAI.</p>
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

        {/* MENSAJE EXPLICATIVO SI ES SERVIDOR */}
        {provider === "server" && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", padding: "10px 12px", marginTop: "0.75rem", fontSize: "0.82rem", color: "#166534" }}>
            🛡️ <strong>Modo Proxy Seguro:</strong> Las consultas se ejecutan a través de <code>/api/ai/copilot</code> en el backend de Railway. Tus credenciales no se exponen al cliente.
          </div>
        )}

        {/* CAMPO DE API KEY (SOLO BYOK GEMINI U OPENAI) */}
        {(provider === "gemini" || provider === "openai") && (
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

        {/* CONSENTIMIENTO INFORMADO DE PRIVACIDAD (SEC-03) */}
        {provider !== "local" && (
          <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "10px 12px", marginTop: "10px" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.76rem", color: "#334155", cursor: "pointer", margin: 0 }}>
              <input
                type="checkbox"
                checked={dataConsent}
                onChange={(e) => setDataConsent(e.target.checked)}
                style={{ marginTop: "2px" }}
              />
              <span>
                <strong>Acepto compartir las métricas financieras del lienzo con el copiloto ({provider === "server" ? "Servidor iNGIZER Cloud" : provider === "gemini" ? "Google Gemini" : "OpenAI"}).</strong> Entiendo que las cifras de ventas, costos, caja y deuda se enviarán en el prompt para generar el diagnóstico financiero.
              </span>
            </label>
          </div>
        )}

        <div className="ai-privacy-note">
          🔒 <strong>Seguridad & Privacidad:</strong> En modo servidor las claves residen en Railway. En modo BYOK tu clave se almacena exclusivamente en tu navegador (localStorage).
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
