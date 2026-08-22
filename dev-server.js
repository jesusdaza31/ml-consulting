/* =============================================
   ML CONSULTING — dev-server.js
   Servidor de desarrollo local que emula Vercel Functions
   Uso: npm run dev:local
============================================= */

const path = require('path');
const fs = require('fs');
const express = require('express');

// Cargar variables de entorno
const envFile = path.join(__dirname, '.env.local');
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS para desarrollo
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Función helper para cargar y ejecutar Vercel Functions
function loadFunction(functionPath) {
  try {
    // Limpiar cache para hot reload
    delete require.cache[require.resolve(functionPath)];
    return require(functionPath);
  } catch (e) {
    console.error(`Error loading function ${functionPath}:`, e.message);
    return null;
  }
}

// Rutas de API que emulan Vercel Functions
// Auth
app.post('/api/auth/login', (req, res) => {
  const fn = loadFunction('./api/auth/login');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

app.post('/api/auth/register', (req, res) => {
  const fn = loadFunction('./api/auth/register');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

app.post('/api/auth/logout', (req, res) => {
  const fn = loadFunction('./api/auth/logout');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

app.get('/api/auth/me', (req, res) => {
  const fn = loadFunction('./api/auth/me');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

// Admin - Users
app.get('/api/admin/users', (req, res) => {
  const fn = loadFunction('./api/admin/users');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

// Admin - Dashboard
app.get('/api/admin/dashboard', (req, res) => {
  const fn = loadFunction('./api/admin/dashboard');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

// Admin - Courses
app.get('/api/admin/courses', (req, res) => {
  const fn = loadFunction('./api/admin/courses/index');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

app.post('/api/admin/courses', (req, res) => {
  const fn = loadFunction('./api/admin/courses/index');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

app.get('/api/admin/courses/:id', (req, res) => {
  const fn = loadFunction('./api/admin/courses/[id]');
  if (fn) {
    req.params.id = req.params.id;
    fn(req, res);
  } else res.status(500).json({ error: 'Function not found' });
});

app.put('/api/admin/courses/:id', (req, res) => {
  const fn = loadFunction('./api/admin/courses/[id]');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

app.delete('/api/admin/courses/:id', (req, res) => {
  const fn = loadFunction('./api/admin/courses/[id]');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

// Admin - Courses - Inscribir
app.post('/api/admin/courses/:id/inscribir', (req, res) => {
  const fn = loadFunction('./api/admin/courses/[id]/inscribir');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

// Admin - Courses - Progreso
app.post('/api/admin/courses/:id/progreso', (req, res) => {
  const fn = loadFunction('./api/admin/courses/[id]/progreso');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

// Admin - Courses - Aprobar
app.post('/api/admin/courses/:id/aprobar', (req, res) => {
  const fn = loadFunction('./api/admin/courses/[id]/aprobar');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

// Admin - Courses - Rechazar
app.post('/api/admin/courses/:id/rechazar', (req, res) => {
  const fn = loadFunction('./api/admin/courses/[id]/rechazar');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

// Admin - Courses - Contenido
app.post('/api/admin/courses/:id/contenido', (req, res) => {
  const fn = loadFunction('./api/admin/courses/[id]/contenido/index');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

app.put('/api/admin/courses/:id/contenido/:contenidoId', (req, res) => {
  const fn = loadFunction('./api/admin/courses/[id]/contenido/[contenidoId]');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

app.delete('/api/admin/courses/:id/contenido/:contenidoId', (req, res) => {
  const fn = loadFunction('./api/admin/courses/[id]/contenido/[contenidoId]');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

// Admin - Courses - Upload (presign para documentos)
app.post('/api/admin/courses/:id/upload', (req, res) => {
  const fn = loadFunction('./api/admin/courses/[id]/upload');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

// Admin - Videos
app.get('/api/admin/videos', (req, res) => {
  const fn = loadFunction('./api/admin/videos/index');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

app.post('/api/admin/videos/presign', (req, res) => {
  const fn = loadFunction('./api/admin/videos/presign');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

app.post('/api/admin/videos/confirm', (req, res) => {
  const fn = loadFunction('./api/admin/videos/confirm');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

app.delete('/api/admin/videos/:id', (req, res) => {
  const fn = loadFunction('./api/admin/videos/[id]');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

// Client - Me
app.get('/api/client/me', (req, res) => {
  const fn = loadFunction('./api/client/me');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

// Client - Courses
app.get('/api/client/courses', (req, res) => {
  const fn = loadFunction('./api/client/courses/index');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

app.get('/api/client/courses/:id', (req, res) => {
  const fn = loadFunction('./api/client/courses/[id]');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

app.post('/api/client/courses/:id/solicitar', (req, res) => {
  const fn = loadFunction('./api/client/courses/[id]/solicitar');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

// Client - Catalog
app.get('/api/client/catalog', (req, res) => {
  const fn = loadFunction('./api/client/catalog');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

// Client - Video
app.get('/api/client/video/:id', (req, res) => {
  const fn = loadFunction('./api/client/video/[id]');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

// Client - File
app.get('/api/client/file/:id', (req, res) => {
  const fn = loadFunction('./api/client/file/[id]');
  if (fn) fn(req, res);
  else res.status(500).json({ error: 'Function not found' });
});

// Archivos estáticos (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Fallback para SPA
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[dev-server]', err);
  res.status(500).json({ error: 'Error interno del servidor', message: err.message });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🚀 ML Consulting dev server corriendo en http://localhost:${PORT}`);
  console.log(`📁 Frontend: http://localhost:${PORT}/index.html`);
  console.log(`🔐 Login: http://localhost:${PORT}/login.html`);
  console.log(`👤 Admin: http://localhost:${PORT}/admin.html`);
  console.log(`🔒 Solo accesible desde tu máquina (localhost)\n`);
});
