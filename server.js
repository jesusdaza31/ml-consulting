/* =============================================
   ML CONSULTING — server.js
   Sirve el sitio estático desde la raíz del
   proyecto + API de autenticación (JSON, cookies).
   Requiere: npm install  (solo express)
============================================= */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/* ---------- Loader .env mínimo (sin dependencias) ----------
   DEBE ejecutarse ANTES de cualquier require que lea process.env
   (auth.js, videos.js, etc.) para que las credenciales R2/admin existan. */
(function loadEnv() {
  const envFile = path.join(__dirname, '.env');
  if (!fs.existsSync(envFile)) return;
  const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
})();

const express = require('express');
const multer = require('multer');
const {
  SESSION_COOKIE,
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  rateLimiter
} = require('./auth');
const courses = require('./courses');
const videos = require('./videos');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

/* ---------- Uploads (multer, archivos de documentos) ---------- */

const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.webp'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      ensureUploadsDir();
      cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, crypto.randomUUID() + ext);
    }
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXT.includes(ext)) return cb(null, true);
    cb(new Error('Tipo de archivo no permitido.'));
  }
});

function deleteUploadedFile(filename) {
  if (!filename) return;
  const filePath = path.join(UPLOADS_DIR, filename);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) { /* ignore */ }
}

// Valida que un contenido tipo video con r2VideoId referencie un video existente.
function validateVideoReference(body) {
  if (!body || String(body.tipo) !== 'video' || !body.r2VideoId) return null;
  const record = videos.findVideo(body.r2VideoId);
  if (!record) return 'El video seleccionado ya no existe en la biblioteca.';
  return null;
}

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || 'admin@mlconsulting.com').toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin1234!';

if (!process.env.SESSION_SECRET) {
  console.warn('[auth] ⚠️ SESSION_SECRET no definido — se usó uno aleatorio. Las sesiones se invalidan al reiniciar. Defínelo en .env');
}
if (!process.env.ADMIN_PASSWORD) {
  console.warn('[auth] ⚠️ ADMIN_PASSWORD no definido — se usó el default "Admin1234!". ¡CÁMBIALO antes de producción creando un archivo .env!');
}

/* ---------- Persistencia de usuarios (JSON, sin base de datos) ---------- */

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readUsers() {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    return Array.isArray(parsed.users) ? parsed.users : [];
  } catch (e) {
    return [];
  }
}

function writeUsers(list) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify({ users: list }, null, 2), 'utf8');
}

let users = readUsers();

function save() { writeUsers(users); }
function findUserByEmail(email) {
  return users.find(u => u.email === String(email).toLowerCase().trim());
}
function findUserById(id) { return users.find(u => u.id === id); }
function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt };
}
function clientsNameMap() {
  const map = {};
  users.forEach(u => { map[u.id] = u.name; });
  return map;
}

/* ---------- Seed del admin (primera ejecución) ---------- */
function seedAdmin() {
  if (findUserByEmail(ADMIN_EMAIL)) return;
  users.push({
    id: crypto.randomUUID(),
    name: 'Administrador',
    email: ADMIN_EMAIL,
    role: 'admin',
    createdAt: new Date().toISOString(),
    password: hashPassword(ADMIN_PASSWORD)
  });
  save();
  console.log('[auth] Admin creado: ' + ADMIN_EMAIL +
    (process.env.ADMIN_PASSWORD ? '' : ' (con la contraseña por defecto — ¡cámbiala!)'));
}

/* ---------- Cookies (parser mínimo) y sesión ---------- */

function parseCookie(str) {
  const out = {};
  if (!str) return out;
  for (const part of String(str).split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function getUserIdFromRequest(req) {
  const token = parseCookie(req.headers.cookie)[SESSION_COOKIE];
  return verifySessionToken(SESSION_SECRET, token);
}

function setSessionCookie(res, userId) {
  res.cookie(SESSION_COOKIE, createSessionToken(SESSION_SECRET, userId), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production'
  });
}

/* ---------- Middleware de autorización ---------- */

function requireAuth(req, res, next) {
  const user = findUserById(getUserIdFromRequest(req));
  if (!user) return res.status(401).json({ error: 'No autenticado' });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, function () {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso restringido' });
    next();
  });
}

/* =============================================
   API (antes del estático)
============================================= */

app.disable('x-powered-by');
app.use(express.json());

app.get('/api/me', (req, res) => {
  const user = findUserById(getUserIdFromRequest(req));
  if (!user) return res.status(401).json({ error: 'No autenticado' });
  const inscripciones = user.role === 'client'
    ? courses.clientInscripciones(user.id)
    : [];
  res.json({ user: publicUser(user), inscripciones: inscripciones });
});

