# ML Consulting — Guía de Despliegue

## ✅ Lo que se hizo

### Backend (Vercel Functions + Supabase + R2)
- ✅ Schema de PostgreSQL creado (`supabase-schema.sql`)
- ✅ Estructura de carpetas para Vercel (`api/`, `public/`)
- ✅ Librerías base (`api/lib/supabase.js`, `r2.js`, `auth.js`)
- ✅ Todas las rutas de la API convertidas a Vercel Functions
- ✅ Auth migrado de cookies a Supabase Auth (JWT)
- ✅ Datos migrados de JSON a PostgreSQL
- ✅ R2 configurado para videos y documentos (presigned URLs)

### Frontend (Vercel Static + Supabase Auth)
- ✅ Archivos estáticos movidos a `public/`
- ✅ SDK de Supabase agregado en HTML
- ✅ Helper `authFetch()` para requests autenticadas
- ✅ Login/Register usando Supabase Auth
- ✅ Uploads de documentos usando presigned URLs
- ✅ Verificación de sesión en páginas protegidas

## 🔧 Pasos para completar

### 1. Configurar Supabase

1. Ve a https://app.supabase.com y crea un proyecto nuevo (o usa uno existente)
2. Ve a **Project Settings > API** y copia:
   - `Project URL` (ej: `https://xyzcompany.supabase.co`)
   - `service_role key` (secret)
   - `anon public key`

3. Ve a **SQL Editor** y ejecuta el contenido de `supabase-schema.sql`

4. Crea el usuario admin inicial:
   ```sql
   -- Reemplaza con tu email y contraseña
   INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
   VALUES (
     uuid_generate_v4(),
     'admin@mlconsulting.com',
     crypt('TuContraseñaSegura123!', gen_salt('bf')),
     NOW(),
     '{"name": "Administrador", "role": "admin"}'::jsonb
   );
   ```

### 2. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# R2 (ya las tienes en .env)
R2_ACCOUNT_ID=476cfaaed8b763f79b1e4c053ca074db
R2_ACCESS_KEY_ID=a01a5372a337406e02c2b01d52cc5c48
R2_SECRET_ACCESS_KEY=cea74dee2110ca6812af2d8b23a2c53a15bccd06be0d495a80c55d26037a500c
R2_BUCKET=ml-consulting-videos
```

### 3. Configurar credenciales de Supabase en el frontend

Edita `public/auth.js` y reemplaza:
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Con tus credenciales reales de Supabase.

### 4. Instalar dependencias

```bash
npm install
```

### 5. Probar localmente

```bash
npm run dev
```

Esto inicia Vercel Dev en `http://localhost:3000`

### 6. Desplegar a Vercel

```bash
# Primer deploy (crea el proyecto en Vercel)
npx vercel

# Deploy a producción
npx vercel deploy --prod
```

### 7. Configurar variables de entorno en Vercel

En el dashboard de Vercel:
1. Ve a tu proyecto > **Settings > Environment Variables**
2. Agrega todas las variables de `.env.local`
3. Redeploy: `npx vercel --prod`

### 8. Configurar dominio en Cloudflare

1. En Cloudflare, ve a tu dominio
2. Agrega un registro CNAME apuntando a tu proyecto de Vercel:
   - Name: `@` o `www`
   - Target: `cname.vercel-dns.com`
3. En Vercel, ve a **Settings > Domains** y agrega tu dominio

## 📁 Estructura final del proyecto

```
loukidis/
├── api/                    ← Vercel Functions (backend)
│   ├── lib/
│   │   ├── supabase.js
│   │   ├── r2.js
│   │   └── auth.js
│   ├── auth/
│   │   ├── login.js
│   │   ├── register.js
│   │   ├── logout.js
│   │   └── me.js
│   ├── admin/
│   │   ├── users.js
│   │   ├── dashboard.js
│   │   ├── courses/
│   │   │   ├── index.js
│   │   │   ├── [id].js
│   │   │   └── [id]/
│   │   │       ├── inscribir.js
│   │   │       ├── progreso.js
│   │   │       ├── aprobar.js
│   │   │       ├── rechazar.js
│   │   │       ├── contenido/
│   │   │       │   ├── index.js
│   │   │       │   └── [contenidoId].js
│   │   │       └── upload.js
│   │   └── videos/
│   │       ├── index.js
│   │       ├── presign.js
│   │       ├── confirm.js
│   │       └── [id].js
│   └── client/
│       ├── me.js
│       ├── courses/
│       │   ├── index.js
│       │   ├── [id].js
│       │   └── [id]/
│       │       └── solicitar.js
│       ├── catalog.js
│       ├── video/
│       │   └── [id].js
│       └── file/
│           └── [id].js
├── public/                 ← Frontend estático
│   ├── auth.js            ← Helper de autenticación
│   ├── index.html
│   ├── login.html
│   ├── admin.html
│   ├── mi-cuenta.html
│   ├── *.css
│   └── *.js
├── supabase-schema.sql    ← Schema de PostgreSQL
├── vercel.json            ← Routing config
├── package.json
├── .env.local             ← Variables de entorno (NO subir a git)
└── .gitignore
```

## 🔒 Seguridad

- ✅ Supabase Auth maneja passwords con bcrypt
- ✅ JWT tokens en localStorage (frontend)
- ✅ RLS (Row Level Security) en PostgreSQL
- ✅ Service role key solo en backend (nunca en frontend)
- ✅ Presigned URLs para R2 (acceso temporal)

## 💰 Costos

- **Vercel Hobby**: Gratis (hasta 100GB bandwidth/mes)
- **Supabase Free**: Gratis (hasta 500MB DB, 1GB storage)
- **Cloudflare R2**: Gratis (hasta 10GB storage, 1M requests/mes)
- **Cloudflare DNS**: Gratis

**Total: $0/mes** (para uso básico)

## 🐛 Troubleshooting

### Error: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
- Verifica que `.env.local` existe y tiene las variables correctas
- Reinicia `npm run dev`

### Error: "relation 'profiles' does not exist"
- Ejecuta `supabase-schema.sql` en el SQL Editor de Supabase

### Error: "Invalid API key"
- Verifica que las credenciales de Supabase en `public/auth.js` son correctas
- Verifica que las variables de entorno en Vercel están configuradas

### Videos no se reproducen
- Verifica que las credenciales de R2 en `.env.local` son correctas
- Verifica que el bucket existe y tiene permisos de lectura/escritura

## 📝 Notas

- Los archivos originales (`server.js`, `auth.js`, `courses.js`, `videos.js`) ya no se usan, pero se mantienen como referencia
- La carpeta `data/` con archivos JSON ya no se usa (ahora todo está en PostgreSQL)
- La carpeta `uploads/` ya no se usa (ahora todo va a R2)
