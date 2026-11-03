/* ==========================================
   ML CONSULTING — login.js
   Manejo de autenticación:
   - Login con Correo y Contraseña
   - Registro con Teléfono, Correo y Contraseña
   - Verificación OTP por Correo (6 dígitos)
   - Registro e Inicio de Sesión con Google OAuth
========================================== */

const tabs = document.querySelectorAll('.auth-tab');
const forms = document.querySelectorAll('.auth-form');
const authSubtitle = document.getElementById('authSubtitle');
const authFormsContainer = document.getElementById('authFormsContainer');
const authLoading = document.getElementById('authLoading');
const authLoadingText = document.getElementById('authLoadingText');
const googleAuthBtn = document.getElementById('googleAuthBtn');
const googleBtnLabel = document.getElementById('googleBtnLabel');

const verifyView = document.getElementById('verifyView');
const verifyForm = document.getElementById('verifyForm');
const verifyEmailDisplay = document.getElementById('verifyEmailDisplay');
const verifyError = document.getElementById('verifyError');
const verifySuccess = document.getElementById('verifySuccess');
const verifySubmitBtn = document.getElementById('verifySubmitBtn');
const resendOtpBtn = document.getElementById('resendOtpBtn');
const resendCountdown = document.getElementById('resendCountdown');
const backToRegisterBtn = document.getElementById('backToRegisterBtn');
const otpDigits = document.querySelectorAll('.otp-digit');

let pendingEmail = '';
let pendingName = '';
let pendingPhone = '';
let resendTimerInterval = null;
let isProcessingOAuth = false;

/* ---------- Cambio de Pestañas (Login / Registro) ---------- */

function switchTab(name) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  forms.forEach(f => f.classList.toggle('active', f.id === name + 'Form'));

  if (name === 'register') {
    authSubtitle.textContent = 'Crea tu cuenta en segundos';
    if (googleBtnLabel) googleBtnLabel.textContent = 'Registrarse con Google';
  } else {
    authSubtitle.textContent = 'Accede a tu cuenta';
    if (googleBtnLabel) googleBtnLabel.textContent = 'Continuar con Google';
  }

  document.querySelectorAll('.auth-error').forEach(el => {
    el.textContent = '';
    el.hidden = true;
  });
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

function showError(el, message) {
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
}

function hideError(el) {
  if (!el) return;
  el.textContent = '';
  el.hidden = true;
}

function showLoading(text) {
  if (authFormsContainer) authFormsContainer.hidden = true;
  if (verifyView) verifyView.hidden = true;
  if (authLoading) {
    if (authLoadingText) authLoadingText.textContent = text || 'Procesando...';
    authLoading.hidden = false;
  }
}

function hideLoading() {
  if (authLoading) authLoading.hidden = true;
  if (pendingEmail && !verifyView.hidden) {
    verifyView.hidden = false;
  } else if (authFormsContainer) {
    authFormsContainer.hidden = false;
  }
}

/* ---------- Redirección Post-Login ---------- */

async function redirectAfterAuth() {
  try {
    const res = await authFetch('/api/auth/me');
    if (res && res.ok) {
      const json = await res.json();
      if (json.user && json.user.role === 'admin') {
        window.location.href = '/admin.html';
        return;
      }
    }
  } catch (e) {
    /* fallback a mi-cuenta */
  }
  window.location.href = '/mi-cuenta.html#catalogo';
}

/* ---------- Detección de Retorno OAuth (Google) ---------- */

