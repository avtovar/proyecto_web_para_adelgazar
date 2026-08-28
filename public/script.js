const API_BASE_URL = 'https://metodoparaadelgazar.vercel.app';

let currentUser = null;
let ejerciciosData = {};
let ultimoPeso = null;
let tipoSeleccionado = 'conPesas';

const authScreen = document.getElementById('authScreen');
const mainPanel = document.getElementById('mainPanel');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const fechaPeso = document.getElementById('fechaPeso');

function today() {
  return new Date().toISOString().split('T')[0];
}

function showNotification(text, type = 'error') {
  const el = document.getElementById('notification');
  if (el) {
    el.textContent = text;
    el.className = `notification ${type}`;
    el.hidden = false;
  }
}

function setMessage(id, text, type = 'success') {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = text;
    el.className = `message ${type}`;
  }
}

function setLoading(buttonId, loading) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.disabled = loading;
  btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
  btn.textContent = loading ? 'Cargando...' : btn.dataset.originalText;
}

async function api(url, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API_BASE_URL + url, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No se pudo completar la operacion');
  return data;
}

async function cargarEjercicios() {
  try {
    const res = await fetch('/ejercicios.json');
    ejerciciosData = await res.json();
  } catch {
    document.getElementById('listaEjercicios').innerHTML = '<p class="empty-state">No se pudieron cargar los ejercicios.</p>';
  }
}

function activarTab(tab) {
  const isLogin = tab === 'login';
  loginForm.hidden = !isLogin;
  registerForm.hidden = isLogin;
  loginTab.classList.toggle('active', isLogin);
  registerTab.classList.toggle('active', !isLogin);
  setMessage('loginError', '', 'error');
  setMessage('registerError', '', 'error');
}

