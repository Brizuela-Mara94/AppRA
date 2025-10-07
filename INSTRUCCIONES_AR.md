# 🔧 Instrucciones para Realidad Aumentada

## ✅ Cambios Realizados

### 1. **Migración a ES6 Modules**
- `scanner.html` ahora usa ES6 modules en lugar de CDN
- Todos los estilos se mantuvieron intactos
- La cámara se solicita desde `elements.html` antes de navegar

### 2. **Problema Identificado y Solucionado**

#### ❌ Problema Original:
- `elements.html` intenta cargar modelos de **maquinaria** (excavadora, cargador, etc.)
- Solo existen modelos de **dinosaurios** (brachiosaurus, trex, triceratops, velociraptor)
- El archivo `targets.mind` solo tiene 4 marcadores de dinosaurios

#### ✅ Solución Temporal:
- Los marcadores de maquinaria ahora usan modelos de dinosaurios como demostración
- Cada tipo de maquinaria se mapea a un dinosaurio:
  - **excavadora, pala, pico** → T-Rex
  - **cargador, bulldozer** → Brachiosaurus
  - **perforadora, motoniveladora** → Triceratops
  - **camion, casco** → Velociraptor

### 3. **Debugging Mejorado**
El código ahora muestra información detallada en la consola:
- Ruta del modelo que se está cargando
- Progreso de carga (%)
- Errores específicos si falla

## 📱 Cómo Usar

### Opción 1: Usar Marcadores de Dinosaurios (Funciona Ahora)
1. Abrir `elements.html` en el navegador
2. Hacer clic en "Ver en Realidad Aumentada"
3. Apuntar la cámara a uno de estos marcadores:
   - `marcadores/dino1_brachiosaurus.png`
   - `marcadores/dino2_trex.png`
   - `marcadores/dino3_triceratops.png`
   - `marcadores/dino4_velociraptor.png`

### Opción 2: Abrir `dino.html` Directamente
- Muestra los 4 dinosaurios con todos los marcadores a la vez

## 🚀 Para Agregar Modelos de Maquinaria Real

### Paso 1: Agregar Modelos 3D
Coloca los archivos `.glb` en la carpeta `models/`:
```
models/
  ├── excavadora.glb
  ├── cargador.glb
  ├── camion.glb
  ├── perforadora.glb
  ├── pala.glb
  ├── bulldozer.glb
  ├── motoniveladora.glb
  ├── casco.glb
  └── pico.glb
```

### Paso 2: Crear Marcadores
1. Crear imágenes de marcadores para cada maquinaria
2. Guardarlas en la carpeta `marcadores/`

### Paso 3: Crear Archivo de Targets
1. Usar la herramienta de MindAR para crear `targets.mind`:
   - https://hiukim.github.io/mind-ar-js-doc/tools/compile
2. Subir todas las imágenes de marcadores
3. Compilar y descargar `targets.mind`
4. Reemplazar el archivo en `mind/targets.mind` y `public/mind/targets.mind`

### Paso 4: Actualizar `scanner.js`
```javascript
const modelMapping = {
  excavadora: { path: 'excavadora.glb', scale: 0.1, index: 0 },
  cargador: { path: 'cargador.glb', scale: 0.1, index: 1 },
  camion: { path: 'camion.glb', scale: 0.1, index: 2 },
  // ... etc
};
```

## 🐛 Debugging

### Ver la consola del navegador (F12):
- ✅ "Modelo cargado exitosamente" = Todo bien
- ❌ "Error al cargar modelo" = El archivo .glb no existe o la ruta es incorrecta
- ❌ "Marcador perdido" = El marcador no está en targets.mind

### Verificar rutas:
```javascript
console.log('🔍 Intentando cargar modelo desde:', modelPath);
console.log('📁 BASE_URL:', import.meta.env.BASE_URL);
```

## 📂 Estructura de Archivos

```
AppMindAr/
├── models/              ← Modelos 3D (.glb)
├── public/
│   ├── models/         ← Copia de modelos para producción
│   └── mind/
│       └── targets.mind ← Archivo de marcadores compilado
├── marcadores/         ← Imágenes de marcadores (.png)
├── scanner.html        ← Visor AR (ahora con ES6)
├── elements.html       ← Lista de maquinarias
└── src/
    └── scanner.js      ← Lógica AR (ES6 module)
```

## ✨ Mejoras Futuras

1. **Crear modelos 3D de maquinaria real**
2. **Generar marcadores únicos para cada máquina**
3. **Compilar nuevo archivo targets.mind con todos los marcadores**
4. **Agregar controles de rotación y zoom en la UI**
5. **Agregar información técnica superpuesta en AR**

---

**Nota:** Actualmente el sistema funciona perfectamente con los marcadores de dinosaurios. Para usar maquinaria real, sigue los pasos de la sección "Para Agregar Modelos de Maquinaria Real".