const authLimiter = rateLimiter({ max: 10, windowMs: 15 * 60 * 1000 });

app.post('/api/register', authLimiter, (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const email = String(body.email || '').toLowerCase().trim();
  const password = String(body.password || '');

  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio.' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Ingresa un correo electrónico válido.' });
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  if (findUserByEmail(email)) return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });

  const user = {
    id: crypto.randomUUID(),
    name: name,
    email: email,
    role: 'client',
    createdAt: new Date().toISOString(),
    password: hashPassword(password)
  };
  users.push(user);
  save();
  setSessionCookie(res, user.id);
  res.status(201).json({ user: publicUser(user) });
});

app.post('/api/login', authLimiter, (req, res) => {
  const body = req.body || {};
  const email = String(body.email || '').toLowerCase().trim();
  const password = String(body.password || '');
  const user = findUserByEmail(email);

  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  setSessionCookie(res, user.id);
  res.json({ user: publicUser(user) });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.status(200).json({ ok: true });
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const list = users.map(u => Object.assign(publicUser(u), {
    inscripciones: courses.countClientInscripciones(u.id)
  }));
  res.json({ users: list });
});

/* =============================================
   API ADMIN: dashboard, cursos, inscripciones
============================================= */

app.get('/api/admin/dashboard', requireAdmin, (req, res) => {
  const stats = courses.dashboardStats(
    users.filter(u => u.role === 'client').length,
    clientsNameMap()
  );
  res.json(stats);
});

app.get('/api/admin/courses', requireAdmin, (req, res) => {
  const names = clientsNameMap();
  const list = courses.allCourses().map(c => courses.getCoursePublic(c, names));
  res.json({ courses: list });
});

app.post('/api/admin/courses', requireAdmin, (req, res) => {
  const validated = courses.validateCourseInput(req.body || {});
  if (validated.error) return res.status(400).json({ error: validated.error });
  const course = courses.createCourse(validated.value);
  res.status(201).json({ curso: courses.getCoursePublic(course, clientsNameMap()) });
});

app.put('/api/admin/courses/:id', requireAdmin, (req, res) => {
  const validated = courses.validateCourseInput(req.body || {});
  if (validated.error) return res.status(400).json({ error: validated.error });
  const course = courses.updateCourse(req.params.id, validated.value);
  if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
  res.json({ curso: courses.getCoursePublic(course, clientsNameMap()) });
});

