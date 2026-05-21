const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./database');

const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
const sessions = new Map();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function sendJson(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(data));
}

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map((cookie) => {
    const [key, ...value] = cookie.trim().split('=');
    return [key, decodeURIComponent(value.join('='))];
  }));
}

function getSession(req) {
  const sid = parseCookies(req).sid;
  return sid ? sessions.get(sid) : null;
}

function createSession(res, user) {
  const sid = crypto.randomUUID();
  const safeUser = {
    id: user.id,
    nombre: user.nombre,
    sexo: user.sexo,
    peso_inicial: user.peso_inicial
  };
  sessions.set(sid, { userId: user.id, user: safeUser, expires: Date.now() + 86400000 });
  res.setHeader('Set-Cookie', `sid=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`);
  return safeUser;
}

function clearExpiredSessions() {
  const now = Date.now();
  for (const [sid, session] of sessions.entries()) {
    if (session.expires < now) sessions.delete(sid);
  }
}

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
  const nac = new Date(fecha);
  if (Number.isNaN(nac.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const mes = hoy.getMonth() - nac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('Solicitud demasiado grande'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('JSON invalido'));
      }
    });
    req.on('error', reject);
  });
}

function requireAuth(req, res) {
  const session = getSession(req);
  if (!session) {
    sendJson(res, 401, { error: 'No autenticado' });
    return null;
  }
  return session;
}

async function handleApi(req, res, pathname) {
  try {
    if (req.method === 'POST' && pathname === '/api/registro') {
      const { email, password, nombre, fecha_nac, peso_inicial, sexo } = await readBody(req);

      if (!email || !password || !nombre || !fecha_nac || !peso_inicial || !sexo) {
        return sendJson(res, 400, { error: 'Completa todos los campos' });
      }
      if (password.length < 6) {
        return sendJson(res, 400, { error: 'La contrasena debe tener al menos 6 caracteres' });
      }
      if (!['M', 'F'].includes(sexo)) {
        return sendJson(res, 400, { error: 'Selecciona un sexo valido' });
      }
      if (!Number.isFinite(Number(peso_inicial)) || Number(peso_inicial) < 40 || Number(peso_inicial) > 250) {
        return sendJson(res, 400, { error: 'Ingresa un peso valido entre 40 y 250 kg' });
      }

      const edad = calcularEdad(fecha_nac);
      if (edad === null) return sendJson(res, 400, { error: 'Fecha de nacimiento invalida' });
      if (edad < 18) return sendJson(res, 400, { error: 'Debes ser mayor de 18 anos' });

      const user = db.createUser({
        email: email.trim().toLowerCase(),
        password: hashPassword(password),
        nombre: nombre.trim(),
        fecha_nac,
        peso_inicial: Number(peso_inicial),
        sexo
      });
      return sendJson(res, 200, { success: true, id: user.id });
    }

    if (req.method === 'POST' && pathname === '/api/login') {
      const { email, password } = await readBody(req);
      if (!email || !password) return sendJson(res, 400, { error: 'Completa email y contrasena' });

      const user = db.findUserByEmail(email.trim().toLowerCase());
      if (!user || !verifyPassword(password, user.password)) {
        return sendJson(res, 401, { error: 'Credenciales incorrectas' });
      }
      const safeUser = createSession(res, user);
      return sendJson(res, 200, { success: true, user: safeUser });
    }

    if (req.method === 'POST' && pathname === '/api/logout') {
      const sid = parseCookies(req).sid;
      if (sid) sessions.delete(sid);
      return sendJson(res, 200, { success: true }, {
        'Set-Cookie': 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
      });
    }

    if (req.method === 'GET' && pathname === '/api/verificar') {
      const session = getSession(req);
      return sendJson(res, 200, session ? { loggedIn: true, user: session.user } : { loggedIn: false });
    }

    if (req.method === 'GET' && pathname === '/api/perfil') {
      const session = requireAuth(req, res);
      if (!session) return;
      const user = db.findUserById(session.userId);
      if (!user) return sendJson(res, 404, { error: 'Usuario no encontrado' });
      const { password, ...safeUser } = user;
      return sendJson(res, 200, safeUser);
    }

    if (req.method === 'POST' && pathname === '/api/peso') {
      const session = requireAuth(req, res);
      if (!session) return;
      const { peso, fecha } = await readBody(req);
      if (!fecha || !Number.isFinite(Number(peso)) || Number(peso) < 40 || Number(peso) > 250) {
        return sendJson(res, 400, { error: 'Ingresa una fecha y un peso valido' });
      }
      db.addWeight({ usuario_id: session.userId, fecha, peso: Number(peso) });
      return sendJson(res, 200, { success: true });
    }

    if (req.method === 'GET' && pathname === '/api/peso/historial') {
      const session = requireAuth(req, res);
      if (!session) return;
      return sendJson(res, 200, db.getWeights(session.userId));
    }

    if (req.method === 'POST' && pathname === '/api/sesion') {
      const session = requireAuth(req, res);
      if (!session) return;
      const { duracion_minutos, tipo_ejercicio, fecha } = await readBody(req);
      if (!fecha || !Number.isInteger(Number(duracion_minutos)) || Number(duracion_minutos) < 1 || Number(duracion_minutos) > 300) {
        return sendJson(res, 400, { error: 'Ingresa una duracion valida entre 1 y 300 minutos' });
      }
      db.addSession({
        usuario_id: session.userId,
        fecha,
        duracion_minutos: Number(duracion_minutos),
        tipo_ejercicio: tipo_ejercicio || 'Ejercicio'
      });
      return sendJson(res, 200, { success: true });
    }

    if (req.method === 'GET' && pathname === '/api/sesiones/total') {
      const session = requireAuth(req, res);
      if (!session) return;
      return sendJson(res, 200, { total_minutos: db.getTotalMinutes(session.userId) });
    }

    return sendJson(res, 404, { error: 'Ruta no encontrada' });
  } catch (error) {
    const status = error.code === 'DUPLICATE_EMAIL' ? 400 : 500;
    sendJson(res, status, { error: error.message || 'Error interno' });
  }
}

function serveStatic(req, res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(publicDir, requested));

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end('Acceso denegado');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Archivo no encontrado');
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  clearExpiredSessions();
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname.startsWith('/api/')) {
    handleApi(req, res, pathname);
    return;
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
