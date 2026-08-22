const { supabaseAdmin } = require('./supabase');

// Verificar token de Supabase y retornar usuario
async function getUserFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

// Middleware: requerir autenticación
async function requireAuth(req, res, next) {
  const user = await getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  // Obtener perfil del usuario
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    return res.status(401).json({ error: 'Perfil no encontrado' });
  }

  req.user = user;
  req.profile = profile;
  next();
}

// Middleware: requerir rol admin
function requireAdmin(req, res, next) {
  if (req.profile.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso restringido' });
  }
  next();
}

module.exports = {
  getUserFromToken,
  requireAuth,
  requireAdmin
};
