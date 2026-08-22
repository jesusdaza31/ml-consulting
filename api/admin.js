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
  if (path === '/videos/delete') return handleVideoDelete(req, res);

  // Courses
  if (path === '/courses') return handleCoursesIndex(req, res);
  if (path === '/courses/create') return handleCourseById(req, res);

  // Course actions with ID
  if (path.match(/^\/courses\/[^/]+$/)) return handleCourseById(req, res);
  if (path.match(/^\/courses\/[^/]+\/inscribir$/)) return handleInscribir(req, res);
  if (path.match(/^\/courses\/[^/]+\/aprobar$/)) return handleAprobar(req, res);
  if (path.match(/^\/courses\/[^/]+\/rechazar$/)) return handleRechazar(req, res);
  if (path.match(/^\/courses\/[^/]+\/progreso$/)) return handleProgreso(req, res);
  if (path.match(/^\/courses\/[^/]+\/upload$/)) return handleCourseUpload(req, res);

  // Contenido
  if (path.match(/^\/courses\/[^/]+\/contenido$/)) return handleContenidoCreate(req, res);
  if (path.match(/^\/courses\/[^/]+\/contenido\/[^/]+$/)) return handleContenidoById(req, res);

  res.status(404).json({ error: 'Not found' });
};
