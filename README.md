# Método para Adelgazar - Seguimiento Personal

Aplicación web para el registro de peso, seguimiento de actividad física y recomendaciones de ejercicios personalizados según el rango de peso del usuario.

## Stack

- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL (Vercel Postgres / Neon)
- **Frontend:** HTML + CSS + JavaScript vanilla
- **Auth:** JWT + cookies HttpOnly
- **Deploy:** Vercel

## Requisitos

- Node.js 18+
- PostgreSQL (local o Vercel Postgres)

## Desarrollo local

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo .env con tu conexion a PostgreSQL
cp .env.example .env
# Editar .env con tus credenciales

# 3. Iniciar servidor
npm run dev
# Servidor en http://localhost:3000
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `POSTGRES_URL` | URL de conexión a PostgreSQL |
| `JWT_SECRET` | Secreto para firmar tokens JWT |
| `PORT` | Puerto del servidor (default 3000) |

## API

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/registro` | No | Registrar usuario |
| POST | `/api/login` | No | Iniciar sesión |
| POST | `/api/logout` | No | Cerrar sesión |
| GET | `/api/verificar` | No | Verificar sesión activa |
| GET | `/api/perfil` | Sí | Obtener perfil del usuario |
| POST | `/api/peso` | Sí | Registrar peso |
| GET | `/api/peso/historial` | Sí | Historial de peso |
| POST | `/api/sesion` | Sí | Registrar sesión de ejercicio |
| GET | `/api/sesiones/total` | Sí | Minutos totales acumulados |

## Estructura del proyecto

```
├── api/
│   ├── index.js          # Express app (entry point Vercel)
│   └── db.js             # Capa de base de datos PostgreSQL
├── public/
│   ├── index.html        # Frontend
│   ├── script.js         # Lógica del cliente
│   ├── style.css         # Estilos
│   └── ejercicios.json   # Catálogo de ejercicios por rango
├── server.js             # Servidor local
├── vercel.json           # Configuración de Vercel
└── package.json
```

## Deploy en Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Conecta tu repositorio de GitHub
2. Vercel detectará automáticamente la configuración
3. Agrega una base de datos Postgres desde el dashboard de Vercel (Storage → Postgres → Create)
4. Las variables de entorno se configuran automáticamente
5. ¡Deploy automático en cada push a main!
