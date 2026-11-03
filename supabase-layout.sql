-- =============================================
-- ML CONSULTING — Layout de contenido
-- Agregar columnas para diseño visual
-- =============================================

-- Agregar columnas a contenido para layout
ALTER TABLE contenido
  ADD COLUMN IF NOT EXISTS row_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS width_pct INTEGER DEFAULT 100 CHECK (width_pct IN (25, 33, 50, 66, 75, 100));
