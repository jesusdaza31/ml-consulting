-- =============================================
-- ML CONSULTING — Tabla de Pagos
-- Ejecuta este script en el SQL Editor de Supabase
-- para habilitar el sistema de pagos y activación automática.
-- =============================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  monto NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  moneda TEXT NOT NULL DEFAULT 'USD',
  metodo TEXT NOT NULL DEFAULT 'manual' CHECK (metodo IN ('square', 'tarjeta', 'transferencia', 'efectivo', 'zelle', 'manual', 'cortesia', 'stripe', 'otro')),
  estado TEXT NOT NULL DEFAULT 'completado' CHECK (estado IN ('completado', 'pendiente', 'fallido', 'reembolsado')),
  referencia TEXT DEFAULT '',
  notas TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de búsqueda y orden
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_course_id ON payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_estado ON payments(estado);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad:
-- 1. Los administradores pueden gestionar todos los pagos
DROP POLICY IF EXISTS "Admins can manage payments" ON payments;
CREATE POLICY "Admins can manage payments"
  ON payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Los clientes pueden ver sus propios pagos
DROP POLICY IF EXISTS "Clients can view their own payments" ON payments;
CREATE POLICY "Clients can view their own payments"
  ON payments FOR SELECT
  USING (client_id = auth.uid());
