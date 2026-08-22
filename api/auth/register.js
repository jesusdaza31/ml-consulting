const { supabaseAdmin } = require('../lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const name = String(body.name || '').trim();
  const email = String(body.email || '').toLowerCase().trim();
  const password = String(body.password || '');

  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio.' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Ingresa un correo electrónico válido.' });
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });

  const { data, error } = await supabaseAdmin.auth.signUp({
    email,
    password,
    options: {
      data: { name, role: 'client' }
    }
  });

  if (error) {
    if (error.message.includes('already')) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
    }
    return res.status(400).json({ error: error.message });
  }

  const profile = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  res.status(201).json({
    user: {
      id: data.user.id,
      email: data.user.email,
      name: profile.data ? profile.data.name : name,
      role: profile.data ? profile.data.role : 'client'
    },
    token: data.session ? data.session.access_token : null
  });
};