app.delete('/api/admin/courses/:id', requireAdmin, (req, res) => {
  const ok = courses.deleteCourse(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Curso no encontrado' });
  res.json({ ok: true });
});

app.post('/api/admin/courses/:id/inscribir', requireAdmin, (req, res) => {
  const course = courses.findCourse(req.params.id);
  if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

  const cliente = findUserById(String((req.body || {}).clienteId || ''));
  if (!cliente || cliente.role !== 'client') {
    return res.status(400).json({ error: 'Selecciona un cliente válido.' });
  }

  const result = courses.inscribir(course, cliente.id, (req.body || {}).horas, clientsNameMap());
  if (result.error) return res.status(result.status || 400).json({ error: result.error });
  res.status(201).json({ curso: result.curso, inscripcion: result.inscripcion });
});

app.post('/api/admin/courses/:id/progreso', requireAdmin, (req, res) => {
  const course = courses.findCourse(req.params.id);
  if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

  const result = courses.registrarProgreso(
    course,
    String((req.body || {}).clienteId || ''),
    (req.body || {}).horasUsadas,
    clientsNameMap()
  );
  if (result.error) return res.status(result.status || 400).json({ error: result.error });
  res.json({ curso: result.curso, inscripcion: result.inscripcion });
});

/* ---------- Solicitudes: aprobar / rechazar (admin) ---------- */

app.post('/api/admin/courses/:id/aprobar', requireAdmin, (req, res) => {
  const course = courses.findCourse(req.params.id);
  if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
  const clienteId = String((req.body || {}).clienteId || '');
  const result = courses.aprobarInscripcion(course, clienteId, clientsNameMap());
  if (result.error) return res.status(result.status || 400).json({ error: result.error });
  res.json({ curso: result.curso, inscripcion: result.inscripcion });
});

app.post('/api/admin/courses/:id/rechazar', requireAdmin, (req, res) => {
  const course = courses.findCourse(req.params.id);
  if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
  const clienteId = String((req.body || {}).clienteId || '');
  const result = courses.rechazarInscripcion(course, clienteId, clientsNameMap());
  if (result.error) return res.status(result.status || 400).json({ error: result.error });
  res.json({ curso: result.curso, inscripcion: result.inscripcion });
});

/* =============================================
   API ADMIN: contenido de cursos
============================================= */

app.post('/api/admin/courses/:id/contenido', requireAdmin, (req, res) => {
  const course = courses.findCourse(req.params.id);
  if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
  const refError = validateVideoReference(req.body || {});
  if (refError) return res.status(400).json({ error: refError });
  const validated = courses.validateContenidoInput(req.body || {});
  if (validated.error) return res.status(400).json({ error: validated.error });
  const result = courses.addContenido(course, validated.value);
  if (result.error) return res.status(result.status || 400).json({ error: result.error });
  res.status(201).json({ contenido: result.item, curso: courses.getCoursePublic(course, clientsNameMap()) });
});

app.put('/api/admin/courses/:id/contenido/:contenidoId', requireAdmin, (req, res) => {
  const course = courses.findCourse(req.params.id);
  if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
  const refError = validateVideoReference(req.body || {});
  if (refError) return res.status(400).json({ error: refError });
  const validated = courses.validateContenidoInput(req.body || {});
  if (validated.error) return res.status(400).json({ error: validated.error });
  const result = courses.updateContenido(course, req.params.contenidoId, validated.value);
  if (result.notFound) return res.status(404).json({ error: 'Contenido no encontrado' });
  if (result.error) return res.status(result.status || 400).json({ error: result.error });
  if (result.oldDoc) deleteUploadedFile(result.oldDoc);
  res.json({ contenido: result.item, curso: courses.getCoursePublic(course, clientsNameMap()) });
});

app.delete('/api/admin/courses/:id/contenido/:contenidoId', requireAdmin, (req, res) => {
  const course = courses.findCourse(req.params.id);
  if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
  const result = courses.deleteContenido(course, req.params.contenidoId);
  if (result.notFound) return res.status(404).json({ error: 'Contenido no encontrado' });
  if (result.docFile) deleteUploadedFile(result.docFile);
  res.json({ ok: true, curso: courses.getCoursePublic(course, clientsNameMap()) });
});

app.post('/api/admin/courses/:id/upload', requireAdmin, (req, res, next) => {  upload.single('archivo')(req, res, function (err) {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'El archivo supera el límite de 25MB.' });
      }
      return res.status(400).json({ error: err.message || 'No se pudo subir el archivo.' });
    }
    next();
  });
}, (req, res) => {
  const course = courses.findCourse(req.params.id);
  if (!course) {
    if (req.file) deleteUploadedFile(req.file.filename);
    return res.status(404).json({ error: 'Curso no encontrado' });
  }
  if (!req.file) return res.status(400).json({ error: 'Selecciona un archivo.' });
  res.status(201).json({
    docFile: req.file.filename,
    docNombre: req.file.originalname,
    size: req.file.size
  });
});

/* =============================================
   API ADMIN: biblioteca de videos (R2)
============================================= */

function requireR2Configured(res) {
  if (!videos.isConfigured()) {
    res.status(503).json({ error: 'R2 no configurado', r2Missing: true });
    return true;
  }
  return false;
}

app.post('/api/admin/videos/presign', requireAdmin, async (req, res) => {
  if (requireR2Configured(res)) return;
  try {
    const body = req.body || {};
    const filename = String(body.filename || 'video.mp4');
    const contentType = String(body.contentType || 'video/mp4');
    const size = Number(body.size);
    if (!Number.isFinite(size) || size < 1) {
      return res.status(400).json({ error: 'Indica el tamaño del archivo.' });
    }
    const id = crypto.randomUUID();
    const { uploadUrl, key } = await videos.presignUpload({ filename: filename, contentType: contentType });
    res.json({ uploadUrl: uploadUrl, key: key, id: id });
  } catch (e) {
    console.error('[videos] presign error:', e.message);
    res.status(500).json({ error: 'No se pudo generar la URL de subida.' });
  }
});

app.post('/api/admin/videos/confirm', requireAdmin, (req, res) => {
  const body = req.body || {};
  const id = String(body.id || '');
  const key = String(body.key || '');
  const filename = String(body.filename || 'video');
  const size = Number(body.size);
  const mime = String(body.mime || 'video/mp4');
  if (!id || !key) return res.status(400).json({ error: 'Faltan datos del video.' });
  if (!Number.isFinite(size) || size < 1) return res.status(400).json({ error: 'Tamaño inválido.' });

  const record = videos.addVideo({
    id: id,
    key: key,
    originalName: filename,
    size: size,
    mime: mime,
    createdAt: new Date().toISOString(),
    cursoId: null
  });
  res.status(201).json({ video: record });
});

