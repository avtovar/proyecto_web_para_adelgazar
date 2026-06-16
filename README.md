# Método para Adelgazar

Aplicación web para registro de peso, seguimiento de actividad física y rutinas de ejercicios adaptadas al rango de peso del usuario.

**Stack:** Node.js + Express · PostgreSQL (Neon) · HTML/CSS/JS vanilla · JWT · Vercel

---

## Características

- **Registro y autenticación** con JWT en cookies HttpOnly
- **Edición de perfil** (nombre, peso inicial, fecha de nacimiento)
- **Registro de peso** con gráfico de evolución SVG
- **Rutinas dinámicas** de ejercicios con/sin pesas según el peso actual
- **60+ ejercicios** distribuidos en 6 rangos de peso (40–250 kg)
- **Videos explicativos** integrados vía YouTube en cada ejercicio
- **Sesiones de entrenamiento** con acumulación de minutos totales
- **Diseño responsive** con modo oscuro claro

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express |
| Base de datos | PostgreSQL (Vercel Postgres / Neon) |
| Autenticación | JWT + cookies HttpOnly/Secure |
| Frontend | HTML5 + CSS3 + JavaScript ES2020 |
| SVG | Gráfico de peso generado dinámicamente |
| Deploy | Vercel (serverless functions) |

---

## Requisitos

- Node.js 18+
- PostgreSQL (local o Vercel Postgres)

---

## Desarrollo local

```bash
# 1. Clonar e instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu conexión PostgreSQL y JWT_SECRET

# 3. Iniciar servidor
npm run dev
# Servidor en http://localhost:3000
```

> Las tablas (`usuarios`, `peso_semanal`, `sesiones`) se crean automáticamente en la primera consulta.

---

## Variables de entorno

| Variable | Descripción |
|----------|------------|
| `POSTGRES_URL` | URL de conexión a PostgreSQL (con `sslmode=no-verify` para Neon) |
| `JWT_SECRET` | Secreto para firmar tokens JWT (opcional; se genera automático si no se provee) |
| `PORT` | Puerto del servidor (default 3000) |
| `NODE_ENV` | `development` o `production` (controla cookies seguras) |

---

## API

### Autenticación

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/registro` | No | Crear cuenta (email, password, nombre, fecha_nac, peso_inicial, sexo) |
| POST | `/api/login` | No | Iniciar sesión (email, password) |
| POST | `/api/logout` | No | Cerrar sesión (limpia cookie) |
| GET | `/api/verificar` | No | Verificar si hay sesión activa |

### Perfil

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/perfil` | Sí | Obtener datos del perfil |
| PUT | `/api/perfil` | Sí | Actualizar nombre, peso_inicial, fecha_nac |

### Peso

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/peso` | Sí | Registrar peso (fecha, peso) |
| GET | `/api/peso/historial` | Sí | Historial completo de peso |

### Sesiones

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/sesion` | Sí | Registrar sesión (duracion_minutos, tipo_ejercicio, fecha) |
| GET | `/api/sesiones/total` | Sí | Minutos totales acumulados |

---

## Estructura del proyecto

```
├── api/
│   ├── index.js           # Express app (entry point Vercel serverless)
│   └── db.js              # Capa de base de datos PostgreSQL
├── public/
│   ├── index.html         # Frontend SPA
│   ├── script.js          # Lógica del cliente
│   ├── style.css          # Estilos con variables CSS
│   └── ejercicios.json    # Catálogo de 60+ ejercicios con videoId
├── server.js              # Servidor local (Express + static)
├── vercel.json            # Configuración de deploy
└── package.json
```

### Catálogo de ejercicios (`ejercicios.json`)

Cada ejercicio contiene:

```json
{
  "nombre": "Sentadilla goblet",
  "explicacion": "Sujeta la mancuerna contra el pecho y realiza una sentadilla profunda...",
  "series": "3 series de 10-12 repeticiones",
  "duracion_sugerida": 12,
  "videoId": "5HHITKuLxUs"
}
```

- 6 rangos de peso: `40-79`, `80-99`, `100-120`, `121-140`, `141-150`, `151-250`
- 5 ejercicios con pesas + 5 sin pesas por rango
- `videoId` opcional: si está presente, se muestra un botón ▶ que abre un modal con YouTube

---

## Deploy en Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Conecta tu repositorio de GitHub
2. Vercel detecta automáticamente la configuración (`vercel.json`)
3. Agrega una base de datos Postgres desde el dashboard (Storage → Postgres → Create)
4. Las variables de entorno (`POSTGRES_URL`, etc.) se asignan automáticamente
5. Despliegue automático en cada `git push` a `main`
