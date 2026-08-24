const handleDashboard = require('./admin/dashboard');
const handleUsers = require('./admin/users');
const handlePresignDocument = require('./admin/documents/presign');
const handleConfirmDocument = require('./admin/documents/confirm');
const handleVideosIndex = require('./admin/videos/index');
const handlePresignVideo = require('./admin/videos/presign');
const handleConfirmVideo = require('./admin/videos/confirm');
const handleVideoDelete = require('./admin/videos/[id]');
const handleCoursesIndex = require('./admin/courses/index');
const handleCourseById = require('./admin/courses/[id]');
const handleInscribir = require('./admin/courses/[id]/inscribir');
const handleAprobar = require('./admin/courses/[id]/aprobar');
const handleRechazar = require('./admin/courses/[id]/rechazar');
const handleProgreso = require('./admin/courses/[id]/progreso');
const handleCourseUpload = require('./admin/courses/[id]/upload');
const handleContenidoCreate = require('./admin/courses/[id]/contenido/index');
const handleContenidoById = require('./admin/courses/[id]/contenido/[contenidoId]');

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname.replace('/api/admin', '') || '/';

  // Dashboard
  if (path === '/dashboard') return handleDashboard(req, res);

  // Users
  if (path === '/users') return handleUsers(req, res);

  // Documents
  if (path === '/documents/presign') return handlePresignDocument(req, res);
  if (path === '/documents/confirm') return handleConfirmDocument(req, res);

  // Videos
  if (path === '/videos') return handleVideosIndex(req, res);
  if (path === '/videos/presign') return handlePresignVideo(req, res);
  if (path === '/videos/confirm') return handleConfirmVideo(req, res);
  if (path.match(/^\/videos\/[^/]+$/)) {
    req.query = req.query || {};
    req.query.id = path.split('/')[2];
    return handleVideoDelete(req, res);
  }

  // Courses
  if (path === '/courses') return handleCoursesIndex(req, res);
  if (path === '/courses/create') return handleCourseById(req, res);

  // Course actions with ID — inject IDs into req.query so handlers work
  let m;
  if ((m = path.match(/^\/courses\/([^/]+)$/)) && path !== '/courses/create') {
    req.query = req.query || {};
    req.query.id = m[1];
    return handleCourseById(req, res);
  }
  if ((m = path.match(/^\/courses\/([^/]+)\/(inscribir|aprobar|rechazar|progreso|upload)$/))) {
    req.query = req.query || {};
    req.query.id = m[1];
    const action = m[2];
    if (action === 'inscribir') return handleInscribir(req, res);
    if (action === 'aprobar') return handleAprobar(req, res);
    if (action === 'rechazar') return handleRechazar(req, res);
    if (action === 'progreso') return handleProgreso(req, res);
    if (action === 'upload') return handleCourseUpload(req, res);
  }

  // Contenido
  if ((m = path.match(/^\/courses\/([^/]+)\/contenido$/))) {
    req.query = req.query || {};
    req.query.id = m[1];
    return handleContenidoCreate(req, res);
  }
  if ((m = path.match(/^\/courses\/([^/]+)\/contenido\/([^/]+)$/))) {
    req.query = req.query || {};
    req.query.id = m[1];
    req.query.contenidoId = m[2];
    return handleContenidoById(req, res);
  }

  res.status(404).json({ error: 'Not found' });
};
