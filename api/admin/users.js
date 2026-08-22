const { requireAuth, requireAdmin } = require('../lib/auth');
const { supabaseAdmin } = require('../lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await requireAuth(req, res, async () => {
    await requireAdmin(req, res, async () => {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('*');

      if (!profiles) return res.json({ users: [] });

      const { data: inscripciones } = await supabaseAdmin
        .from('inscripciones')
        .select('client_id');

      const countByClient = {};
      if (inscripciones) {
        inscripciones.forEach(i => {
          countByClient[i.client_id] = (countByClient[i.client_id] || 0) + 1;
        });
      }

      const users = profiles.map(p => ({
        id: p.id,
        name: p.name,
        email: p.id === req.user.id ? req.user.email : '',
        role: p.role,
        createdAt: p.created_at,
        inscripciones: countByClient[p.id] || 0
      }));

      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      if (authUsers && authUsers.users) {
        const emailMap = {};
        authUsers.users.forEach(u => { emailMap[u.id] = u.email; });
        users.forEach(u => { u.email = emailMap[u.id] || u.email; });
      }

      res.json({ users });
    });
  });
};
