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

  // File and Video — dynamic /:id
  let m;
  if ((m = path.match(/^\/file\/([^/]+)$/))) {
    req.query = req.query || {};
    req.query.id = m[1];
    return handleFile(req, res);
  }
  if ((m = path.match(/^\/video\/([^/]+)$/))) {
    req.query = req.query || {};
    req.query.id = m[1];
    return handleVideo(req, res);
  }

  // Courses
  if (path === '/courses') return handleClientCoursesIndex(req, res);
  if ((m = path.match(/^\/courses\/([^/]+)$/))) {
    req.query = req.query || {};
    req.query.id = m[1];
    return handleClientCourseById(req, res);
  }
  if ((m = path.match(/^\/courses\/([^/]+)\/solicitar$/))) {
    req.query = req.query || {};
    req.query.id = m[1];
    return handleSolicitar(req, res);
  }

  res.status(404).json({ error: 'Not found' });
};
