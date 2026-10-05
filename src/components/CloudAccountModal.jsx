import React, { useState, useEffect } from "react";
import { supabase, saveCanvasToCloud, getCloudCanvases, deleteCloudCanvas } from "../services/supabase";

export default function CloudAccountModal({ isOpen, onClose, currentCanvas, onLoadCanvas }) {
  const [user, setUser] = useState(null);
  const [cloudCanvases, setCloudCanvases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Modo email/contraseña
  const [authMode, setAuthMode] = useState("login"); // 'login' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    checkUser();
  }, [isOpen]);

  const checkUser = async () => {
    try {
      setLoading(true);
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
      if (currentUser) {
        await refreshCloudList();
      }
    } catch (e) {
      console.warn("Error comprobando sesión:", e);
    } finally {
      setLoading(false);
    }
  };

  const refreshCloudList = async () => {
    try {
      const list = await getCloudCanvases();
      setCloudCanvases(list);
    } catch (e) {
      console.warn("Error cargando lista cloud:", e);
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
      setMessage({ type: "error", text: `Error con Google: ${err.message}` });
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      if (authMode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setUser(data.user);
        setMessage({ type: "success", text: "¡Sesión iniciada con éxito!" });
        await refreshCloudList();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setUser(data.user);
        setMessage({
          type: "success",
          text: "Cuenta creada. Si recibes un correo de confirmación, verifícalo.",
        });
        await refreshCloudList();
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
      setCloudCanvases([]);
      setMessage({ type: "info", text: "Sesión cerrada." });
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    }
  };

  const handleSaveCurrentToCloud = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await saveCanvasToCloud(currentCanvas);
      setMessage({ type: "success", text: `✅ Escenario "${currentCanvas.name}" sincronizado en la nube.` });
      await refreshCloudList();
    } catch (e) {
      setMessage({ type: "error", text: `Error guardando en la nube: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCanvas = async (id, name) => {
    if (!window.confirm(`¿Seguro que deseas eliminar "${name}" de la nube?`)) return;
    setLoading(true);
    try {
      await deleteCloudCanvas(id);
      await refreshCloudList();
      setMessage({ type: "info", text: `Escenario eliminado de la nube.` });
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop-simple no-print" onClick={onClose}>
      <div
        className="modal-dialog-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "620px", width: "95vw", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="ai-modal-header" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
          <div className="ai-modal-title-group">
            <span
              className="pitch-badge"
              style={{ background: "linear-gradient(135deg, #0284c7, #10b981)", color: "#fff" }}
            >
              ☁️ CUENTA EN LA NUBE
            </span>
            <h3>Sincronización Cloud con Supabase</h3>
          </div>
          <button type="button" className="close-drawer-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {message && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 14px",
              borderRadius: "6px",
              fontSize: "0.88rem",
              backgroundColor:
                message.type === "error"
                  ? "#fef2f2"
                  : message.type === "success"
                  ? "#f0fdf4"
                  : "#eff6ff",
              color:
                message.type === "error"
                  ? "#991b1b"
                  : message.type === "success"
                  ? "#065f46"
                  : "#1e40af",
              border: `1px solid ${
                message.type === "error"
                  ? "#fca5a5"
                  : message.type === "success"
                  ? "#86efac"
                  : "#bfdbfe"
              }`,
            }}
          >
            {message.text}
          </div>
        )}

        {user ? (
          /* VISTA CUANDO EL USUARIO YA ESTÁ LOGUEADO */
          <div style={{ marginTop: "16px" }}>
            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>
                  Sesión Activa
                </span>
                <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "1rem" }}>{user.email}</div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSignOut}
                style={{ padding: "6px 12px", fontSize: "0.82rem" }}
              >
                Cerrar Sesión
              </button>
            </div>

            {/* BOTÓN PARA GUARDAR ESCENARIO ACTUAL */}
            <div style={{ marginBottom: "24px" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveCurrentToCloud}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px",
                  fontWeight: "700",
                  backgroundColor: "#0284c7",
                  borderColor: "#0284c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {loading ? "⏳ Sincronizando..." : `💾 Guardar Escenario Actual ("${currentCanvas.name}") en la Nube`}
              </button>
            </div>

            {/* LISTA DE ESCENARIOS EN LA NUBE */}
            <div>
              <h4 style={{ fontSize: "0.92rem", fontWeight: "800", color: "#1e293b", marginBottom: "10px" }}>
                Tus Escenarios en la Nube ({cloudCanvases.length}):
              </h4>

              {cloudCanvases.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px", color: "#64748b", fontSize: "0.88rem" }}>
                  Aún no tienes simulaciones sincronizadas en la nube. Haz clic en el botón de arriba para respaldar tu primer canvas.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {cloudCanvases.map((sc) => (
                    <div
                      key={sc.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                      }}
                    >
                      <div>
                        <strong style={{ display: "block", color: "#0f172a", fontSize: "0.92rem" }}>
                          {sc.name}
                        </strong>
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          Meta NSM: {sc.nsmGoal || "10X"} &bull; {sc.updatedAt ? new Date(sc.updatedAt).toLocaleDateString() : "Reciente"}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            onLoadCanvas(sc);
                            onClose();
                          }}
                          style={{ padding: "6px 12px", fontSize: "0.82rem" }}
                          title="Cargar esta simulación en el canvas principal"
                        >
                          📂 Cargar
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleDeleteCanvas(sc.id, sc.name)}
                          style={{
                            padding: "6px 10px",
                            fontSize: "0.82rem",
                            backgroundColor: "#fef2f2",
                            borderColor: "#fca5a5",
                            color: "#b91c1c",
                          }}
                          title="Eliminar de la nube"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* FORMULARIO DE INICIO DE SESIÓN */
          <div style={{ marginTop: "16px" }}>
            <p style={{ color: "#475569", fontSize: "0.92rem", marginBottom: "16px", lineHeight: "1.4" }}>
              Inicia sesión para sincronizar automáticamente tus modelos financieros en Supabase, acceder a ellos desde cualquier computador o celular y proteger tus datos.
            </p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGoogleLogin}
              style={{
                width: "100%",
                padding: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                backgroundColor: "#ffffff",
                color: "#1f2937",
                borderColor: "#cbd5e1",
                fontWeight: "700",
                marginBottom: "20px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
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

            <div style={{ textAlign: "center", position: "relative", margin: "20px 0" }}>
              <hr style={{ border: "none", borderTop: "1px solid #e2e8f0" }} />
              <span
                style={{
                  position: "absolute",
                  top: "-10px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  backgroundColor: "#ffffff",
                  padding: "0 10px",
                  color: "#94a3b8",
                  fontSize: "0.78rem",
                  textTransform: "uppercase",
                  fontWeight: "700",
                }}
              >
                O con tu correo
              </span>
            </div>

            <form onSubmit={handleEmailAuth}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", marginBottom: "4px" }}>
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  className="scenario-select"
                  style={{ width: "100%", padding: "8px 10px" }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="fundador@tuempresa.com"
                  required
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", marginBottom: "4px" }}>
                  Contraseña
                </label>
                <input
                  type="password"
                  className="scenario-select"
                  style={{ width: "100%", padding: "8px 10px" }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: "100%", padding: "10px", fontWeight: "700", marginBottom: "10px" }}
              >
                {loading
                  ? "⏳ Procesando..."
                  : authMode === "login"
                  ? "Iniciar Sesión"
                  : "Crear Cuenta"}
              </button>

              <div style={{ textAlign: "center", fontSize: "0.85rem" }}>
                {authMode === "login" ? (
                  <span>
                    ¿No tienes cuenta?{" "}
                    <button
                      type="button"
                      style={{ background: "none", border: "none", color: "#0284c7", fontWeight: "700", cursor: "pointer" }}
                      onClick={() => setAuthMode("signup")}
                    >
                      Regístrate gratis
                    </button>
                  </span>
                ) : (
                  <span>
                    ¿Ya tienes cuenta?{" "}
                    <button
                      type="button"
                      style={{ background: "none", border: "none", color: "#0284c7", fontWeight: "700", cursor: "pointer" }}
                      onClick={() => setAuthMode("login")}
                    >
                      Inicia sesión
                    </button>
                  </span>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
