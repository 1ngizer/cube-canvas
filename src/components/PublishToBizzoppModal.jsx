import React, { useState } from "react";
import { formatCurrency, calculateEquityValuation } from "../utils/finance";

const CATEGORIES = [
  "Gastronomía & Alimentos",
  "Tecnología & Software",
  "Manufactura & Industria",
  "Comercio & Retail",
  "Servicios & Consultoría",
  "Salud & Bienestar",
  "Moda & Confección",
  "Agroindustria",
  "Educación & EdTech"
];

const CITIES = [
  "Bogotá D.C.",
  "Medellín",
  "Cali",
  "Barranquilla",
  "Bucaramanga",
  "Cartagena",
  "Pereira",
  "Manizales",
  "Ibagué",
  "Otra / Nacional"
];

const SAMPLE_MEDIA_IMAGES = {
  "Gastronomía & Alimentos": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80",
  "Tecnología & Software": "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&auto=format&fit=crop&q=80",
  "Manufactura & Industria": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80",
  "Comercio & Retail": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80",
  "Servicios & Consultoría": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80",
  "Salud & Bienestar": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80",
  "Moda & Confección": "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&auto=format&fit=crop&q=80",
  "Agroindustria": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop&q=80",
  "Educación & EdTech": "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&auto=format&fit=crop&q=80"
};

