const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const crypto = require('crypto');
const db = require('./db');

const app = express();

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const NODE_ENV = process.env.NODE_ENV || 'development';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 86400 * 1000
};

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.use(compression());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos. Intenta de nuevo mas tarde.' }
});
app.use('/api/login', authLimiter);
app.use('/api/registro', authLimiter);

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, originalHash] = stored.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
  return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), hash);
}

function calcularEdad(fecha) {
  const nac = new Date(fecha + 'T00:00:00');
  if (Number.isNaN(nac.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const mes = hoy.getMonth() - nac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.clearCookie('token', COOKIE_OPTS);
    return res.status(401).json({ error: 'Sesion invalida' });
  }
}

app.post('/api/registro', asyncHandler(async (req, res) => {
  const { email, password, nombre, fecha_nac, peso_inicial, sexo } = req.body;

  if (!email || !password || !nombre || !fecha_nac || !peso_inicial || !sexo) {
    return res.status(400).json({ error: 'Completa todos los campos' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres' });
  }
  if (!['M', 'F'].includes(sexo)) {
    return res.status(400).json({ error: 'Selecciona un sexo valido' });
  }
  if (!Number.isFinite(Number(peso_inicial)) || Number(peso_inicial) < 40 || Number(peso_inicial) > 250) {
    return res.status(400).json({ error: 'Ingresa un peso valido entre 40 y 250 kg' });
  }

  const edad = calcularEdad(fecha_nac);
  if (edad === null) return res.status(400).json({ error: 'Fecha de nacimiento invalida' });
  if (edad < 18) return res.status(400).json({ error: 'Debes ser mayor de 18 anos' });

  const user = await db.createUser({
    email: email.trim().toLowerCase(),
    password: hashPassword(password),
    nombre: nombre.trim(),
    fecha_nac,
    peso_inicial: Number(peso_inicial),
    sexo
  });
  return res.json({ success: true, id: user.id });
}));

app.post('/api/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Completa email y contrasena' });

  const user = await db.findUserByEmail(email.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const token = jwt.sign(
    { id: user.id, nombre: user.nombre, sexo: user.sexo, peso_inicial: Number(user.peso_inicial) },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.cookie('token', token, COOKIE_OPTS);
  return res.json({
    success: true,
    user: { id: user.id, nombre: user.nombre, sexo: user.sexo, peso_inicial: Number(user.peso_inicial) }
  });
}));

app.post('/api/logout', (req, res) => {
  res.clearCookie('token', COOKIE_OPTS);
  return res.json({ success: true });
});

app.get('/api/verificar', asyncHandler(async (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.json({ loggedIn: false });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.json({
      loggedIn: true,
      user: { id: decoded.id, nombre: decoded.nombre, sexo: decoded.sexo, peso_inicial: decoded.peso_inicial }
    });
  } catch {
    return res.json({ loggedIn: false });
  }
}));

app.get('/api/perfil', requireAuth, asyncHandler(async (req, res) => {
  const user = await db.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  const { password, ...safeUser } = user;
  return res.json(safeUser);
}));

app.put('/api/perfil', requireAuth, asyncHandler(async (req, res) => {
  const { nombre, peso_inicial, fecha_nac } = req.body;
  const fields = {};

  if (nombre !== undefined) {
    if (!nombre.trim()) return res.status(400).json({ error: 'El nombre no puede estar vacio' });
    fields.nombre = nombre.trim();
  }
  if (peso_inicial !== undefined) {
    const p = Number(peso_inicial);
    if (!Number.isFinite(p) || p < 40 || p > 250) {
      return res.status(400).json({ error: 'Ingresa un peso valido entre 40 y 250 kg' });
    }
    fields.peso_inicial = p;
  }
  if (fecha_nac !== undefined) {
    const edad = calcularEdad(fecha_nac);
    if (edad === null) return res.status(400).json({ error: 'Fecha de nacimiento invalida' });
    if (edad < 18) return res.status(400).json({ error: 'Debes ser mayor de 18 anos' });
    fields.fecha_nac = fecha_nac;
  }

  await db.updateUser(req.user.id, fields);

  const user = await db.findUserById(req.user.id);
  const { password, ...safeUser } = user;
  return res.json({ success: true, user: safeUser });
}));

app.post('/api/peso', requireAuth, asyncHandler(async (req, res) => {
  const { peso, fecha } = req.body;
  if (!fecha || !Number.isFinite(Number(peso)) || Number(peso) < 40 || Number(peso) > 250) {
    return res.status(400).json({ error: 'Ingresa una fecha y un peso valido' });
  }
  await db.addWeight({ usuario_id: req.user.id, fecha, peso: Number(peso) });
  return res.json({ success: true });
}));

app.get('/api/peso/historial', requireAuth, asyncHandler(async (req, res) => {
  const data = await db.getWeights(req.user.id);
  return res.json(data);
}));

app.post('/api/sesion', requireAuth, asyncHandler(async (req, res) => {
  const { duracion_minutos, tipo_ejercicio, fecha } = req.body;
  if (!fecha || !Number.isInteger(Number(duracion_minutos)) || Number(duracion_minutos) < 1 || Number(duracion_minutos) > 300) {
    return res.status(400).json({ error: 'Ingresa una duracion valida entre 1 y 300 minutos' });
  }
  await db.addSession({
    usuario_id: req.user.id,
    fecha,
    duracion_minutos: Number(duracion_minutos),
    tipo_ejercicio: tipo_ejercicio || 'Ejercicio'
  });
  return res.json({ success: true });
}));

app.get('/api/sesiones/total', requireAuth, asyncHandler(async (req, res) => {
  const total = await db.getTotalMinutes(req.user.id);
  return res.json({ total_minutos: total });
}));

app.use((err, req, res, next) => {
  console.error('Error:', err);
  const status = err.code === 'DUPLICATE_EMAIL' ? 400 : 500;
  res.status(status).json({ error: err.message || 'Error interno del servidor' });
});

module.exports = app;