async function checkOAuthCallback() {
  const hash = window.location.hash || '';
  const search = window.location.search || '';

  // Si hay tokens en el hash o código en el query
  if (hash.includes('access_token=') || search.includes('code=')) {
    isProcessingOAuth = true;
    showLoading('Iniciando sesión con Google...');
  }

  // Escuchar cambio de estado en Supabase
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
      localStorage.setItem('sb_access_token', session.access_token);
      localStorage.setItem('sb_refresh_token', session.refresh_token);

      if (isProcessingOAuth || hash.includes('access_token=') || search.includes('code=')) {
        showLoading('¡Sesión confirmada! Redirigiendo...');
        await redirectAfterAuth();
      }
    }
  });

  // Si no hubo hash pero ya había sesión activa y no es un logout explícito
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && (hash.includes('access_token=') || search.includes('code='))) {
      localStorage.setItem('sb_access_token', session.access_token);
      localStorage.setItem('sb_refresh_token', session.refresh_token);
      await redirectAfterAuth();
    }
  } catch (e) {
    hideLoading();
  }
}

/* ---------- Manejador de Google Auth ---------- */

async function handleGoogleAuth() {
  const activeTab = document.querySelector('.auth-tab.active');
  const isRegister = activeTab && activeTab.dataset.tab === 'register';
  const targetErrorEl = document.getElementById(isRegister ? 'registerError' : 'loginError');

  hideError(targetErrorEl);

  try {
    showLoading('Conectando con Google...');

    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/login.html'
      }
    });

    if (error) {
      hideLoading();
      showError(targetErrorEl, error.message || 'No se pudo conectar con Google.');
    }
  } catch (err) {
    hideLoading();
    showError(targetErrorEl, 'Ocurrió un error al intentar conectar con Google.');
  }
}

if (googleAuthBtn) {
  googleAuthBtn.addEventListener('click', handleGoogleAuth);
}

/* ---------- Login con Correo y Contraseña ---------- */

async function handleLogin(e) {
  e.preventDefault();
  const errorEl = document.getElementById('loginError');
  hideError(errorEl);

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form).entries());

  const email = String(data.email || '').trim();
  const password = String(data.password || '');

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return showError(errorEl, 'Ingresa un correo electrónico válido.');
  }
  if (password.length < 6) {
    return showError(errorEl, 'La contraseña debe tener al menos 6 caracteres.');
  }

  const originalBtnHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Iniciando...';

  try {
    const { data: authData, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;

      if (error.message.includes('Email not confirmed')) {
        // El usuario no ha verificado el correo, lo llevamos a la pantalla de verificación
        pendingEmail = email;
        switchToVerifyView(email);
        startResendTimer();
        return;
      }

      return showError(errorEl, error.message === 'Invalid login credentials'
        ? 'Correo o contraseña incorrectos.'
        : (error.message || 'Ocurrió un error. Inténtalo de nuevo.'));
    }

    if (authData.session) {
      localStorage.setItem('sb_access_token', authData.session.access_token);
      localStorage.setItem('sb_refresh_token', authData.session.refresh_token);
    }

    await redirectAfterAuth();
  } catch (e) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;
    showError(errorEl, 'No se pudo conectar con el servidor. Inténtalo de nuevo.');
  }
}

/* ---------- Registro con Teléfono, Correo y Contraseña ---------- */

