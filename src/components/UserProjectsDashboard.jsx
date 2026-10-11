import React, { useState, useEffect } from "react";
import {
  supabase,
  getUserProfile,
  getCloudCanvases,
  saveCanvasToCloud,
  deleteCloudCanvas,
  duplicateCloudCanvas,
  generateShareUrl,
} from "../services/supabase";
import { SECTOR_TEMPLATES } from "../utils/sectorTemplates";
import { formatCurrency, calculateBccMetrics } from "../utils/finance";

export default function UserProjectsDashboard({
  isOpen,
  onClose,
  currentCanvas,
  onSelectCanvas,
  onOpenNewProject,
  onOpenWizard,
  onOpenDossier,
  onOpenPublish,
}) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [cloudCanvases, setCloudCanvases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("my_projects"); // 'my_projects' | 'sector_templates' | 'auth'
  const [message, setMessage] = useState(null);

  // Formulario auth
  const [authMode, setAuthMode] = useState("login"); // 'login' | 'signup'
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [companyNameInput, setCompanyNameInput] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    loadUserData();
  }, [isOpen]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userProf = await getUserProfile();
      if (userProf) {
        setUser(userProf);
        setProfile(userProf.profile || null);
        const list = await getCloudCanvases();
        setCloudCanvases(list);
      } else {
        setUser(null);
        setProfile(null);
        // Cargar desde localStorage como respaldo si no hay sesión
        loadLocalCanvases();
      }
    } catch (e) {
      console.warn("Error cargando perfil o proyectos:", e);
      loadLocalCanvases();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalCanvases = () => {
    try {
      const stored = localStorage.getItem("bcc_canvas_custom_simulations");
      if (stored) {
        setCloudCanvases(JSON.parse(stored));
      } else {
        setCloudCanvases([]);
      }
    } catch (e) {
      setCloudCanvases([]);
    }
  };

  const handleGoogleLogin = async () => {
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err) {
      setMessage({ type: "error", text: `Error con Google OAuth: ${err.message}` });
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      if (authMode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;
        setUser(data.user);
        setMessage({ type: "success", text: "¡Sesión iniciada con éxito!" });
        await loadUserData();
        setActiveTab("my_projects");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: {
            data: {
              company_name: companyNameInput.trim() || "Mi Empresa",
            },
          },
        });
        if (error) throw error;
        setUser(data.user);
        setMessage({
          type: "success",
          text: "¡Cuenta creada con éxito! Tus proyectos ahora están respaldados en la nube.",
        });
        await loadUserData();
        setActiveTab("my_projects");
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setMessage({ type: "info", text: "Sesión cerrada. Modo local activo." });
      loadLocalCanvases();
    } catch (e) {
      console.warn("Error cerrando sesión:", e);
    }
  };

  const handleSaveCurrentToCloud = async () => {
    if (!currentCanvas) return;
    try {
      setLoading(true);
      const metrics = calculateBccMetrics(currentCanvas);
      await saveCanvasToCloud(currentCanvas, metrics);
      setMessage({
        type: "success",
        text: `Lienzo "${currentCanvas.name}" sincronizado con éxito en tu cuenta iNGIZER.`,
      });
      await loadUserData();
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (canvas) => {
    try {
      setLoading(true);
      if (user) {
        await duplicateCloudCanvas(canvas);
        await loadUserData();
      } else {
        const duplicated = {
          ...canvas,
          id: `custom_${Date.now()}`,
          name: `${canvas.name || "Proyecto"} (Copia)`,
        };
        const updated = [duplicated, ...cloudCanvases];
        setCloudCanvases(updated);
        localStorage.setItem("bcc_canvas_custom_simulations", JSON.stringify(updated));
      }
      setMessage({ type: "success", text: `Proyecto "${canvas.name}" duplicado con éxito.` });
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (canvasId, canvasName) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar "${canvasName}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      setLoading(true);
      if (user) {
        await deleteCloudCanvas(canvasId);
        await loadUserData();
      } else {
        const updated = cloudCanvases.filter((c) => c.id !== canvasId);
        setCloudCanvases(updated);
        localStorage.setItem("bcc_canvas_custom_simulations", JSON.stringify(updated));
      }
      setMessage({ type: "info", text: `Proyecto "${canvasName}" eliminado.` });
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyShareLink = (canvas) => {
    const url = generateShareUrl(canvas);
    if (url) {
      navigator.clipboard.writeText(url);
      setMessage({ type: "success", text: "🔗 Enlace de auditoría copiado al portapapeles." });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (!isOpen) return null;

  // Filtrado de proyectos por búsqueda
  const filteredProjects = cloudCanvases.filter((p) => {
    const nameMatch = (p.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const sectorMatch = (p.sector || "").toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || sectorMatch;
  });

  // Métricas agregadas
  const totalProjects = cloudCanvases.length;
  const totalCapex = cloudCanvases.reduce((acc, c) => {
    const m = calculateBccMetrics(c);
    return acc + (m.totalCapexNeeded || 0);
  }, 0);
  const viableCount = cloudCanvases.filter((c) => {
    const m = calculateBccMetrics(c);
    return (m.coverageRatioPostTax || m.coverageRatio) >= 1.25;
  }).length;

  return (
    <div className="modal-backdrop-simple user-dashboard-backdrop" onClick={onClose}>
      <div className="modal-dialog-box user-dashboard-dialog" onClick={(e) => e.stopPropagation()}>
        {/* ENCABEZADO Y BRANDING iNGIZER */}
        <div className="user-dashboard-header">
          <div className="user-brand-block">
            <div className="user-ingizer-logo-badge">⬛ iNGIZER</div>
            <div>
              <h2>Panel de Proyectos & Portafolio de Inversión</h2>
              <p className="user-subtitle">
                Business Cube Commands (BCC) • Gestión y Modelación de Capital Stack
              </p>
            </div>
          </div>

          <div className="user-profile-actions">
            {user ? (
              <div className="user-logged-pill">
                <span className="user-status-dot online" />
                <div className="user-info-text">
                  <strong>{profile?.company_name || "Mi Empresa"}</strong>
                  <span className="user-email-text">{user.email}</span>
                </div>
                <button
                  type="button"
                  className="btn-text-logout"
                  onClick={handleSignOut}
                  title="Cerrar sesión iNGIZER"
                >
                  Salir
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-ingizer-auth"
                onClick={() => setActiveTab("auth")}
              >
                🔐 Iniciar Sesión / Cuenta iNGIZER
              </button>
            )}

            <button type="button" className="close-drawer-btn" onClick={onClose} title="Cerrar panel (Esc)">
              ✕
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {message && (
          <div className={`user-feedback-banner ${message.type}`}>
            <span>{message.text}</span>
            <button type="button" onClick={() => setMessage(null)}>✕</button>
          </div>
        )}

        {/* TARJETAS KPI DE RESUMEN */}
        <div className="user-dashboard-kpis">
          <div className="user-kpi-card">
            <span className="kpi-label">Proyectos en Portafolio</span>
            <strong className="kpi-val">{totalProjects}</strong>
            <span className="kpi-sub">{user ? "Sincronizados en Nube iNGIZER" : "Guardados Localmente"}</span>
          </div>
          <div className="user-kpi-card">
            <span className="kpi-label">CAPEX Total Modelado</span>
            <strong className="kpi-val">{formatCurrency(totalCapex, currentCanvas?.currency || "COP")}</strong>
            <span className="kpi-sub">Activos de expansión (A)</span>
          </div>
          <div className="user-kpi-card highlight-kpi">
            <span className="kpi-label">Planes Viables (DSCR &gt; 1.25x)</span>
            <strong className="kpi-val text-green">{viableCount} de {totalProjects}</strong>
            <span className="kpi-sub">Capacidad de repago sólida</span>
          </div>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS */}
        <div className="user-tabs-bar">
          <div className="user-tab-buttons">
            <button
              type="button"
              className={`user-tab-btn ${activeTab === "my_projects" ? "active" : ""}`}
              onClick={() => setActiveTab("my_projects")}
            >
              📁 Mis Proyectos ({filteredProjects.length})
            </button>
            <button
              type="button"
              className={`user-tab-btn ${activeTab === "sector_templates" ? "active" : ""}`}
              onClick={() => setActiveTab("sector_templates")}
            >
              🏛️ Plantillas Sectoriales iNGIZER (5)
            </button>
            <button
              type="button"
              className={`user-tab-btn ${activeTab === "auth" ? "active" : ""}`}
              onClick={() => setActiveTab("auth")}
            >
              ☁️ {user ? "Sincronización en la Nube" : "Vincular Cuenta"}
            </button>
          </div>

          <div className="user-search-wrap">
            <input
              type="text"
              placeholder="🔍 Buscar por nombre o sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="user-search-input"
            />
          </div>
        </div>

        {/* CUERPO DEL PANEL */}
        <div className="user-dashboard-body">
          {/* TAB 1: MIS PROYECTOS */}
          {activeTab === "my_projects" && (
            <div>
              <div className="user-action-header-row">
                <span className="section-hint">
                  {user
                    ? "Tus modelos financieros están respaldados automáticamente en tu base de datos Supabase."
                    : "⚠️ Estás en modo local. Inicia sesión con tu cuenta iNGIZER para sincronizar entre dispositivos."}
                </span>

                <div className="user-quick-buttons">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={handleSaveCurrentToCloud}
                    title="Guardar lienzo activo actual en la nube"
                  >
                    💾 Guardar Lienzo Actual
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-wizard-pill"
                    onClick={() => {
                      onClose();
                      onOpenWizard();
                    }}
                  >
                    ⚡ Asistente 5M
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      onClose();
                      onOpenNewProject();
                    }}
                  >
                    ➕ Nuevo Lienzo
                  </button>
                </div>
              </div>

              {filteredProjects.length === 0 ? (
                <div className="user-empty-state">
                  <span className="empty-icon">📁</span>
                  <h3>No tienes proyectos guardados aún</h3>
                  <p>Inicia modelando tu negocio con el asistente guiado o explora nuestras plantillas sectoriales.</p>
                  <div className="empty-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        onClose();
                        onOpenWizard();
                      }}
                    >
                      ⚡ Iniciar con Asistente 5M
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setActiveTab("sector_templates")}
                    >
                      Explorar Plantillas Sectoriales
                    </button>
                  </div>
                </div>
              ) : (
                <div className="user-project-grid">
                  {filteredProjects.map((proj) => {
                    const m = calculateBccMetrics(proj);
                    const dscr = m.coverageRatioPostTax || m.coverageRatio;
                    const capex = m.totalCapexNeeded || 0;
                    const opProfit = m.operatingProfit || 0;
                    const isViable = dscr >= 1.25 && opProfit > 0;
                    const isAdjusted = dscr >= 1.0 && dscr < 1.25;

                    return (
                      <div key={proj.id} className="user-project-card">
                        <div className="card-top-row">
                          <div>
                            <span className="card-sector-tag">
                              {proj.sector || "General"} • {proj.currency || "COP"}
                            </span>
                            <h4 className="card-project-name">{proj.name}</h4>
                          </div>
                          <span
                            className={`card-viability-badge ${
                              isViable ? "viable" : isAdjusted ? "warning" : "danger"
                            }`}
                          >
                            {isViable ? "🟢 Viable" : isAdjusted ? "🟡 Ajustado" : "🔴 Riesgo"}
                          </span>
                        </div>

                        <p className="card-desc truncate">{proj.valueProposition || "Sin propuesta definida"}</p>

                        <div className="card-metrics-strip">
                          <div className="m-metric">
                            <span className="lbl">Ventas / Mes</span>
                            <span className="val">{formatCurrency(m.totalProductSales, proj.currency)}</span>
                          </div>
                          <div className="m-metric">
                            <span className="lbl">Activo (CAPEX A)</span>
                            <span className="val">{formatCurrency(capex, proj.currency)}</span>
                          </div>
                          <div className="m-metric">
                            <span className="lbl">EBITDA</span>
                            <span className="val green">{formatCurrency(opProfit, proj.currency)}</span>
                          </div>
                          <div className="m-metric">
                            <span className="lbl">DSCR Post-Tax</span>
                            <span className={`val ${dscr >= 1.25 ? "green" : dscr >= 1.0 ? "yellow" : "red"}`}>
                              {dscr}x
                            </span>
                          </div>
                        </div>

                        <div className="card-actions-row">
                          <button
                            type="button"
                            className="btn-card-open"
                            onClick={() => {
                              onSelectCanvas(proj);
                              onClose();
                            }}
                          >
                            ⚡ Abrir en Lienzo
                          </button>

                          <div className="card-action-icons">
                            <button
                              type="button"
                              className="btn-icon"
                              title="Duplicar escenario"
                              onClick={() => handleDuplicate(proj)}
                            >
                              📋
                            </button>
                            <button
                              type="button"
                              className="btn-icon"
                              title="Dossier Bancario Oficial"
                              onClick={() => {
                                onSelectCanvas(proj);
                                onClose();
                                onOpenDossier && onOpenDossier(proj);
                              }}
                            >
                              🏦
                            </button>
                            <button
                              type="button"
                              className="btn-icon"
                              title="Publicar en Bizzopp Social Feed"
                              onClick={() => {
                                onSelectCanvas(proj);
                                onClose();
                                onOpenPublish && onOpenPublish(proj);
                              }}
                            >
                              🚀
                            </button>
                            <button
                              type="button"
                              className="btn-icon"
                              title="Copiar enlace compartible"
                              onClick={() => handleCopyShareLink(proj)}
                            >
                              🔗
                            </button>
                            <button
                              type="button"
                              className="btn-icon text-red"
                              title="Eliminar este proyecto"
                              onClick={() => handleDelete(proj.id, proj.name)}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PLANTILLAS SECTORIALES */}
          {activeTab === "sector_templates" && (
            <div>
              <p className="tab-intro-text">
                Modelos de capital stack pre-validados con economías unitarias reales por industria. Haz clic en "Usar
                Plantilla" para clonarla directamente en tu espacio de trabajo.
              </p>

              <div className="user-project-grid">
                {SECTOR_TEMPLATES.map((tmpl) => {
                  const m = calculateBccMetrics(tmpl);
                  return (
                    <div key={tmpl.id} className="user-project-card template-card">
                      <div className="card-top-row">
                        <div>
                          <span className="card-sector-tag">
                            {tmpl.sector} • {tmpl.currency}
                          </span>
                          <h4 className="card-project-name">{tmpl.name}</h4>
                        </div>
                        <span className="template-badge">PLANTILLA OFICIAL</span>
                      </div>

                      <p className="card-desc">{tmpl.valueProposition}</p>

                      <div className="card-metrics-strip">
                        <div className="m-metric">
                          <span className="lbl">Ventas Base</span>
                          <span className="val">{formatCurrency(m.totalProductSales, tmpl.currency)}</span>
                        </div>
                        <div className="m-metric">
                          <span className="lbl">CAPEX Requerido</span>
                          <span className="val">{formatCurrency(m.totalCapexNeeded, tmpl.currency)}</span>
                        </div>
                        <div className="m-metric">
                          <span className="lbl">EBITDA</span>
                          <span className="val green">{formatCurrency(m.operatingProfit, tmpl.currency)}</span>
                        </div>
                        <div className="m-metric">
                          <span className="lbl">DSCR Post-Tax</span>
                          <span className="val">{m.coverageRatioPostTax}x</span>
                        </div>
                      </div>

                      <div className="card-actions-row">
                        <button
                          type="button"
                          className="btn-card-open btn-use-template"
                          onClick={() => {
                            onSelectCanvas(tmpl);
                            onClose();
                          }}
                        >
                          🚀 Cargar en Canvas
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleDuplicate(tmpl)}
                          title="Crear una copia personalizada de esta plantilla"
                        >
                          📋 Clonar a Mis Proyectos
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: AUTENTICACIÓN / NUBE iNGIZER */}
          {activeTab === "auth" && (
            <div className="user-auth-panel">
              {user ? (
                <div className="auth-profile-card">
                  <div className="auth-avatar-circle">
                    {profile?.full_name?.charAt(0) || user.email?.charAt(0) || "U"}
                  </div>
                  <h3>Cuenta iNGIZER Vinculada</h3>
                  <p className="auth-email-lead">{user.email}</p>
                  <p className="auth-company-sub">
                    Empresa: <strong>{profile?.company_name || "Mi Empresa Pyme"}</strong>
                  </p>

                  <div className="auth-cloud-status-box">
                    <span>🟢 Sincronización en la Nube Activa</span>
                    <p>
                      Tus lienzos y escenarios de Cube Canvas se respaldan en Supabase PostgreSQL bajo el ecosistema
                      unificado de iNGIZER.
                    </p>
                  </div>

                  <div className="auth-actions-group">
                    <button type="button" className="btn btn-primary" onClick={handleSaveCurrentToCloud}>
                      💾 Sincronizar Lienzo Actual Ahora
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={handleSignOut}>
                      Cerrar Sesión en este Navegador
                    </button>
                  </div>
                </div>
              ) : (
                <div className="auth-login-box">
                  <div className="auth-login-header">
                    <h3>Accede con tu Cuenta iNGIZER</h3>
                    <p>
                      Inicia sesión para sincronizar tus modelos de capital stack entre tus dispositivos y vincular tus
                      diagnósticos de <strong>ingizer.com</strong>.
                    </p>
                  </div>

                  <button type="button" className="btn-google-auth" onClick={handleGoogleLogin}>
                    <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    Continuar con Google
                  </button>

                  <div className="auth-divider">
                    <span>o con correo electrónico</span>
                  </div>

                  <form onSubmit={handleEmailAuth} className="auth-form-body">
                    {authMode === "signup" && (
                      <div className="form-group mb-3">
                        <label className="text-xs font-bold text-gray-700">Nombre de tu Empresa / Negocio:</label>
                        <input
                          type="text"
                          className="input-control"
                          placeholder="Ej. Pizzería Di Napoli S.A.S."
                          value={companyNameInput}
                          onChange={(e) => setCompanyNameInput(e.target.value)}
                          required
                        />
                      </div>
                    )}

                    <div className="form-group mb-3">
                      <label className="text-xs font-bold text-gray-700">Correo Electrónico:</label>
                      <input
                        type="email"
                        className="input-control"
                        placeholder="tu-correo@empresa.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group mb-4">
                      <label className="text-xs font-bold text-gray-700">Contraseña:</label>
                      <input
                        type="password"
                        className="input-control"
                        placeholder="••••••••"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        required
                      />
                    </div>

                    <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                      {loading
                        ? "Procesando..."
                        : authMode === "login"
                        ? "Iniciar Sesión"
                        : "Crear Cuenta en iNGIZER"}
                    </button>
                  </form>

                  <div className="auth-toggle-mode">
                    {authMode === "login" ? (
                      <p>
                        ¿No tienes cuenta aún?{" "}
                        <button type="button" onClick={() => setAuthMode("signup")} className="btn-link">
                          Crear cuenta nueva
                        </button>
                      </p>
                    ) : (
                      <p>
                        ¿Ya tienes cuenta iNGIZER?{" "}
                        <button type="button" onClick={() => setAuthMode("login")} className="btn-link">
                          Inicia sesión
                        </button>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
