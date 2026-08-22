const handleCatalog = require('./client/catalog');
const handleClientMe = require('./client/me');
const handleFile = require('./client/file/[id]');
const handleVideo = require('./client/video/[id]');
const handleClientCoursesIndex = require('./client/courses/index');
const handleClientCourseById = require('./client/courses/[id]');
const handleSolicitar = require('./client/courses/[id]/solicitar');

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname.replace('/api/client', '') || '/';

  // Catalog
  if (path === '/catalog') return handleCatalog(req, res);

  // Me
  if (path === '/me') return handleClientMe(req, res);

  // File and Video
  if (path === '/file') return handleFile(req, res);
  if (path === '/video') return handleVideo(req, res);

  // Courses
  if (path === '/courses') return handleClientCoursesIndex(req, res);
  if (path.match(/^\/courses\/[^/]+$/)) return handleClientCourseById(req, res);
  if (path.match(/^\/courses\/[^/]+\/solicitar$/)) return handleSolicitar(req, res);

  res.status(404).json({ error: 'Not found' });
};