async function handleRegister(e) {
  e.preventDefault();
  const errorEl = document.getElementById('registerError');
  hideError(errorEl);

  const form = e.target;
  const submitBtn = document.getElementById('registerSubmitBtn') || form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form).entries());

  const name = String(data.name || '').trim();
  const phone = String(data.phone || '').trim();
  const email = String(data.email || '').toLowerCase().trim();
  const password = String(data.password || '');

  if (!name) {
    return showError(errorEl, 'Escribe tu nombre completo.');
  }
  if (!phone || phone.replace(/\D/g, '').length < 7) {
    return showError(errorEl, 'Ingresa un número de teléfono válido para contacto.');
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return showError(errorEl, 'Ingresa un correo electrónico válido.');
  }
  if (password.length < 6) {
    return showError(errorEl, 'La contraseña debe tener al menos 6 caracteres.');
  }

  const originalBtnHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrando...';

  try {
    const { data: authData, error } = await supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: name,
          phone: phone,
          role: 'client'
        }
      }
    });

    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;

    if (error) {
      if (error.message.includes('already') || error.message.includes('registered')) {
        return showError(errorEl, 'Ya existe una cuenta con este correo electrónico. Intenta iniciar sesión.');
      }
      return showError(errorEl, error.message || 'Ocurrió un error al registrarse. Inténtalo de nuevo.');
    }

    pendingEmail = email;
    pendingName = name;
    pendingPhone = phone;

    // Si Supabase devuelve sesión directa (confirmación de email desactivada)
    if (authData.session) {
      localStorage.setItem('sb_access_token', authData.session.access_token);
      localStorage.setItem('sb_refresh_token', authData.session.refresh_token);

      try {
        await authFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name: name, phone: phone, email: email, password: password })
        });
      } catch (err) { /* ignore */ }

      window.location.href = '/mi-cuenta.html#catalogo';
      return;
    }

    // Si Supabase requiere verificación por correo (código OTP de 6 dígitos)
    switchToVerifyView(email);
    startResendTimer();

  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;
    showError(errorEl, 'No se pudo conectar con el servidor. Inténtalo de nuevo.');
  }
}

/* ---------- Vista de Verificación OTP ---------- */

function switchToVerifyView(email) {
  authFormsContainer.hidden = true;
  verifyView.hidden = false;
  authSubtitle.textContent = 'Verificación de seguridad';
  verifyEmailDisplay.textContent = email;

  hideError(verifyError);
  if (verifySuccess) {
    verifySuccess.textContent = '';
    verifySuccess.hidden = true;
  }

  // Limpiar y enfocar primer dígito
  otpDigits.forEach(d => { d.value = ''; });
  if (otpDigits[0]) {
    setTimeout(() => otpDigits[0].focus(), 100);
  }
}

function switchToAuthForms() {
  verifyView.hidden = true;
  authFormsContainer.hidden = false;
  const activeTab = document.querySelector('.auth-tab.active');
  const isRegister = activeTab && activeTab.dataset.tab === 'register';
  authSubtitle.textContent = isRegister ? 'Crea tu cuenta en segundos' : 'Accede a tu cuenta';
}

if (backToRegisterBtn) {
  backToRegisterBtn.addEventListener('click', () => {
    clearInterval(resendTimerInterval);
    switchToAuthForms();
  });
}

/* ---------- Control de Entradas OTP (6 dígitos) ---------- */

otpDigits.forEach((digitInput, idx) => {
  digitInput.addEventListener('input', (e) => {
    const val = e.target.value.replace(/\D/g, '');
    e.target.value = val ? val[val.length - 1] : '';

    if (e.target.value && idx < otpDigits.length - 1) {
      otpDigits[idx + 1].focus();
    }

    // Si se completaron los 6 dígitos, disparar verificación automáticamente
    const allFilled = Array.from(otpDigits).every(d => d.value.length === 1);
    if (allFilled) {
      verifyForm.requestSubmit();
    }
  });

  digitInput.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !digitInput.value && idx > 0) {
      otpDigits[idx - 1].focus();
    }
  });

  digitInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasteData = (e.clipboardData || window.clipboardData).getData('text') || '';
    const digits = pasteData.replace(/\D/g, '').slice(0, 6);

    if (digits.length > 0) {
      digits.split('').forEach((char, i) => {
        if (otpDigits[i]) otpDigits[i].value = char;
      });

      const nextFocus = Math.min(digits.length, otpDigits.length - 1);
      otpDigits[nextFocus].focus();

      if (digits.length === 6) {
        verifyForm.requestSubmit();
      }
    }
  });
});

/* ---------- Verificación de Código OTP ---------- */

