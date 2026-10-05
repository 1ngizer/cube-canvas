import { createClient } from "@supabase/supabase-js";

// Configuración de Supabase para Cube Canvas
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://bgklpvhgyjhyrednzftf.supabase.co";

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJna2xwdmhneWpoeXJlZG56ZnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NDQwNDIsImV4cCI6MjEwNTIyMDA0Mn0.TeV-Gjyp5Ca5NQsp0JPOepxHIWLZQFU0AvZWqUONHiU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// =========================================================================
// 1. CODIFICACIÓN Y DECODIFICACIÓN UNIVERSAL DE ENLACES COMPARTIBLES
// =========================================================================

/**
 * Codifica un objeto de simulación a un string Base64URL compatible con UTF-8.
 * Permite compartir cualquier Cube Canvas como enlace directo sin latencia.
 */
export function encodeShareablePayload(canvasObj) {
  try {
    const compactObj = {
      id: canvasObj.id || `shared_${Date.now()}`,
      name: canvasObj.name || "Modelo Compartido",
      nsmGoal: canvasObj.nsmGoal || "10X",
      targetCustomer: canvasObj.targetCustomer || "",
      valueProposition: canvasObj.valueProposition || "",
      cashData: canvasObj.cashData || {},
      products: canvasObj.products || [],
      requirements: canvasObj.requirements || {},
      cogsData: canvasObj.cogsData || {},
      fundingSources: canvasObj.fundingSources || {},
      sharedAt: new Date().toISOString(),
    };

    const jsonStr = JSON.stringify(compactObj);
    const encoded = encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    );
    const b64 = btoa(encoded)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    return b64;
  } catch (e) {
    console.error("Error al codificar el enlace compartible:", e);
    return null;
  }
}

/**
 * Decodifica un string Base64URL a un objeto de simulación Cube Canvas.
 */
export function decodeShareablePayload(b64url) {
  try {
    if (!b64url || typeof b64url !== "string") return null;
    let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const decoded = atob(b64);
    const jsonStr = decodeURIComponent(
      decoded
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === "object" && (parsed.cashData || parsed.requirements)) {
      return parsed;
    }
    return null;
  } catch (e) {
    console.error("Error al decodificar el escenario compartido:", e);
    return null;
  }
}

/**
 * Genera la URL pública completa para compartir el escenario actual.
 */
export function generateShareUrl(canvasObj) {
  const code = encodeShareablePayload(canvasObj);
  if (!code) return null;
  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`
      : "https://cubecanvas-production.up.railway.app";
  return `${baseUrl}?share=${code}`;
}

// =========================================================================
// 2. PERSISTENCIA EN LA NUBE CON SUPABASE AUTH & METADATA
// =========================================================================

/**
 * Guarda un escenario en la nube para el usuario autenticado.
 */
export async function saveCanvasToCloud(canvasState) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Debes iniciar sesión para sincronizar escenarios en la nube.");
  }

  const existingCanvases = user.user_metadata?.canvases || [];
  const scenarioToSave = {
    ...canvasState,
    id: canvasState.id || `cloud_${Date.now()}`,
    updatedAt: new Date().toISOString(),
  };

  const filtered = existingCanvases.filter((c) => c.id !== scenarioToSave.id);
  const updatedCanvases = [scenarioToSave, ...filtered].slice(0, 30); // Guardar hasta 30 escenarios

  const { error } = await supabase.auth.updateUser({
    data: {
      canvases: updatedCanvases,
      lastActiveScenarioId: scenarioToSave.id,
    },
  });

  if (error) {
    throw error;
  }

  // Opcional: intentar guardar también en tabla relacional si existe
  try {
    await supabase.from("cube_canvases").upsert({
      id: scenarioToSave.id,
      title: scenarioToSave.name,
      data: scenarioToSave,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    });
  } catch (tableErr) {
    // Si la tabla no está creada aún en la base de datos, el perfil de usuario ya lo preservó
  }

  return scenarioToSave;
}

/**
 * Carga todos los escenarios guardados en la nube por el usuario actual.
 */
export async function getCloudCanvases() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // 1. Obtener desde user_metadata (siempre disponible sin migraciones)
  const metaCanvases = user.user_metadata?.canvases || [];

  // 2. Intentar combinar con tabla relacional si está activa
  try {
    const { data, error } = await supabase
      .from("cube_canvases")
      .select("data")
      .order("updated_at", { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const dbCanvases = data.map((d) => d.data);
      // Unir evitando duplicados
      const seenIds = new Set(dbCanvases.map((c) => c.id));
      const combined = [...dbCanvases, ...metaCanvases.filter((c) => !seenIds.has(c.id))];
      return combined;
    }
  } catch (e) {
    // Fallback a metadata
  }

  return metaCanvases;
}

/**
 * Elimina un escenario guardado en la nube.
 */
export async function deleteCloudCanvas(scenarioId) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const current = user.user_metadata?.canvases || [];
  const updated = current.filter((c) => c.id !== scenarioId);

  await supabase.auth.updateUser({
    data: { canvases: updated },
  });

  try {
    await supabase.from("cube_canvases").delete().eq("id", scenarioId);
  } catch (e) {
    // ignore
  }
}
