const DEBUG = process.env.LOG_DEBUG === 'true' || process.env.DEBUG === 'true';

function ts() {
  return new Date().toISOString();
}

function log(level, tag, message, extra) {
  const base = `[${ts()}] [${level}] [${tag}] ${message}`;
  if (extra !== undefined) {
    // eslint-disable-next-line no-console
    console.log(`${base} ${JSON.stringify(extra)}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(base);
  }
}

module.exports = {
  info: (tag, message, extra) => log('INFO', tag, message, extra),
  warn: (tag, message, extra) => log('WARN', tag, message, extra),
  error: (tag, message, extra) => log('ERROR', tag, message, extra),
  debug: (tag, message, extra) => {
    if (DEBUG) log('DEBUG', tag, message, extra);
  },
  auth: (tag, message, extra) => log('AUTH', tag, message, extra),
  db: (tag, message, extra) => log('DB', tag, message, extra),
  http: (tag, message, extra) => log('HTTP', tag, message, extra)
};
