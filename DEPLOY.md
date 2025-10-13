# 🚀 INSTRUCCIONES DE DESPLIEGUE EN GITHUB PAGES

## ✅ Cambios Realizados

Se han corregido todas las rutas en los siguientes archivos:

### Archivos HTML:
- ✅ `index.html` - Rutas de assets y enlaces relativos
- ✅ `mining.html` - Imagen de fondo y enlaces
- ✅ `elements.html` - Imágenes de máquinas en el array
- ✅ `scanner.html` - Script de scanner.js
- ✅ `arjs-scanner.html` - Rutas de modelos 3D
- ✅ `dino.html` - Assets y scripts

### Archivos JavaScript:
- ✅ `src/scanner.js` - Ya usa `import.meta.env.BASE_URL` ✓
- ✅ `src/arjs-main.js` - Actualizado para usar `import.meta.env.BASE_URL`

### Configuración:
- ✅ `vite.config.js` - Base configurada para producción `/AppRA/`
- ✅ `.github/workflows/deploy.yml` - Workflow de GitHub Actions creado

---

## 📋 PASOS PARA DESPLEGAR

### Paso 1: Hacer Push a GitHub

```bash
# Subir los cambios al repositorio
git push origin main
```

### Paso 2: Habilitar GitHub Pages

1. Ve a tu repositorio en GitHub: https://github.com/Brizuela-Mara94/AppRA
2. Click en **Settings** (Configuración)
3. En el menú lateral, click en **Pages**
4. En **Source**, selecciona la rama `gh-pages`
5. Click en **Save** (Guardar)

### Paso 3: Esperar el Deploy Automático

1. Ve a la pestaña **Actions** en tu repositorio
2. Verás un workflow llamado "Deploy to GitHub Pages" ejecutándose
3. Espera 2-3 minutos hasta que termine (se pondrá verde ✓)
4. Tu app estará disponible en:

```
https://Brizuela-Mara94.github.io/AppRA/
```

---

## 🔍 VERIFICACIÓN

### Verificar que todo funcionó:

1. **URL Principal**: https://Brizuela-Mara94.github.io/AppRA/
2. **Página de Minería**: https://Brizuela-Mara94.github.io/AppRA/mining.html
3. **Galería**: https://Brizuela-Mara94.github.io/AppRA/elements.html
4. **Scanner MindAR**: https://Brizuela-Mara94.github.io/AppRA/scanner.html
5. **Scanner AR.js**: https://Brizuela-Mara94.github.io/AppRA/arjs-scanner.html

### Probar funcionalidades:

- ✓ Imágenes cargando correctamente
- ✓ Navegación entre páginas
- ✓ Modelos 3D cargando en AR
- ✓ Cámara solicitando permisos
- ✓ Controles de zoom/rotación
- ✓ Botón de captura
- ✓ Botón de reset

---

## 🛠️ SOLUCIÓN DE PROBLEMAS

### El workflow falla:

```bash
# Verificar permisos en Settings → Actions → General
# Asegurar que "Read and write permissions" esté habilitado
```

### La página muestra 404:

```bash
# Verificar que GitHub Pages apunte a la rama gh-pages
# Esperar unos minutos después del primer deploy
```

### Los modelos 3D no cargan:

```bash
# Verificar que los archivos estén en public/models/
# Revisar la consola del navegador (F12) para errores
```

### Problemas con la cámara:

```bash
# GitHub Pages usa HTTPS automáticamente (✓)
# Otorgar permisos de cámara cuando lo solicite
# Probar en Chrome o Safari (navegadores compatibles)
```

---

## 📱 PRÓXIMOS PASOS DESPUÉS DEL DEPLOY

1. **Probar en móvil**: Abre la URL en tu teléfono
2. **Imprimir marcadores**: Imprime los marcadores de la carpeta `marcadores/`
3. **Compartir**: Envía el link a tus compañeros
4. **Actualizar**: Cualquier cambio que hagas y pushees se desplegará automáticamente

---

## 🎓 ESTRUCTURA DE URLs DESPLEGADA

```
Base: https://Brizuela-Mara94.github.io/AppRA/

Páginas:
├── /                           → Página de inicio (UNSJ/SIED)
├── /mining.html                → Bienvenida minera
├── /elements.html              → Galería de equipos
├── /scanner.html               → AR MindAR
├── /arjs-scanner.html          → AR Barcodes
└── /dino.html                  → AR Dinosaurios (bonus)

Assets:
├── /assets/                    → Imágenes (logos, fotos)
├── /models/                    → Modelos 3D (.glb)
├── /mind/                      → Targets MindAR
└── /marcadores/                → Marcadores para imprimir
```

---

## 💡 CONSEJOS

- **Desarrollo local**: Usa `npm run dev` para probar localmente
- **Build local**: Usa `npm run build` para generar la carpeta `dist/`
- **Preview**: Usa `npm run preview` para ver el build antes de deployar
- **Hot reload**: Los cambios en desarrollo se ven inmediatamente
- **Deploy automático**: Cada push a `main` redespliega la app

---

## ✨ ¡LISTO!

Tu aplicación de Realidad Aumentada está configurada para desplegarse automáticamente en GitHub Pages. Solo haz `git push` y espera 2-3 minutos. 🚀

Si tienes problemas, revisa la sección de **Solución de Problemas** o la consola de **Actions** en GitHub.