export default function PublishToBizzoppModal({ isOpen, onClose, state, metrics }) {
  const [title, setTitle] = useState(state.name || "Mi Proyecto de Expansión");
  const [category, setCategory] = useState("Gastronomía & Alimentos");
  const [city, setCity] = useState("Medellín");
  const [description, setDescription] = useState(
    state.valueProposition || "Oportunidad de inversión estructurada con Cube Canvas (BCC)"
  );
  const [founderName, setFounderName] = useState("Fundador(a) Bizzopp");
  const [founderPhone, setFounderPhone] = useState("");
  const [founderEmail, setFounderEmail] = useState("");
  const [customMediaUrl, setCustomMediaUrl] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(null);
  const [publishError, setPublishError] = useState(null);

  if (!isOpen) return null;

  const capexNeeded = metrics.totalCapexNeeded ?? 0;
  const investmentNeeded = metrics.totalInvestmentNeeded ?? capexNeeded;
  const targetAmount = capexNeeded > 0 ? capexNeeded : (investmentNeeded > 0 ? investmentNeeded : 50000000);
  const operatingProfit = metrics.operatingProfit ?? 0;
  const sales = metrics.totalProductSales ?? 0;
  const dscr = metrics.coverageRatio ?? 0;
  const netFreeCash = metrics.netFreeCashFlow ?? 0;

  const assetDebtTerm = state.fundingSources?.assetInvestorTermMonths || 24;
  const assetDebtReturn = state.fundingSources?.assetInvestorReturnPercent || 15;
  const assetMonthlyPayment =
    metrics.fundingSources?.monthlyAssetPayment ||
    (targetAmount > 0 ? (targetAmount * (1 + assetDebtReturn / 100)) / assetDebtTerm : 0);

  const equityCapital = state.fundingSources?.equityInvestorCapital || targetAmount;
  const equityPct = state.fundingSources?.equityOfferedPercent || 10;
  const equityVal = calculateEquityValuation(equityCapital, equityPct);

  const activeMediaUrl = customMediaUrl.trim() || SAMPLE_MEDIA_IMAGES[category] || SAMPLE_MEDIA_IMAGES["Gastronomía & Alimentos"];

  const handlePublish = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setPublishError(null);

    const payload = {
      title: title.trim(),
      category,
      city,
      description: description.trim(),
      founder_name: founderName.trim(),
      founder_role: "Fundador / Empresario",
      required_amount: targetAmount,
      tir: `${assetDebtReturn}% E.A.`,
      payback: `${Math.round((assetDebtTerm / 12) * 10) / 10} años (${assetDebtTerm} meses)`,
      monthly_sales: formatCurrency(sales),
      media_url: activeMediaUrl,
      financials: [
        { label: "Ventas Mensuales", value: formatCurrency(sales) },
        { label: "Utilidad Operativa (EBITDA)", value: formatCurrency(operatingProfit) },
        { label: "Cobertura de Deuda (DSCR)", value: `${dscr}x` },
        { label: "Cuota Comprometida", value: formatCurrency(assetMonthlyPayment) },
        { label: "Caja Libre Mensual", value: formatCurrency(netFreeCash) }
      ],
      cube_canvas_metadata: {
        source: "Cube Canvas (BCC) Studio",
        scenarioId: state.id,
        nsmGoal: state.nsmGoal,
        targetCustomer: state.targetCustomer,
        dscr: `${dscr}x`,
        publishedAt: new Date().toISOString()
      }
    };

    // Intentar primero el endpoint de producción oficial de Bizzopp, con fallback a Railway
    const endpoints = [
      "https://bizzopp.ingizer.com/api/projects",
      "https://bizzopp-production.up.railway.app/api/projects"
    ];

    let successResponse = null;
    let lastError = null;

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          successResponse = data;
          break;
        } else {
          const errText = await res.text();
          lastError = `HTTP ${res.status}: ${errText.slice(0, 150)}`;
        }
      } catch (fetchErr) {
        lastError = fetchErr.message;
      }
    }

    setIsSubmitting(false);

    if (successResponse) {
      setPublishSuccess(successResponse.project || successResponse);
    } else {
      // Si ambos endpoints fallaron (ej. modo offline o CORS en desarrollo), ofrecer guardado local
      setPublishError(
        `No se pudo conectar directamente con Bizzopp (${lastError || "Error de red"}). Guarda el archivo para sincronización manual o intenta nuevamente.`
      );
    }
  };

  const getWhatsAppShareUrl = () => {
    const text = encodeURIComponent(
      `🚀 OPORTUNIDAD DE INVERSIÓN PUBLICADA EN BIZZOPP:\n` +
      `📌 Empresa: ${title}\n` +
      `📍 Ciudad: ${city} | Categoría: ${category}\n` +
      `💰 Monto Requerido: ${formatCurrency(targetAmount)}\n` +
      `📈 Retorno Proyectado: ${assetDebtReturn}% E.A. | DSCR: ${dscr}x\n` +
      `📲 Ver en Bizzopp Social Feed: https://bizzopp.ingizer.com\n\n` +
      `Modelado y auditado con Cube Canvas (BCC) ®`
    );
    return `https://wa.me/?text=${text}`;
  };

  return (
    <div className="modal-backdrop-simple no-print" onClick={onClose}>
      <div
        className="modal-dialog-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "780px", width: "95vw", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="ai-modal-header" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
          <div className="ai-modal-title-group">
            <span
              className="pitch-badge"
              style={{ background: "linear-gradient(135deg, #10b981, #0284c7)", color: "#fff" }}
            >
              🚀 SINERGIA BIZZOPP
            </span>
            <h3>Publicar Ronda en Bizzopp Social Feed</h3>
          </div>
          <button type="button" className="close-drawer-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {publishSuccess ? (
          <div style={{ padding: "24px 8px", textAlign: "center" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "12px" }}>🎉</div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#065f46", marginBottom: "8px" }}>
              ¡Ronda Publicada Exitosamente en Bizzopp!
            </h2>
            <p style={{ color: "#374151", fontSize: "0.95rem", maxWidth: "560px", margin: "0 auto 20px" }}>
              Tu oportunidad <strong>"{title}"</strong> fue enviada a la red social de inversión de Bizzopp. Ahora los inversionistas registrados podrán descubrir tu proyecto, analizar tus métricas financieras y separar cupo de inversión.
            </p>

            <div
              style={{
                backgroundColor: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "24px",
                textAlign: "left"
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.88rem" }}>
                <div><strong>Folio Asignado:</strong> {publishSuccess.id || "BZZ-" + Date.now().toString().slice(-6)}</div>
                <div><strong>Estado:</strong> <span style={{ color: "#d97706", fontWeight: "700" }}>En Revisión / Aprobación</span></div>
                <div><strong>Monto a Financiar:</strong> {formatCurrency(targetAmount)}</div>
                <div><strong>Retorno Ofrecido:</strong> {assetDebtReturn}% E.A.</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <a
                href="https://bizzopp.ingizer.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{
                  backgroundColor: "#059669",
                  borderColor: "#059669",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 18px",
                  textDecoration: "none",
                  fontWeight: "700"
                }}
              >
                📲 Abrir Bizzopp Social Feed
              </a>

              <a
                href={getWhatsAppShareUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 18px",
                  textDecoration: "none",
                  fontWeight: "600",
                  backgroundColor: "#25d366",
                  color: "#fff",
                  borderColor: "#25d366"
                }}
              >
                💬 Compartir en WhatsApp
              </a>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                style={{ padding: "10px 18px" }}
              >
                Volver al Canvas
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePublish} style={{ marginTop: "16px" }}>
            <p style={{ color: "#4b5563", fontSize: "0.9rem", marginBottom: "16px" }}>
              Transforma tu modelo financiero de <strong>Cube Canvas</strong> en una tarjeta interactiva para el feed de <strong>Bizzopp</strong>. Los inversionistas verán tus números auditados y tu capacidad de pago.
            </p>

            {/* PREVISUALIZACIÓN DE MÉTRICAS EXTRAÍDAS DEL CANVAS */}
            <div
              style={{
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "8px",
                padding: "14px",
                marginBottom: "20px"
              }}
            >
              <div style={{ fontSize: "0.78rem", fontWeight: "800", color: "#1e40af", textTransform: "uppercase", marginBottom: "8px" }}>
                📊 Métricas que se exportarán desde Cube Canvas:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Monto Requerido:</span>
                  <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "1rem" }}>{formatCurrency(targetAmount)}</div>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Ventas Mensuales:</span>
                  <div style={{ fontWeight: "700", color: "#059669", fontSize: "1rem" }}>{formatCurrency(sales)}</div>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>EBITDA Proyectado:</span>
                  <div style={{ fontWeight: "700", color: "#059669", fontSize: "1rem" }}>{formatCurrency(operatingProfit)}</div>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Cobertura DSCR:</span>
                  <div style={{ fontWeight: "700", color: "#2563eb", fontSize: "1rem" }}>{dscr}x</div>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>Retorno Pactado:</span>
                  <div style={{ fontWeight: "700", color: "#d97706", fontSize: "1rem" }}>{assetDebtReturn}% E.A.</div>
                </div>
              </div>
            </div>

            {/* CAMPOS DEL FORMULARIO */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", marginBottom: "4px" }}>
                  Título del Proyecto / Ronda *
                </label>
                <input
                  type="text"
                  className="scenario-select"
                  style={{ width: "100%", padding: "8px 10px" }}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Expansión Pizzería Gourmet - Horno a la Piedra"
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", marginBottom: "4px" }}>
                  Categoría de Industria *
                </label>
                <select
                  className="scenario-select"
                  style={{ width: "100%", padding: "8px 10px" }}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", marginBottom: "4px" }}>
                  Ciudad Principal *
                </label>
                <select
                  className="scenario-select"
                  style={{ width: "100%", padding: "8px 10px" }}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", marginBottom: "4px" }}>
                  Descripción de la Propuesta de Valor (Pitch para Inversionistas) *
                </label>
                <textarea
                  className="scenario-select"
                  style={{ width: "100%", padding: "8px 10px", minHeight: "80px", fontFamily: "inherit" }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe por qué tu negocio es rentable, qué activo vas a adquirir y cómo devolverás la inversión..."
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", marginBottom: "4px" }}>
                  Nombre del Fundador(a) / Contacto
                </label>
                <input
                  type="text"
                  className="scenario-select"
                  style={{ width: "100%", padding: "8px 10px" }}
                  value={founderName}
                  onChange={(e) => setFounderName(e.target.value)}
                  placeholder="Ej: John Ochoa"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", marginBottom: "4px" }}>
                  WhatsApp / Celular de Contacto
                </label>
                <input
                  type="tel"
                  className="scenario-select"
                  style={{ width: "100%", padding: "8px 10px" }}
                  value={founderPhone}
                  onChange={(e) => setFounderPhone(e.target.value)}
                  placeholder="+57 300 123 4567"
                />
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", marginBottom: "4px" }}>
                  URL de Imagen o Video del Negocio (Opcional)
                </label>
                <input
                  type="url"
                  className="scenario-select"
                  style={{ width: "100%", padding: "8px 10px" }}
                  value={customMediaUrl}
                  onChange={(e) => setCustomMediaUrl(e.target.value)}
                  placeholder="https://... (deja vacío para usar foto sugerida de la categoría)"
                />
              </div>
            </div>

            {publishError && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #f87171",
                  borderRadius: "6px",
                  padding: "10px 14px",
                  color: "#991b1b",
                  fontSize: "0.85rem",
                  marginBottom: "16px"
                }}
              >
                ⚠️ {publishError}
              </div>
            )}

            {/* BOTONES DE ACCIÓN */}
            <div className="modal-btn-row" style={{ marginTop: "16px" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{
                  backgroundColor: "#059669",
                  borderColor: "#059669",
                  padding: "10px 20px",
                  fontWeight: "700",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                {isSubmitting ? "⏳ Publicando en Bizzopp..." : "🚀 Confirmar y Publicar en Bizzopp Feed"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
                style={{ padding: "10px 18px" }}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
