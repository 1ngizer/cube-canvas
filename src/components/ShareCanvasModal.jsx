import React, { useState } from "react";
import { generateShareUrl } from "../services/supabase";
import { formatCurrency } from "../utils/finance";

export default function ShareCanvasModal({ isOpen, onClose, state, metrics }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = generateShareUrl(state) || "";
  const capexNeeded = metrics.totalCapexNeeded ?? 0;
  const targetAmount = capexNeeded > 0 ? capexNeeded : (metrics.totalInvestmentNeeded ?? 50000000);
  const dscr = metrics.coverageRatio ?? 0;
  const sales = metrics.totalProductSales ?? 0;
  const ebitda = metrics.operatingProfit ?? 0;
  const debtReturn = state.fundingSources?.assetInvestorReturnPercent || 15;

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getWhatsAppShareUrl = () => {
    const text = encodeURIComponent(
      `📊 MODELO FINANCIERO & DUE DILIGENCE — ${state.name}\n\n` +
      `Te comparto nuestro modelo de crecimiento y capacidad de pago estructurado en Cube Canvas:\n\n` +
      `💰 Requerimiento de Capital: ${formatCurrency(targetAmount)}\n` +
      `📈 Ventas Proyectadas: ${formatCurrency(sales)} / mes\n` +
      `💵 Utilidad Operativa (EBITDA): ${formatCurrency(ebitda)} / mes\n` +
      `🛡️ Cobertura de Deuda (DSCR): ${dscr}x\n` +
      `🎯 Retorno Propuesto: ${debtReturn}% E.A.\n\n` +
      `🔍 Puedes auditar el modelo completo en vivo y probar escenarios aquí:\n` +
      `${shareUrl}`
    );
    return `https://wa.me/?text=${text}`;
  };

  return (
    <div className="modal-backdrop-simple no-print" onClick={onClose}>
      <div
        className="modal-dialog-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "680px", width: "95vw" }}
      >
        <div className="ai-modal-header" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
          <div className="ai-modal-title-group">
            <span
              className="pitch-badge"
              style={{ background: "linear-gradient(135deg, #0284c7, #6366f1)", color: "#fff" }}
            >
              🔗 ENLACE PÚBLICO
            </span>
            <h3>Compartir Modelo Financiero con Inversionistas</h3>
          </div>
          <button type="button" className="close-drawer-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{ marginTop: "16px" }}>
          <p style={{ color: "#475569", fontSize: "0.92rem", lineHeight: "1.45", marginBottom: "16px" }}>
            Genera un enlace público e instantáneo para que inversionistas, socios o comités de crédito puedan auditar tu simulación financiera en tiempo real desde cualquier dispositivo.
          </p>

          {/* CAJA DE ENLACE */}
          <div
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "12px 14px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <input
              type="text"
              readOnly
              value={shareUrl}
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                color: "#0f172a",
                fontSize: "0.85rem",
                fontFamily: "monospace",
                outline: "none",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
              onClick={(e) => e.target.select()}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCopyLink}
              style={{ padding: "8px 14px", fontSize: "0.85rem", fontWeight: "700", whiteSpace: "nowrap" }}
            >
              {copied ? "✅ ¡Copiado!" : "📋 Copiar Enlace"}
            </button>
          </div>

          {/* RESUMEN DE CIFRAS QUE VERÁ EL INVERSIONISTA */}
          <div
            style={{
              backgroundColor: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "8px",
              padding: "14px",
              marginBottom: "18px"
            }}
          >
            <div style={{ fontSize: "0.8rem", fontWeight: "800", color: "#1e40af", marginBottom: "8px" }}>
              👁️ RESUMEN QUE VERÁ EL INVERSIONISTA AL ABRIR ESTE ENLACE:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", fontSize: "0.88rem" }}>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>Empresa / Proyecto</span>
                <strong>{state.name}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>Monto Requerido</span>
                <strong>{formatCurrency(targetAmount)}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>Cobertura DSCR</span>
                <strong style={{ color: "#2563eb" }}>{dscr}x</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>Ventas Mensuales</span>
                <strong style={{ color: "#059669" }}>{formatCurrency(sales)}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>EBITDA Proyectado</span>
                <strong style={{ color: "#059669" }}>{formatCurrency(ebitda)}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block" }}>Retorno Estimado</span>
                <strong style={{ color: "#d97706" }}>{debtReturn}% E.A.</strong>
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: "0.82rem",
              color: "#64748b",
              backgroundColor: "#f1f5f9",
              padding: "10px 14px",
              borderRadius: "6px",
              marginBottom: "20px"
            }}
          >
            🔒 <strong>Modo Seguro:</strong> El enlace abre el modelo en modo de solo lectura para el destinatario. Cualquier modificación que realice el visitante no alterará tu modelo original, pero le permitirá clonarlo para simular variaciones de inversión.
          </div>

          {/* BOTONES */}
          <div className="modal-btn-row">
            <a
              href={getWhatsAppShareUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "#25d366",
                color: "#fff",
                borderColor: "#25d366",
                fontWeight: "700",
                textDecoration: "none",
                padding: "10px 18px"
              }}
            >
              💬 Enviar por WhatsApp
            </a>

            <div style={{ flex: 1 }} />

            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: "10px 18px" }}>
              Listo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
