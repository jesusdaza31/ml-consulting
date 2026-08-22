/* ==========================================
   ML CONSULTING — login.js
========================================== */

const tabs = document.querySelectorAll('.auth-tab');
const forms = document.querySelectorAll('.auth-form');

function switchTab(name) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  forms.forEach(f => f.classList.toggle('active', f.id === name + 'Form'));
  document.querySelectorAll('.auth-error').forEach(el => {
    el.textContent = '';
    el.hidden = true;
  });
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

function showError(el, message) {
  el.textContent = message;
  el.hidden = false;
}

async function handleLogin(e) {
  e.preventDefault();
  const errorEl = document.getElementById('loginError');
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());

  const email = String(data.email || '').trim();
  const password = String(data.password || '');

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return showError(errorEl, 'Ingresa un correo electrónico válido.');
  }
  if (password.length < 6) {
    return showError(errorEl, 'La contraseña debe tener al menos 6 caracteres.');
  }

  try {
    const { data: authData, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      return showError(errorEl, error.message === 'Invalid login credentials'
        ? 'Correo o contraseña incorrectos.'
        : (error.message || 'Ocurrió un error. Inténtalo de nuevo.'));
    }

    if (authData.session) {
      localStorage.setItem('sb_access_token', authData.session.access_token);
      localStorage.setItem('sb_refresh_token', authData.session.refresh_token);
    }

    try {
      const res = await authFetch('/api/auth/me');
      if (res && res.ok) {
        const json = await res.json();
        if (json.user && json.user.role === 'admin') {
          window.location.href = '/admin.html';
          return;
        }
      }
    } catch (e) { /* ignore */ }

    window.location.href = '/mi-cuenta.html#catalogo';
  } catch (e) {
    showError(errorEl, 'No se pudo conectar con el servidor. Inténtalo de nuevo.');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const errorEl = document.getElementById('registerError');
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());

  const name = String(data.name || '').trim();
  const email = String(data.email || '').trim();
  const password = String(data.password || '');

  if (!name) {
    return showError(errorEl, 'Escribe tu nombre completo.');
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return showError(errorEl, 'Ingresa un correo electrónico válido.');
  }
  if (password.length < 6) {
    return showError(errorEl, 'La contraseña debe tener al menos 6 caracteres.');
  }

  try {
    const { data: authData, error } = await supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: { name: name }
      }
    });

    if (error) {
      return showError(errorEl, error.message || 'Ocurrió un error. Inténtalo de nuevo.');
    }

    if (authData.session) {
      localStorage.setItem('sb_access_token', authData.session.access_token);
      localStorage.setItem('sb_refresh_token', authData.session.refresh_token);

      try {
        await authFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name: name, email: email, password: password })
        });
      } catch (e) { /* ignore */ }

      window.location.href = '/?login=ok';
    } else {
      window.location.href = '/?login=ok';
    }
  } catch (e) {
    showError(errorEl, 'No se pudo conectar con el servidor. Inténtalo de nuevo.');
  }
}

document.getElementById('loginForm').addEventListener('submit', handleLogin);
document.getElementById('registerForm').addEventListener('submit', handleRegister);