function rangoPorPeso(peso) {
  const n = Number(peso);
  if (n < 80) return '40-79';
  if (n < 100) return '80-99';
  if (n <= 120) return '100-120';
  if (n <= 140) return '121-140';
  if (n <= 150) return '141-150';
  return '151-250';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderEjercicios() {
  const contenedor = document.getElementById('listaEjercicios');
  if (!ultimoPeso || !Object.keys(ejerciciosData).length) {
    contenedor.innerHTML = '<p class="empty-state">Registra tu peso para ver una rutina recomendada.</p>';
    return;
  }

  const rango = rangoPorPeso(ultimoPeso);
  const ejerciciosRango = ejerciciosData[rango];
  document.getElementById('pesoActual').textContent = `${Number(ultimoPeso).toFixed(1)} kg`;
  document.getElementById('rangoMostrado').textContent = ejerciciosRango.etiqueta;

  const lista = ejerciciosRango[tipoSeleccionado] || [];
  contenedor.innerHTML = lista.map((ejercicio) => `
    <article class="exercise-card">
      <div class="exercise-time">${escHtml(ejercicio.duracion_sugerida || 10)} min</div>
      <h4>${escHtml(ejercicio.nombre)}</h4>
      <p>${escHtml(ejercicio.explicacion)}</p>
      <span>${escHtml(ejercicio.series)}</span>
      ${ejercicio.videoId ? `<button class="video-btn" data-video="${escHtml(ejercicio.videoId)}" data-nombre="${escHtml(ejercicio.nombre)}" aria-label="Ver video de ${escHtml(ejercicio.nombre)}" type="button">▶</button>` : ''}
    </article>
  `).join('');
}

function openVideoModal(videoId, nombre) {
  const modal = document.getElementById('videoModal');
  const iframe = document.getElementById('videoIframe');
  document.getElementById('videoModalTitle').textContent = nombre;
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  modal.hidden = false;
}

function closeVideoModal() {
  const modal = document.getElementById('videoModal');
  const iframe = document.getElementById('videoIframe');
  modal.hidden = true;
  iframe.src = '';
}

document.getElementById('listaEjercicios').addEventListener('click', (e) => {
  const btn = e.target.closest('.video-btn');
  if (btn) {
    openVideoModal(btn.dataset.video, btn.dataset.nombre);
  }
});

document.getElementById('closeVideoModal').addEventListener('click', closeVideoModal);

document.getElementById('videoModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('videoModal')) closeVideoModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !document.getElementById('videoModal').hidden) closeVideoModal();
});

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderGraficoPeso(data) {
  const chart = document.getElementById('graficoPeso');
  if (!data.length) {
    chart.innerHTML = '<p class="empty-state">Todavia no hay registros de peso.</p>';
    return;
  }

  const width = 640;
  const height = 220;
  const padding = 34;
  const pesos = data.map((item) => Number(item.peso));
  const min = Math.min(...pesos) - 1;
  const max = Math.max(...pesos) + 1;
  const range = Math.max(max - min, 1);
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

  const points = data.map((item, index) => {
    const x = data.length > 1 ? padding + index * stepX : width / 2;
    const y = height - padding - ((Number(item.peso) - min) / range) * (height - padding * 2);
    return { x, y, fecha: escHtml(item.fecha), peso: Number(item.peso).toFixed(1) };
  });

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const circles = points.map((p) => `
    <circle cx="${p.x}" cy="${p.y}" r="5">
      <title>${p.fecha}: ${p.peso} kg</title>
    </circle>
  `).join('');

  chart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolucion de peso">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" class="axis"></line>
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" class="axis"></line>
      <path d="${path}" class="weight-line"></path>
      ${circles}
      <text x="${padding}" y="22">${max.toFixed(1)} kg</text>
      <text x="${padding}" y="${height - 8}">${min.toFixed(1)} kg</text>
    </svg>
  `;
}

async function cargarHistorialPeso() {
  const data = await api('/api/peso/historial');
  if (data.length) {
    ultimoPeso = Number(data[data.length - 1].peso);
  } else if (currentUser?.peso_inicial) {
    ultimoPeso = Number(currentUser.peso_inicial);
  }
  renderGraficoPeso(data);
  renderEjercicios();
}

async function cargarTotalTiempo() {
  const data = await api('/api/sesiones/total');
  document.getElementById('totalMinutos').textContent = data.total_minutos || 0;
}

async function mostrarPanel(user) {
  currentUser = user;
  document.getElementById('userName').textContent = user.nombre;
  authScreen.hidden = true;
  mainPanel.hidden = false;
  await Promise.all([cargarHistorialPeso(), cargarTotalTiempo()]);
}

loginTab.addEventListener('click', () => activarTab('login'));
registerTab.addEventListener('click', () => activarTab('register'));

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage('registerError', '', 'error');
  setLoading('registerSubmitBtn', true);

  try {
    await api('/api/registro', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        nombre: document.getElementById('regNombre').value,
        fecha_nac: document.getElementById('regFechaNac').value,
        peso_inicial: parseFloat(document.getElementById('regPeso').value),
        sexo: document.getElementById('regSexo').value
      })
    });
    registerForm.reset();
    activarTab('login');
    setMessage('loginError', 'Registro exitoso. Inicia sesion para continuar.', 'success');
  } catch (error) {
    setMessage('registerError', error.message, 'error');
  } finally {
    setLoading('registerSubmitBtn', false);
  }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage('loginError', '', 'error');
  setLoading('loginSubmitBtn', true);

  try {
    const data = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
      })
    });
    localStorage.setItem('token', data.token);
    await mostrarPanel(data.user);
  } catch (error) {
    setMessage('loginError', error.message, 'error');
  } finally {
    setLoading('loginSubmitBtn', false);
  }
});

document.getElementById('btnConPesas').addEventListener('click', () => {
  tipoSeleccionado = 'conPesas';
  document.getElementById('btnConPesas').classList.add('active');
  document.getElementById('btnSinPesas').classList.remove('active');
  renderEjercicios();
});

document.getElementById('btnSinPesas').addEventListener('click', () => {
  tipoSeleccionado = 'sinPesas';
  document.getElementById('btnSinPesas').classList.add('active');
  document.getElementById('btnConPesas').classList.remove('active');
  renderEjercicios();
});

document.getElementById('guardarPeso').addEventListener('click', async () => {
  const fecha = fechaPeso.value;
  const peso = parseFloat(document.getElementById('pesoKg').value);
  if (!fecha || !peso) {
    setMessage('pesoMessage', 'Completa fecha y peso.', 'error');
    return;
  }

  setLoading('guardarPeso', true);
  try {
    await api('/api/peso', {
      method: 'POST',
      body: JSON.stringify({ fecha, peso })
    });
    document.getElementById('pesoKg').value = '';
    setMessage('pesoMessage', 'Peso guardado correctamente.', 'success');
    await cargarHistorialPeso();
  } catch (error) {
    setMessage('pesoMessage', error.message, 'error');
  } finally {
    setLoading('guardarPeso', false);
  }
});

document.getElementById('guardarTiempo').addEventListener('click', async () => {
  const duracion = parseInt(document.getElementById('minutosEjercicio').value, 10);
  const tipo = document.getElementById('tipoEjercicio').value.trim();
  if (!duracion) {
    setMessage('tiempoMessage', 'Ingresa los minutos de la sesion.', 'error');
    return;
  }

  setLoading('guardarTiempo', true);
  try {
    await api('/api/sesion', {
      method: 'POST',
      body: JSON.stringify({
        duracion_minutos: duracion,
        tipo_ejercicio: tipo || 'Ejercicio',
        fecha: today()
      })
    });
    document.getElementById('minutosEjercicio').value = '';
    document.getElementById('tipoEjercicio').value = '';
    setMessage('tiempoMessage', 'Sesion guardada correctamente.', 'success');
    await cargarTotalTiempo();
  } catch (error) {
    setMessage('tiempoMessage', error.message, 'error');
  } finally {
    setLoading('guardarTiempo', false);
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  showNotification('', 'error');
  await api('/api/logout', { method: 'POST' });
  localStorage.removeItem('token');
  location.reload();
});

const editModal = document.getElementById('editProfileModal');
const editForm = document.getElementById('editProfileForm');

document.getElementById('editProfileBtn').addEventListener('click', async () => {
  showNotification('', 'error');
  try {
    const data = await api('/api/perfil');
    document.getElementById('editNombre').value = data.nombre || '';
    document.getElementById('editPesoInicial').value = data.peso_inicial || '';
    document.getElementById('editFechaNac').value = data.fecha_nac || '';
    editModal.hidden = false;
    document.getElementById('editNombre').focus();
  } catch (error) {
    console.error('Error al cargar perfil:', error);
    showNotification(error.message, 'error');
    setMessage('editProfileMessage', error.message, 'error');
  }
});

document.getElementById('closeEditModal').addEventListener('click', () => {
  editModal.hidden = true;
  showNotification('', 'error');
});

editModal.addEventListener('click', (e) => {
  if (e.target === editModal) editModal.hidden = true;
});

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage('editProfileMessage', '', 'error');
  setLoading('editProfileSubmitBtn', true);

  try {
    const data = await api('/api/perfil', {
      method: 'PUT',
      body: JSON.stringify({
        nombre: document.getElementById('editNombre').value,
        peso_inicial: parseFloat(document.getElementById('editPesoInicial').value),
        fecha_nac: document.getElementById('editFechaNac').value
      })
    });
    document.getElementById('userName').textContent = data.user.nombre;
    currentUser.nombre = data.user.nombre;
    currentUser.peso_inicial = data.user.peso_inicial;
    setMessage('editProfileMessage', 'Perfil actualizado correctamente.', 'success');
    setTimeout(() => { editModal.hidden = true; }, 1200);
  } catch (error) {
    setMessage('editProfileMessage', error.message, 'error');
  } finally {
    setLoading('editProfileSubmitBtn', false);
  }
});

(async () => {
  fechaPeso.value = today();
  await cargarEjercicios();

  try {
    const data = await api('/api/verificar');
    if (data.loggedIn) {
      await mostrarPanel(data.user);
    } else {
      authScreen.hidden = false;
      mainPanel.hidden = true;
    }
  } catch {
    authScreen.hidden = false;
    mainPanel.hidden = true;
  }
})();
