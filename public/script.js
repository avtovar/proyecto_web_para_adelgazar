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

function setMessage(id, text, type = 'success') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = `message ${type}`;
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No se pudo completar la operacion');
  return data;
}

async function cargarEjercicios() {
  try {
    const res = await fetch('/ejercicios.json');
    ejerciciosData = await res.json();
  } catch (error) {
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
      <div class="exercise-time">${ejercicio.duracion_sugerida || 10} min</div>
      <h4>${ejercicio.nombre}</h4>
      <p>${ejercicio.explicacion}</p>
      <span>${ejercicio.series}</span>
    </article>
  `).join('');
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
    return { x, y, ...item };
  });

  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const circles = points.map((point) => `
    <circle cx="${point.x}" cy="${point.y}" r="5">
      <title>${point.fecha}: ${Number(point.peso).toFixed(1)} kg</title>
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
  await cargarHistorialPeso();
  await cargarTotalTiempo();
}

loginTab.addEventListener('click', () => activarTab('login'));
registerTab.addEventListener('click', () => activarTab('register'));

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage('registerError', '', 'error');

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
  }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage('loginError', '', 'error');

  try {
    const data = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
      })
    });
    await mostrarPanel(data.user);
  } catch (error) {
    setMessage('loginError', error.message, 'error');
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
  }
});

document.getElementById('guardarTiempo').addEventListener('click', async () => {
  const duracion = parseInt(document.getElementById('minutosEjercicio').value, 10);
  const tipo = document.getElementById('tipoEjercicio').value.trim();
  if (!duracion) {
    setMessage('tiempoMessage', 'Ingresa los minutos de la sesion.', 'error');
    return;
  }

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
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' });
  location.reload();
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
  } catch (error) {
    authScreen.hidden = false;
    mainPanel.hidden = true;
  }
})();
