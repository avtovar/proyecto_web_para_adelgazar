# Método para Adelgazar - Seguimiento Personal

Aplicación web para el registro de peso, seguimiento de actividad física y recomendaciones de ejercicios personalizados según el rango de peso del usuario.

## 🚀 Cómo ejecutar el proyecto

### 1. Requisitos previos
- Tener instalado [Node.js](https://nodejs.org/) (versión 16 o superior recomendada).

### 2. Instalación
Descarga o clona el proyecto en una carpeta y abre una terminal en esa ubicación.

### 3. Ejecutar el servidor
Ejecuta el siguiente comando en tu terminal (PowerShell, CMD o terminal de VS Code):
```bash
node server.js
```
Deberías ver el mensaje: `Servidor corriendo en http://localhost:3000`

### 4. Abrir la aplicación
Abre tu navegador web y entra a la siguiente dirección:
[http://localhost:3000](http://localhost:3000)

---

## 📊 Cómo ver la Base de Datos

El proyecto utiliza un sistema de almacenamiento basado en archivos JSON para simplificar la gestión sin necesidad de instalar motores de bases de datos externos.

### Ubicación de los datos
Todos los datos registrados (usuarios, historial de peso y sesiones) se guardan en la carpeta:
`f:\metodo_para_adelgazar\data\`

### Archivos principales:
- **`data/ejercicios.json`**: Contiene la información de los usuarios registrados, sus pesos y sus sesiones de entrenamiento. 
  - *Nota: Las contraseñas se guardan encriptadas por seguridad.*
- **`public/ejercicios.json`**: Este archivo es de **solo lectura** para la aplicación y contiene la lógica de qué ejercicios mostrar según el rango de peso.

### Cómo consultarlos:
1. Navega hasta la carpeta `data`.
2. Abre el archivo `ejercicios.json` con cualquier editor de texto (Bloc de notas, VS Code, Sublime Text).
3. Verás una estructura como esta:
   ```json
   {
     "usuarios": [...],
     "peso_semanal": [...],
     "sesiones": [...]
   }
   ```

---

## 🛠️ Solución de problemas comunes

### Error: `EADDRINUSE: address already in use :::3000`
Este error ocurre si el servidor ya se está ejecutando en otra terminal o quedó "colgado". 
**Solución en Windows (PowerShell):**
```powershell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force
```
Luego vuelve a ejecutar `node server.js`.

### Error: `Failed to fetch`
Ocurre si intentas registrarte y el servidor no está encendido o si abriste el archivo `index.html` directamente desde la carpeta en lugar de usar `http://localhost:3000`.
