const { Pool } = require('pg');

let connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
if (connectionString) {
  connectionString = connectionString.replace(/sslmode=[^&]+/g, 'sslmode=no-verify');
  if (!connectionString.includes('sslmode=')) {
    connectionString += (connectionString.includes('?') ? '&' : '?') + 'sslmode=no-verify';
  }
}

const pool = new Pool({ connectionString });

let initialized = false;

async function ensureInit() {
  if (initialized) return;
  initialized = true;
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nombre TEXT NOT NULL,
        fecha_nac TEXT NOT NULL,
        peso_inicial NUMERIC(5,1) NOT NULL,
        sexo CHAR(1) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS peso_semanal (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        fecha TEXT NOT NULL,
        peso NUMERIC(5,1) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS sesiones (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        fecha TEXT NOT NULL,
        duracion_minutos INTEGER NOT NULL,
        tipo_ejercicio TEXT DEFAULT 'Ejercicio',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (err) {
    initialized = false;
    throw err;
  } finally {
    client.release();
  }
}

async function query(text, params) {
  await ensureInit();
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function createUser(user) {
  const existing = await query('SELECT id FROM usuarios WHERE email = $1', [user.email]);
  if (existing.rows.length > 0) {
    const error = new Error('Email ya registrado');
    error.code = 'DUPLICATE_EMAIL';
    throw error;
  }
  const result = await query(
    `INSERT INTO usuarios (email, password, nombre, fecha_nac, peso_inicial, sexo)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [user.email, user.password, user.nombre, user.fecha_nac, user.peso_inicial, user.sexo]
  );
  return result.rows[0];
}

async function findUserByEmail(email) {
  const result = await query('SELECT * FROM usuarios WHERE email = $1', [email]);
  return result.rows[0] || null;
}

async function findUserById(id) {
  const result = await query('SELECT * FROM usuarios WHERE id = $1', [Number(id)]);
  return result.rows[0] || null;
}

async function updateUser(id, fields) {
  const sets = [];
  const values = [];
  let idx = 1;
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      sets.push(`${key} = $${idx++}`);
      values.push(value);
    }
  }
  if (!sets.length) return;
  values.push(Number(id));
  await query(
    `UPDATE usuarios SET ${sets.join(', ')} WHERE id = $${idx}`,
    values
  );
}

async function addWeight(entry) {
  await query(
    'INSERT INTO peso_semanal (usuario_id, fecha, peso) VALUES ($1, $2, $3)',
    [entry.usuario_id, entry.fecha, entry.peso]
  );
}

async function getWeights(userId) {
  const result = await query(
    'SELECT fecha, peso FROM peso_semanal WHERE usuario_id = $1 ORDER BY fecha ASC',
    [Number(userId)]
  );
  return result.rows;
}

async function addSession(entry) {
  await query(
    'INSERT INTO sesiones (usuario_id, fecha, duracion_minutos, tipo_ejercicio) VALUES ($1, $2, $3, $4)',
    [entry.usuario_id, entry.fecha, entry.duracion_minutos, entry.tipo_ejercicio || 'Ejercicio']
  );
}

async function getTotalMinutes(userId) {
  const result = await query(
    'SELECT COALESCE(SUM(duracion_minutos), 0) AS total FROM sesiones WHERE usuario_id = $1',
    [Number(userId)]
  );
  return Number(result.rows[0].total);
}

module.exports = { createUser, findUserByEmail, findUserById, updateUser, addWeight, getWeights, addSession, getTotalMinutes };
