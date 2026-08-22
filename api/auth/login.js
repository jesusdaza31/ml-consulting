const { supabaseAdmin } = require('../lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body || {};

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email: String(email || '').toLowerCase().trim(),
    password: String(password || '')
  });

  if (error) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  res.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      name: profile ? profile.name : 'Usuario',
      role: profile ? profile.role : 'client'
    },
    token: data.session.access_token
  });
};
