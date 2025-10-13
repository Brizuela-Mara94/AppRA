# AppMindAr - Realidad Aumentada para Minería

Aplicación de Realidad Aumentada educativa para estudiantes de Ingeniería de Minas de la UNSJ.

## 🚀 Características

- **Dos sistemas de AR**: MindAR (marcadores de imagen) y AR.js (códigos de barras)
- **7 modelos 3D de equipamiento minero**
- **Controles interactivos**: Zoom, rotación, captura de pantalla
- **Persistencia**: Los modelos permanecen visibles después de perder el marcador
- **Responsive**: Funciona en desktop y móvil

## 📦 Instalación Local

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Construir para producción
npm run build

# Vista previa del build
npm run preview
```

## 🌐 Despliegue en GitHub Pages

### Método 1: Automático (Recomendado)

Este proyecto está configurado con GitHub Actions para desplegar automáticamente a GitHub Pages cuando hagas push a la rama `main`.

1. **Habilitar GitHub Pages en tu repositorio:**
   - Ve a `Settings` → `Pages`
   - En `Source`, selecciona `gh-pages` branch
   - Guarda los cambios

2. **Hacer push de tus cambios:**
   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin main
   ```

3. **Esperar el despliegue:**
   - Ve a la pestaña `Actions` en GitHub
   - Espera a que termine el workflow (tarda 2-3 minutos)
   - Tu app estará disponible en: `https://Brizuela-Mara94.github.io/AppRA/`

### Método 2: Manual

```bash
# Construir la aplicación
npm run build

# Desplegar a GitHub Pages
npm install -g gh-pages
gh-pages -d dist
```

## 📱 Uso de la Aplicación

1. **Página de inicio**: Muestra logos de UNSJ y SIED
2. **Galería de equipos**: Visualiza todos los equipos mineros disponibles
3. **Selección de modo AR**: Elige entre MindAR o AR.js
4. **Escaneo AR**: Apunta la cámara al marcador correspondiente
5. **Interacción**: Usa los controles para zoom, rotación y captura

## 🎯 Marcadores

### MindAR (Imágenes compiladas)
Los marcadores están en la carpeta `marcadores/`:
- Casco (lamp)
- Pico
- Camión (truck)
- Túnel
- Garras
- Perforadora
- Camión de carga

### AR.js (Códigos de barras 3x3)
Barcodes del 20 al 26 (uno para cada equipo)

## 🛠️ Estructura del Proyecto

```
AppMindAr/
├── index.html              # Página de inicio
├── mining.html             # Página de bienvenida minera
├── elements.html           # Galería de equipos
├── scanner.html            # Escáner MindAR
├── arjs-scanner.html       # Escáner AR.js
├── src/
│   ├── scanner.js          # Lógica MindAR
│   ├── arjs-main.js        # Lógica AR.js
│   └── style.css           # Estilos
├── public/
│   ├── models/             # Modelos 3D (.glb)
│   └── mind/               # Targets compilados MindAR
├── assets/                 # Imágenes y recursos
├── marcadores/             # Marcadores para imprimir
└── .github/
    └── workflows/
        └── deploy.yml      # CI/CD automático
```

## 🔧 Configuración

El archivo `vite.config.js` está configurado para funcionar tanto en desarrollo local como en GitHub Pages:

```javascript
base: process.env.NODE_ENV === 'production' ? '/AppRA/' : './'
```

## 📝 Notas Importantes

- **Permisos de cámara**: La app necesita acceso a la cámara para funcionar
- **HTTPS requerido**: GitHub Pages usa HTTPS automáticamente (necesario para la cámara)
- **Modelos en public/**: Los archivos `.glb` deben estar en `public/models/`
- **Rutas relativas**: Todos los archivos usan rutas relativas (`./`) para compatibilidad

## 🐛 Solución de Problemas

### Los modelos no cargan
- Verifica que los archivos estén en `public/models/`
- Revisa la consola del navegador para errores
- Asegúrate de que los nombres de archivo coincidan

### El botón AR no funciona
- Otorga permisos de cámara cuando lo solicite
- Usa HTTPS (GitHub Pages lo proporciona automáticamente)
- Verifica que estés en un navegador compatible (Chrome/Safari)

### La página no se despliega
- Revisa que GitHub Pages esté habilitado
- Verifica el estado del workflow en la pestaña Actions
- Asegúrate de que la rama `gh-pages` exista

## 👥 Créditos

Desarrollado para el Sistema de Educación a Distancia (SIED) de la Universidad Nacional de San Juan (UNSJ).

## 📄 Licencia

Proyecto educativo - UNSJ 2025