async function handleVerifyOtp(e) {
  e.preventDefault();
  hideError(verifyError);

  const code = Array.from(otpDigits).map(d => d.value).join('');

  if (code.length < 6) {
    return showError(verifyError, 'Por favor ingresa los 6 dígitos del código.');
  }

  const originalBtnHtml = verifySubmitBtn.innerHTML;
  verifySubmitBtn.disabled = true;
  verifySubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verificando...';

  try {
    // 1. Intentar verificar con tipo 'signup'
    let { data, error } = await supabaseClient.auth.verifyOtp({
      email: pendingEmail,
      token: code,
      type: 'signup'
    });

    // 2. Si falla, intentar como 'email' (por si Supabase lo generó como OTP genérico)
    if (error && (error.message.includes('type') || error.message.includes('Token has expired or is invalid'))) {
      const retry = await supabaseClient.auth.verifyOtp({
        email: pendingEmail,
        token: code,
        type: 'email'
      });
      if (!retry.error) {
        data = retry.data;
        error = null;
      }
    }

    if (error) {
      verifySubmitBtn.disabled = false;
      verifySubmitBtn.innerHTML = originalBtnHtml;
      return showError(verifyError, 'El código ingresado es incorrecto o ha expirado. Verifica el código e intenta de nuevo.');
    }

    // Éxito: Guardar sesión
    if (data && data.session) {
      localStorage.setItem('sb_access_token', data.session.access_token);
      localStorage.setItem('sb_refresh_token', data.session.refresh_token);
    }

    if (verifySuccess) {
      verifySuccess.textContent = '¡Cuenta verificada exitosamente! Entrando...';
      verifySuccess.hidden = false;
    }

    setTimeout(async () => {
      await redirectAfterAuth();
    }, 1200);

  } catch (err) {
    verifySubmitBtn.disabled = false;
    verifySubmitBtn.innerHTML = originalBtnHtml;
    showError(verifyError, 'Error al conectar con el servidor. Inténtalo de nuevo.');
  }
}

if (verifyForm) {
  verifyForm.addEventListener('submit', handleVerifyOtp);
}

/* ---------- Reenviar Código OTP ---------- */

function startResendTimer() {
  clearInterval(resendTimerInterval);
  let seconds = 60;
  resendOtpBtn.disabled = true;
  if (resendCountdown) resendCountdown.textContent = seconds;

  resendTimerInterval = setInterval(() => {
    seconds -= 1;
    if (resendCountdown) resendCountdown.textContent = seconds;

    if (seconds <= 0) {
      clearInterval(resendTimerInterval);
      resendOtpBtn.disabled = false;
      resendOtpBtn.innerHTML = 'Reenviar código';
    }
  }, 1000);
}

async function handleResendOtp() {
  if (!pendingEmail) return;
  hideError(verifyError);

  resendOtpBtn.disabled = true;
  resendOtpBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Reenviando...';

  try {
    const { error } = await supabaseClient.auth.resend({
      type: 'signup',
      email: pendingEmail
    });

    if (error) {
      resendOtpBtn.disabled = false;
      resendOtpBtn.innerHTML = 'Reenviar código';
      return showError(verifyError, error.message || 'No se pudo reenviar el código.');
    }

    if (verifySuccess) {
      verifySuccess.textContent = 'Te enviamos un nuevo código a tu correo.';
      verifySuccess.hidden = false;
      setTimeout(() => {
        if (verifySuccess) verifySuccess.hidden = true;
      }, 5000);
    }

    startResendTimer();
  } catch (e) {
    resendOtpBtn.disabled = false;
    resendOtpBtn.innerHTML = 'Reenviar código';
    showError(verifyError, 'Error al solicitar el reenvío.');
  }
}

if (resendOtpBtn) {
  resendOtpBtn.addEventListener('click', handleResendOtp);
}

/* ---------- Asignación de Formularios e Inicialización ---------- */

const loginForm = document.getElementById('loginForm');
if (loginForm) loginForm.addEventListener('submit', handleLogin);

const registerForm = document.getElementById('registerForm');
if (registerForm) registerForm.addEventListener('submit', handleRegister);

// Iniciar detección de sesión / OAuth al cargar
checkOAuthCallback();