app.get('/api/admin/videos', requireAdmin, async (req, res) => {
  if (requireR2Configured(res)) return;
  try {
    const list = [];
    for (const v of videos.allVideos()) {
      list.push(Object.assign({}, v, { getUrl: await videos.signGetUrl(v.key) }));
    }
    res.json({ videos: list });
  } catch (e) {
    console.error('[videos] list error:', e.message);
    res.status(500).json({ error: 'No se pudo listar los videos.' });
  }
});

app.delete('/api/admin/videos/:id', requireAdmin, async (req, res) => {
  const removed = videos.removeVideo(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Video no encontrado' });
  if (videos.isConfigured()) {
    await videos.deleteObject(removed.key); // best-effort
  }
  res.json({ ok: true });
});

/* =============================================
   API CLIENTE: reproducción de videos R2
============================================= */

app.get('/api/client/video/:id', requireAuth, async (req, res) => {
  const found = courses.findContenidoGlobal(req.params.id);
  if (!found || found.tipo !== 'video' || !found.r2Key) {
    return res.status(404).json({ error: 'Video no encontrado' });
  }
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && !courses.enrolledInscripcion(found.curso, req.user.id)) {
    return res.status(403).json({ error: 'No estás inscrito en este curso' });
  }
  if (!videos.isConfigured()) {
    return res.status(503).json({ error: 'R2 no configurado' });
  }
  try {
    const url = await videos.signGetUrl(found.r2Key);
    res.redirect(url);
  } catch (e) {
    console.error('[videos] get url error:', e.message);
    res.status(500).json({ error: 'No se pudo generar la URL del video.' });
  }
});

/* =============================================
   API CLIENTE: cursos y contenido (inscritos)
============================================= */

function isClientEnrolled(course, userId) {
  return courses.enrolledInscripcion(course, userId) !== null;
}

app.get('/api/client/courses', requireAuth, (req, res) => {
  const isAdmin = req.user.role === 'admin';
  res.json({ cursos: courses.clientCourseList(req.user.id, { isAdmin: isAdmin }) });
});

app.get('/api/client/catalog', requireAuth, (req, res) => {
  if (req.user.role !== 'client') {
    return res.status(403).json({ error: 'Solo los clientes ven el catálogo' });
  }
  res.json({ cursos: courses.clientCatalog(req.user.id) });
});

app.post('/api/client/courses/:id/solicitar', requireAuth, (req, res) => {
  if (req.user.role !== 'client') {
    return res.status(403).json({ error: 'Solo los clientes pueden solicitar' });
  }
  const course = courses.findCourse(req.params.id);
  if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
  const result = courses.solicitarInscripcion(course, req.user.id);
  if (result.error) return res.status(result.status || 400).json({ error: result.error });
  res.status(201).json({ inscripcion: result.inscripcion });
});

app.get('/api/client/courses/:id', requireAuth, (req, res) => {
  const course = courses.findCourse(req.params.id);
  if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && !isClientEnrolled(course, req.user.id)) {
    return res.status(403).json({ error: 'No estás inscrito en este curso' });
  }
  res.json({ curso: courses.clientCourseDetail(req.user.id, course, isAdmin) });
});

app.get('/api/client/file/:id', requireAuth, (req, res) => {
  const found = courses.findContenidoGlobal(req.params.id);
  if (!found || found.tipo !== 'documento' || !found.docFile) {
    return res.status(404).json({ error: 'Documento no encontrado' });
  }
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && !isClientEnrolled(found.curso, req.user.id)) {
    return res.status(403).json({ error: 'No estás inscrito en este curso' });
  }
  const filePath = path.join(UPLOADS_DIR, found.docFile);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado' });
  const nombre = encodeURIComponent(found.docNombre || found.docFile);
  res.setHeader('Content-Disposition', 'inline; filename*=UTF-8\'\'' + nombre);
  res.sendFile(filePath);
});

/* ---------- Bloquear datos internos ---------- */
app.use(['/data', '/node_modules', '/.env', '/uploads'], (req, res) => res.status(404).end());

/* ---------- Estático (el sitio sigue igual desde la raíz) ---------- */
app.use(express.static(__dirname, { index: 'index.html' }));

/* ---------- Error handler (JSON) ---------- */
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Solicitud inválida.' });
  }
  console.error('[server]', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(PORT, () => {
  seedAdmin();
  console.log('ML Consulting corriendo en http://localhost:' + PORT);
});
