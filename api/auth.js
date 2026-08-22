const handleLogin = require('./auth/login');
const handleRegister = require('./auth/register');
const handleLogout = require('./auth/logout');
const handleMe = require('./auth/me');

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname.replace('/api/auth', '') || '/';

  if (path === '/login') return handleLogin(req, res);
  if (path === '/register') return handleRegister(req, res);
  if (path === '/me') return handleMe(req, res);
  if (path === '/logout') return handleLogout(req, res);

  res.status(404).json({ error: 'Not found' });
};
