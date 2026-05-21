const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'ejercicios.json');

const initialData = {
  usuarios: [],
  peso_semanal: [],
  sesiones: [],
  counters: {
    usuarios: 1,
    peso_semanal: 1,
    sesiones: 1
  }
};

function ensureDb() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
  }
}

function read() {
  ensureDb();
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function write(data) {
  ensureDb();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function nextId(data, table) {
  const id = data.counters[table] || 1;
  data.counters[table] = id + 1;
  return id;
}

module.exports = {
  createUser(user) {
    const data = read();
    if (data.usuarios.some((item) => item.email === user.email)) {
      const error = new Error('Email ya registrado');
      error.code = 'DUPLICATE_EMAIL';
      throw error;
    }
    const saved = { id: nextId(data, 'usuarios'), ...user };
    data.usuarios.push(saved);
    write(data);
    return saved;
  },

  findUserByEmail(email) {
    return read().usuarios.find((user) => user.email === email) || null;
  },

  findUserById(id) {
    return read().usuarios.find((user) => user.id === Number(id)) || null;
  },

  addWeight(entry) {
    const data = read();
    data.peso_semanal.push({ id: nextId(data, 'peso_semanal'), ...entry });
    write(data);
  },

  getWeights(userId) {
    return read().peso_semanal
      .filter((item) => item.usuario_id === Number(userId))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map(({ fecha, peso }) => ({ fecha, peso }));
  },

  addSession(entry) {
    const data = read();
    data.sesiones.push({ id: nextId(data, 'sesiones'), ...entry });
    write(data);
  },

  getTotalMinutes(userId) {
    return read().sesiones
      .filter((item) => item.usuario_id === Number(userId))
      .reduce((total, item) => total + Number(item.duracion_minutos || 0), 0);
  }
};
