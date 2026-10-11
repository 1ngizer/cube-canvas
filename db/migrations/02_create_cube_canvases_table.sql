-- ========================================================================
-- MIGRACIÓN SUPABASE: TABLA DE LIENZOS CUBE CANVAS (BCC)
-- Proyecto: iNGIZER Ecosystem (bgklpvhgyjhyrednzftf)
-- ========================================================================

-- 1. Crear tabla oficial de almacenamiento de lienzos
CREATE TABLE IF NOT EXISTS public.cube_canvases (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT,
    project_name TEXT NOT NULL,
    sector TEXT DEFAULT 'General',
    currency TEXT DEFAULT 'COP',
    dscr_ratio NUMERIC,
    dscr_post_tax NUMERIC,
    capex_needed NUMERIC DEFAULT 0,
    operating_profit NUMERIC DEFAULT 0,
    viability_status TEXT DEFAULT 'healthy', -- 'healthy' | 'warning' | 'danger'
    canvas_state JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar Row Level Security (RLS) para proteger los datos de cada pyme
ALTER TABLE public.cube_canvases ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso (Solo el dueño del usuario autenticado puede leer, insertar, editar o borrar)
CREATE POLICY "Los usuarios pueden ver sus propios lienzos"
    ON public.cube_canvases
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden insertar sus propios lienzos"
    ON public.cube_canvases
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propios lienzos"
    ON public.cube_canvases
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propios lienzos"
    ON public.cube_canvases
    FOR DELETE
    USING (auth.uid() = user_id);

-- 4. Índice para búsquedas rápidas por usuario
CREATE INDEX IF NOT EXISTS idx_cube_canvases_user_id ON public.cube_canvases(user_id);
CREATE INDEX IF NOT EXISTS idx_cube_canvases_updated_at ON public.cube_canvases(updated_at DESC);
