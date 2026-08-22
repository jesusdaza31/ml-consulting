-- =============================================
-- ML CONSULTING — Supabase Schema
-- PostgreSQL para usuarios, cursos, inscripciones, contenido y videos
-- =============================================

-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLA: profiles
-- Extiende auth.users de Supabase con datos adicionales
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil al registrarse
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- TABLA: courses
-- Cursos y servicios
-- =============================================
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('curso', 'servicio')),
  descripcion TEXT DEFAULT '',
  objetivo_general TEXT DEFAULT '',
  resultado_esperado TEXT DEFAULT '',
  modulos JSONB DEFAULT '[]'::jsonb,
  cupo_max INTEGER,
  horas INTEGER,
  duracion_dias INTEGER DEFAULT 30,
  price NUMERIC(10, 2),
  payment_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: inscripciones
-- Inscripciones de clientes a cursos
-- =============================================
CREATE TABLE IF NOT EXISTS inscripciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'activo', 'completado', 'cancelado')),
  fecha_inscripcion TIMESTAMPTZ DEFAULT NOW(),
  vencimiento TIMESTAMPTZ,
  horas_asignadas INTEGER,
  horas_usadas INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, client_id, estado)
);

-- =============================================
-- TABLA: contenido
-- Contenido de cursos (texto, video, documento)
-- =============================================
CREATE TABLE IF NOT EXISTS contenido (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('texto', 'video', 'documento')),
  titulo TEXT NOT NULL,
  texto TEXT,
  video_url TEXT,
  r2_video_id UUID REFERENCES videos(id),
  r2_key TEXT,
  doc_file TEXT,
  doc_nombre TEXT,
  orden INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: videos
-- Biblioteca de videos en R2
-- =============================================
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL,
  original_name TEXT NOT NULL,
  size BIGINT NOT NULL,
  mime TEXT DEFAULT 'video/mp4',
  curso_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar foreign key después de crear la tabla
ALTER TABLE contenido
  DROP CONSTRAINT IF EXISTS contenido_r2_video_id_fkey,
  ADD CONSTRAINT contenido_r2_video_id_fkey
  FOREIGN KEY (r2_video_id) REFERENCES videos(id) ON DELETE SET NULL;

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_inscripciones_course_id ON inscripciones(course_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_client_id ON inscripciones(client_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_estado ON inscripciones(estado);
CREATE INDEX IF NOT EXISTS idx_contenido_course_id ON contenido(course_id);
CREATE INDEX IF NOT EXISTS idx_videos_key ON videos(key);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE contenido ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Políticas para courses
CREATE POLICY "Anyone can view courses"
  ON courses FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert courses"
  ON courses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update courses"
  ON courses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete courses"
  ON courses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas para inscripciones
CREATE POLICY "Clients can view own inscripciones"
  ON inscripciones FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Admins can view all inscripciones"
  ON inscripciones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Clients can insert own inscripciones"
  ON inscripciones FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Admins can update inscripciones"
  ON inscripciones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas para contenido
CREATE POLICY "Anyone can view contenido"
  ON contenido FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage contenido"
  ON contenido FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas para videos
CREATE POLICY "Anyone can view videos"
  ON videos FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage videos"
  ON videos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- FUNCIONES AUXILIARES
-- =============================================

-- Función para verificar si un usuario es admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un cliente está inscrito en un curso
CREATE OR REPLACE FUNCTION is_enrolled(course_id UUID, client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM inscripciones
    WHERE course_id = course_id
      AND client_id = client_id
      AND estado IN ('activo', 'completado')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- VIEWS (opcional, para simplificar queries)
-- =============================================

-- Vista de cursos con conteo de inscritos
CREATE OR REPLACE VIEW courses_with_stats AS
SELECT
  c.*,
  COUNT(DISTINCT i.client_id) FILTER (WHERE i.estado = 'activo') as inscritos_activos,
  COUNT(DISTINCT i.client_id) as total_inscritos,
  CASE
    WHEN c.tipo = 'curso' AND c.cupo_max IS NOT NULL
    THEN GREATEST(0, c.cupo_max - COUNT(DISTINCT i.client_id) FILTER (WHERE i.estado = 'activo'))
    ELSE NULL
  END as cupos_libres
FROM courses c
LEFT JOIN inscripciones i ON c.id = i.course_id
GROUP BY c.id;
