import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Variables globales
let mindarThree = null;
let arToolkitSource = null;
let arToolkitContext = null;
let markerRoot = null;
let arjsScene = null; // Scene de AR.js
let arjsCamera = null; // Camera de AR.js
let arjsRenderer = null; // Renderer de AR.js
let isRunning = false;
let model3D = null;
let isRotating = false;
window.isModelLocked = false;
window.persistentModel = null;
let useARjs = false; // Flag para saber qué sistema estamos usando

window.startScanner = async () => {
  if (isRunning && mindarThree) {
    await stopAR();
  }

  // Obtener parámetros de la URL
  const urlParams = new URLSearchParams(window.location.search);
  const markerType = urlParams.get('marker') || 'excavadora';
  const machineName = urlParams.get('name') || 'Maquinaria';
  const usePattern = urlParams.get('usePattern') === 'true'; // Modo marcador individual PNG
  
  // Update HTML elements
  const modelNameEl = document.getElementById('modelName');
  const statusTextEl = document.getElementById('statusText');
  const loadingEl = document.getElementById('loading');
  const modelInfoEl = document.getElementById('modelInfo');
  
  if (modelNameEl) {
    modelNameEl.textContent = machineName;
  }
  
  function updateStatus(message) {
    if (statusTextEl) {
      statusTextEl.textContent = message;
    }
  }
  
  function showError(message) {
    if (loadingEl) {
      loadingEl.classList.add('hidden');
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
      <h3>⚠️ Error</h3>
      <p>${message}</p>
      <button class="close-btn" style="margin-top: 10px; padding: 10px 20px; cursor: pointer;" onclick="window.history.back()">Volver</button>
    `;
    document.body.appendChild(errorDiv);
  }

  try {
    console.log('🚀 Iniciando Scanner AR...');
    updateStatus('Solicitando acceso a la cámara...');

    // Mapeo de marcadores a modelos
    // IMPORTANTE: Los índices corresponden al ORDEN en que subiste las imágenes al compilador MindAR:
    // Índice 0 = lamp
    // Índice 1 = pico
    // Índice 2 = truck
    // Índice 3 = tunel
    // Índice 4 = garras
    // indice 5 = perforadora
    // indice 6 = carga
    // Asegúrate de que los índices coincidan con los del archivo targets.mind
    const modelMapping = {
      
      // Maquinaria - según el orden de compilación de targets.mind
      // ÍNDICE 0 - Marcador: lamp
      casco: { path: 'lamp.glb', scale: 0.3, index: 0, rotation: { x: 0, y: 0, z: 0 } },
      
      // ÍNDICE 1 - Marcador: pico
      pico: { path: 'pico.glb', scale: 0.3, index: 1, rotation: { x: 0, y: 0, z: 0 } },
      
      // ÍNDICE 2 - Marcador: truck (Rodillo Compactador)
      truck: { path: 'truck.glb', scale: 1, index: 2, rotation: { x: 0, y: 0, z: 0 } },
      
      // ÍNDICE 3 - Marcador: tunel
      tunel: { path: 'tunel.glb', scale: 0.3, index: 3, rotation: { x: 0, y: 0, z: 0 } },
      //pala: { path: 'tuneldoble.glb', scale: 0.1, index: 3, rotation: { x: 0, y: 0, z: 0 } },
      
      // ÍNDICE 6 - Marcador: carga (Camión Minero)
      camion: { path: 'carga.glb', scale: 1, index: 6, rotation: { x: 0, y: 0, z: 0 } },
      //bulldozer: { path: 'bulldozer.glb', scale: 0.1, index: 4, rotation: { x: 0, y: 0, z: 0 } },
      
      // Otros (asignar a índices existentes)
      perforadora: { path: 'perforadora.glb', scale: 1.0, index: 5, rotation: { x: 0, y: 0, z: 0 } },
      garras: { path: 'garras.glb', scale: 1.0, index: 4, rotation: { x: 0, y: 0, z: 0 } },
      //motoniveladora: { path: 'motoniveladora.glb', scale: 1.0, index: 4, rotation: { x: 0, y: 0, z: 0 } }
    };

    const modelConfig = modelMapping[markerType] || { path: 'trex.glb', scale: 0.1, index: 1, rotation: { x: 0, y: 0, z: 0 } };

    // Mapeo de marcadores a barcode IDs (para AR.js)
    const barcodeMapping = {
      casco: 20,        // lamp.png = barcode 20
      pico: 21,         // pico.png = barcode 21
      truck: 22,        // truck.png = barcode 22
      tunel: 23,        // tunel.png = barcode 23
      garras: 24,       // carga.png = barcode 24
      perforadora: 25,  // perforadora = barcode 25
      camion: 26        // garras = barcode 26
    };

    // Determinar qué sistema de marcadores usar
    let mindarConfig;
    let useSingleMarker = false;
    
    if (usePattern) {
      // ========== MODO AR.JS CON BARCODE MARKERS ==========
      console.log('🎯 Usando AR.js con barcode markers');
      const barcodeValue = barcodeMapping[markerType];
      if (!barcodeValue) {
        console.error('❌ No se encontró barcode para:', markerType);
        updateStatus('Error: Marcador no encontrado');
        return;
      }
      
      console.log(`📦 Barcode seleccionado: ${barcodeValue} para ${markerType}`);
      updateStatus(`Iniciando AR.js (Barcode ${barcodeValue})...`);
      useARjs = true;
      
      // Inicializar AR.js con barcode markers
      await initARjs(barcodeValue, modelConfig, machineName, updateStatus, showError, loadingEl, modelInfoEl);
      return; // Salir aquí, AR.js maneja todo de forma diferente
      
    } else {
      // ========== MODO MINDAR CON TARGETS.MIND ==========
      console.log('🎯 Usando marcadores compilados (.mind)');
      mindarConfig = {
        container: document.querySelector("#ar-container"),
        imageTargetSrc: `${import.meta.env.BASE_URL}target/targets.mind`,
        filterMinCF: 0.0001,
        filterBeta: 10,
        uiLoading: "no",
        uiScanning: "no",
        uiError: "no",
      };
      updateStatus('Usando marcadores compilados (.mind)...');
      useARjs = false;
    }

    // Crear instancia de MindAR
    mindarThree = new MindARThree(mindarConfig);

    const { renderer, scene, camera } = mindarThree;
    
    // Variable para tracking persistente
    let isModelLocked = false;

    // Iluminación
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    updateStatus('Cargando modelo 3D...');

    // Cargar modelo
    const loader = new GLTFLoader();
    const modelPath = `${import.meta.env.BASE_URL}models/${modelConfig.path}`;
    
    console.log('🔍 Intentando cargar modelo desde:', modelPath);
    console.log('📁 BASE_URL:', import.meta.env.BASE_URL);
    console.log('🎯 Marcador tipo:', markerType);
    console.log('📦 Config del modelo:', modelConfig);
    
    try {
      const gltf = await new Promise((resolve, reject) => {
        loader.load(
          modelPath,
          (gltf) => {
            console.log('✅ Modelo cargado exitosamente:', modelPath);
            resolve(gltf);
          },
          (xhr) => {
            const percent = (xhr.loaded / xhr.total) * 100;
            console.log(`📥 Cargando: ${percent.toFixed(0)}%`);
            updateStatus(`Cargando modelo ${percent.toFixed(0)}%`);
          },
          (error) => {
            console.error('❌ Error al cargar modelo:', error);
            reject(error);
          }
        );
      });
      
      model3D = gltf.scene;
      model3D.scale.set(modelConfig.scale, modelConfig.scale, modelConfig.scale);
      model3D.position.set(0, 0, 0);
      
      // Aplicar rotación inicial si está configurada
      if (modelConfig.rotation) {
        model3D.rotation.set(
          modelConfig.rotation.x,
          modelConfig.rotation.y,
          modelConfig.rotation.z
        );
      }
      
      console.log('✅ Modelo configurado y listo');
      console.log('   - Escala:', modelConfig.scale);
      console.log('   - Posición:', model3D.position);
      console.log('   - Rotación:', model3D.rotation);
      
    } catch (modelError) {
      console.warn('⚠️ No se pudo cargar el modelo, usando geometría simple', modelError);
      updateStatus('Usando modelo de prueba...');
      
      const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
      const material = new THREE.MeshPhongMaterial({ 
        color: 0xd81e27,
        shininess: 100
      });
      model3D = new THREE.Mesh(geometry, material);
      console.log('📦 Geometría simple creada');
    }

    // Crear anchors según el modo
    let anchors = [];
    let targetAnchor = null;
    
    if (useSingleMarker) {
      // Modo marcador individual: solo crear un anchor (índice 0)
      console.log('🎯 Creando 1 anchor para marcador individual PNG...');
      targetAnchor = mindarThree.addAnchor(0);
      anchors = [targetAnchor];
      console.log('✅ Anchor individual creado');
    } else {
      // Modo marcadores compilados: crear todos los anchors
      console.log('🎯 Creando 7 anchors para los 7 targets (lamp, pico, truck, tunel, garras, perforadora, carga)...');
      anchors = [
        mindarThree.addAnchor(0), // lamp
        mindarThree.addAnchor(1), // pico
        mindarThree.addAnchor(2), // truck
        mindarThree.addAnchor(3), // tunel
        mindarThree.addAnchor(4), // garras
        mindarThree.addAnchor(5), // perforadora
        mindarThree.addAnchor(6), // carga
      ];
      console.log('✅ Anchors creados:', anchors.length);
      
      // Seleccionar el anchor correcto según el índice
      targetAnchor = anchors[modelConfig.index];
    }
    
    if (!targetAnchor) {
      console.error(`❌ No se pudo obtener anchor para índice ${modelConfig.index}`);
      throw new Error(`Anchor index ${modelConfig.index} no válido`);
    }
    
    targetAnchor.group.add(model3D);
    
    // Guardar referencia al anchor para mantenerlo visible
    window.targetAnchorGroup = targetAnchor.group;
    
    console.log(`📍 Modelo agregado al anchor ${useSingleMarker ? 'único' : modelConfig.index}`);
    console.log('📊 Estado del anchor:', {
      mode: useSingleMarker ? 'PNG individual' : 'Compilado .mind',
      index: useSingleMarker ? 0 : modelConfig.index,
      children: targetAnchor.group.children.length,
      modelo: model3D.type
    });

    // Variable para controlar si ya se detectó el marcador
    let hasBeenDetected = false;
    let persistentModel = null;
    
    // Configurar eventos para los anchors (con tracking persistente automático)
    anchors.forEach((anchor, idx) => {
      anchor.onTargetFound = () => {
        console.log(`✅ TARGET ${idx} DETECTADO`);
        
        // En modo marcador individual, siempre es el correcto (idx 0)
        // En modo compilado, verificar el índice
        const isCorrectMarker = useSingleMarker || (idx === modelConfig.index);
        
        if (isCorrectMarker) {
          console.log(`   ↳ Este es el target correcto para ${markerType} (${useSingleMarker ? 'PNG' : 'compilado'})`);
          updateStatus('Modelo detectado ✓ - Puedes retirar el marcador');
          if (modelInfoEl) {
            modelInfoEl.classList.add('active');
          }
          
          // Solo crear modelo persistente la primera vez
          if (!hasBeenDetected) {
            hasBeenDetected = true;
            console.log('🔒 Creando modelo persistente independiente...');
            
            // Clonar el modelo 3D
            persistentModel = model3D.clone();
            
            // Obtener la matriz de transformación del anchor en este momento
            anchor.group.updateMatrixWorld(true);
            const matrix = anchor.group.matrixWorld.clone();
            
            // Aplicar la transformación al modelo persistente
            persistentModel.applyMatrix4(matrix);
            
            // Agregar el modelo persistente directamente a la escena (no al anchor)
            scene.add(persistentModel);
            
            // Ocultar el modelo original del anchor
            model3D.visible = false;
            
            // Activar tracking persistente
            window.isModelLocked = true;
            window.persistentModel = persistentModel;
            
            console.log('✅ Modelo persistente creado y agregado a la escena');
          }
          
          // Mostrar botón de captura si estaba oculto
          const captureBtn = document.getElementById('captureBtn');
          const captureBtnDesktop = document.getElementById('captureBtnDesktop');
          if (captureBtn) {
            captureBtn.style.display = 'flex';
            console.log('📷 Botón de captura móvil activado y visible');
          }
          if (captureBtnDesktop) {
            captureBtnDesktop.style.display = 'flex';
            console.log('📷 Botón de captura desktop activado y visible');
          }
          if (!captureBtn && !captureBtnDesktop) {
            console.warn('⚠️ Botón de captura no encontrado en el DOM');
          }
          
          // Mostrar botón de resetear escáner
          const resetScanBtn = document.getElementById('resetScanBtn');
          if (resetScanBtn) {
            resetScanBtn.classList.add('visible');
            console.log('🔄 Botón de resetear escáner activado');
          }
        } else {
          console.log(`   ↳ Target incorrecto. Esperando target ${modelConfig.index} para ${markerType}`);
          updateStatus(`Marcador ${idx} detectado (usar marcador ${modelConfig.index})`);
        }
      };

      anchor.onTargetLost = () => {
        console.log(`❌ TARGET ${idx} PERDIDO`);
        const isCorrectMarker = useSingleMarker || (idx === modelConfig.index);
        if (isCorrectMarker && hasBeenDetected) {
          console.log('   ↳ Modelo persistente sigue visible en la escena');
          updateStatus('Modelo visible - Ya no necesitas el marcador ✓');
        }
      };
    });

    updateStatus('Iniciando experiencia AR...');

    // Iniciar MindAR
    await mindarThree.start();
    isRunning = true;

    console.log('✅ Scanner AR iniciado correctamente');
    if (loadingEl) {
      loadingEl.classList.add('hidden');
    }
    updateStatus('Buscando marcador...');

    // Loop de renderizado
    renderer.setAnimationLoop(() => {
      if (isRunning) {
        // Usar el modelo persistente si está disponible
        const activeModel = window.persistentModel || model3D;
        
        if (isRotating && activeModel) {
          activeModel.rotation.y += 0.01;
        }
        renderer.render(scene, camera);
      }
    });

    // Configurar controles táctiles
    setupTouchControls(model3D);

  } catch (error) {
    console.error('Error al inicializar Scanner AR:', error);
    
    let errorMsg = 'No se pudo inicializar la realidad aumentada. ';
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMsg += 'Has denegado el permiso de cámara. Por favor, permite el acceso y recarga la página.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMsg += 'No se encontró ninguna cámara en el dispositivo.';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      errorMsg += 'La cámara está siendo usada por otra aplicación.';
    } else if (error.message && error.message.includes('targets.mind')) {
      errorMsg += 'No se pudo cargar el archivo de marcadores.';
    } else {
      errorMsg += 'Error: ' + (error.message || 'Desconocido');
    }
    
    showError(errorMsg);
  }
};

const stopAR = async () => {
  isRunning = false;
  
  if (useARjs) {
    // Detener AR.js
    try {
      if (arToolkitSource) {
        const video = arToolkitSource.domElement;
        if (video && video.srcObject) {
          video.srcObject.getTracks().forEach(track => track.stop());
        }
      }
      arToolkitSource = null;
      arToolkitContext = null;
      markerRoot = null;
      console.log('✅ AR.js detenido');
    } catch (error) {
      console.error('Error deteniendo AR.js:', error);
    }
  } else if (mindarThree) {
    // Detener MindAR
    try {
      await mindarThree.stop();

      const video = mindarThree.video;
      if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
      }

      if (mindarThree.renderer) {
        mindarThree.renderer.setAnimationLoop(null);
        mindarThree.renderer.clear();
      }
      console.log('✅ MindAR detenido');
    } catch (error) {
      console.error('Error deteniendo MindAR:', error);
    }
  }
};

function setupTouchControls(model) {
  if (!model) return;

  let lastX = 0;
  let lastY = 0;
  let lastTouchX = 0;
  let lastTouchY = 0;
  let isDragging = false;
  let lastPinchDist = 0;
  let currentScale = model.scale.x;
  const MIN_SCALE = 0.1;
  const MAX_SCALE = 5.0;
  const ROTATION_SPEED = 0.05; // Velocidad de rotación con botones

  const arContainer = document.querySelector('#ar-container');

  // Detectar si es desktop
  const isDesktop = !('ontouchstart' in window) || window.innerWidth > 1024;

  // Crear controles de zoom y rotación para desktop
  if (isDesktop) {
    const zoomControls = document.createElement('div');
    zoomControls.className = 'zoom-controls';
    zoomControls.innerHTML = `
      <button class="zoom-btn" id="zoomIn" title="Aumentar tamaño">+</button>
      <div class="zoom-indicator" id="zoomLevel">100%</div>
      <button class="zoom-btn" id="zoomOut" title="Disminuir tamaño">−</button>
      <button class="zoom-btn" id="zoomReset" title="Restablecer tamaño">⟲</button>
    `;
    document.body.appendChild(zoomControls);

    // Crear controles de rotación
    const rotationControls = document.createElement('div');
    rotationControls.className = 'rotation-controls';
    rotationControls.innerHTML = `
      <button class="rotation-btn" id="rotateLeft" title="Rotar izquierda">←</button>
      <button class="rotation-btn" id="rotateRight" title="Rotar derecha">→</button>
      <button class="rotation-btn" id="rotateUp" title="Rotar arriba">↑</button>
      <button class="rotation-btn" id="rotateDown" title="Rotar abajo">↓</button>
      <button class="rotation-btn" id="rotateReset" title="Restablecer rotación">⟲</button>
    `;
    document.body.appendChild(rotationControls);

    const zoomIn = document.getElementById('zoomIn');
    const zoomOut = document.getElementById('zoomOut');
    const zoomReset = document.getElementById('zoomReset');
    const zoomLevel = document.getElementById('zoomLevel');

    const rotateLeft = document.getElementById('rotateLeft');
    const rotateRight = document.getElementById('rotateRight');
    const rotateUp = document.getElementById('rotateUp');
    const rotateDown = document.getElementById('rotateDown');
    const rotateReset = document.getElementById('rotateReset');

    const updateZoomDisplay = () => {
      const activeModel = getActiveModel();
      if (activeModel) {
        const percentage = Math.round((activeModel.scale.x / currentScale) * 100);
        zoomLevel.textContent = `${percentage}%`;
      }
    };

    // Controles de zoom
    zoomIn.addEventListener('click', () => {
      const activeModel = getActiveModel();
      if (activeModel) {
        const newScale = Math.min(activeModel.scale.x * 1.2, MAX_SCALE);
        activeModel.scale.set(newScale, newScale, newScale);
        updateZoomDisplay();
      }
    });

    zoomOut.addEventListener('click', () => {
      const activeModel = getActiveModel();
      if (activeModel) {
        const newScale = Math.max(activeModel.scale.x * 0.8, MIN_SCALE);
        activeModel.scale.set(newScale, newScale, newScale);
        updateZoomDisplay();
      }
    });

    zoomReset.addEventListener('click', () => {
      const activeModel = getActiveModel();
      if (activeModel) {
        activeModel.scale.set(currentScale, currentScale, currentScale);
        updateZoomDisplay();
      }
    });

    // Controles de rotación
    let rotationInterval = null;
    const initialRotation = { x: model.rotation.x, y: model.rotation.y, z: model.rotation.z };

    const startRotation = (axis, direction) => {
      if (rotationInterval) clearInterval(rotationInterval);
      rotationInterval = setInterval(() => {
        const activeModel = getActiveModel();
        if (activeModel) {
          activeModel.rotation[axis] += ROTATION_SPEED * direction;
        }
      }, 16); // ~60fps
    };

    const stopRotation = () => {
      if (rotationInterval) {
        clearInterval(rotationInterval);
        rotationInterval = null;
      }
    };

    rotateLeft.addEventListener('mousedown', () => startRotation('y', -1));
    rotateLeft.addEventListener('mouseup', stopRotation);
    rotateLeft.addEventListener('mouseleave', stopRotation);

    rotateRight.addEventListener('mousedown', () => startRotation('y', 1));
    rotateRight.addEventListener('mouseup', stopRotation);
    rotateRight.addEventListener('mouseleave', stopRotation);

    rotateUp.addEventListener('mousedown', () => startRotation('x', -1));
    rotateUp.addEventListener('mouseup', stopRotation);
    rotateUp.addEventListener('mouseleave', stopRotation);

    rotateDown.addEventListener('mousedown', () => startRotation('x', 1));
    rotateDown.addEventListener('mouseup', stopRotation);
    rotateDown.addEventListener('mouseleave', stopRotation);

    rotateReset.addEventListener('click', () => {
      const activeModel = getActiveModel();
      if (activeModel) {
        activeModel.rotation.set(initialRotation.x, initialRotation.y, initialRotation.z);
      }
    });

    // Zoom con rueda del mouse
    arContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      const activeModel = getActiveModel();
      if (activeModel) {
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, activeModel.scale.x * delta));
        activeModel.scale.set(newScale, newScale, newScale);
        updateZoomDisplay();
      }
    }, { passive: false });
  }

  // Función helper para obtener el modelo activo
  const getActiveModel = () => window.persistentModel || model;

  // Controles de rotación con mouse
  arContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    arContainer.style.cursor = 'grabbing';
  });

  arContainer.addEventListener('mouseup', () => {
    isDragging = false;
    arContainer.style.cursor = 'grab';
  });

  arContainer.addEventListener('mouseleave', () => {
    isDragging = false;
    arContainer.style.cursor = 'grab';
  });

  arContainer.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const activeModel = getActiveModel();
      if (activeModel) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        activeModel.rotation.y += dx * 0.01;
        activeModel.rotation.x += dy * 0.01;
        lastX = e.clientX;
        lastY = e.clientY;
      }
    }
  });

  // Controles táctiles móviles - rotación libre en todos los ejes
  let debugInfo = null;
  if (!isDesktop) {
    // Crear indicador de debug para móvil
    debugInfo = document.createElement('div');
    debugInfo.style.position = 'fixed';
    debugInfo.style.top = '100px';
    debugInfo.style.right = '10px';
    debugInfo.style.background = 'rgba(0,0,0,0.8)';
    debugInfo.style.color = '#0f0';
    debugInfo.style.padding = '10px';
    debugInfo.style.borderRadius = '5px';
    debugInfo.style.fontFamily = 'monospace';
    debugInfo.style.fontSize = '12px';
    debugInfo.style.zIndex = '999';
    debugInfo.style.pointerEvents = 'none';
    debugInfo.innerHTML = 'Debug: Listo';
    document.body.appendChild(debugInfo);
  }
  
  arContainer.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      isDragging = true;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
      if (debugInfo) debugInfo.innerHTML = '1 dedo: Rotar';
    } else if (e.touches.length === 2) {
      e.preventDefault();
      isDragging = false;
      lastPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (debugInfo) debugInfo.innerHTML = '2 dedos: Zoom<br>Dist: ' + Math.round(lastPinchDist);
    }
  }, { passive: false });

  arContainer.addEventListener('touchend', (e) => {
    e.preventDefault();
    isDragging = false;
    lastPinchDist = 0;
    if (debugInfo) {
      const activeModel = getActiveModel();
      if (activeModel) {
        debugInfo.innerHTML = 'Listo<br>Scale: ' + activeModel.scale.x.toFixed(2);
      }
    }
  }, { passive: false });

  arContainer.addEventListener('touchmove', (e) => {
    const activeModel = getActiveModel();
    if (!activeModel) {
      if (debugInfo) debugInfo.innerHTML = 'ERROR: No model';
      return;
    }
    
    // Rotación completa con un dedo (horizontal y vertical)
    if (isDragging && e.touches.length === 1) {
      e.preventDefault();
      
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      
      const deltaX = touchX - lastTouchX;
      const deltaY = touchY - lastTouchY;
      
      // Rotación horizontal (eje Y)
      activeModel.rotation.y += deltaX * 0.015;
      
      // Rotación vertical (eje X)
      activeModel.rotation.x += deltaY * 0.015;
      
      lastTouchX = touchX;
      lastTouchY = touchY;
      
      if (debugInfo) {
        debugInfo.innerHTML = 'Rotando<br>RY: ' + activeModel.rotation.y.toFixed(2);
      }
    } 
    // Zoom con pinch (dos dedos)
    else if (e.touches.length === 2) {
      e.preventDefault();
      
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      if (lastPinchDist > 0) {
        const delta = dist - lastPinchDist;
        const scaleFactor = 1 + (delta * 0.005);
        let newScale = activeModel.scale.x * scaleFactor;
        
        // Limitar escala con valores seguros
        newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
        
        // Aplicar la escala
        activeModel.scale.set(newScale, newScale, newScale);
        
        // FORZAR visibilidad
        activeModel.visible = true;
        activeModel.traverse((child) => {
          child.visible = true;
        });
        
        if (activeModel.parent) {
          activeModel.parent.visible = true;
        }
        
        // Forzar actualización de matriz
        activeModel.updateMatrix();
        activeModel.updateMatrixWorld(true);
        
        if (debugInfo) {
          const { x, y, z } = activeModel.position;
          debugInfo.innerHTML = 'ZOOM<br>Scale: ' + newScale.toFixed(3) + 
                                '<br>Delta: ' + delta.toFixed(1) +
                                '<br>Visible: ' + activeModel.visible +
                                '<br>Pos: ' + `${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`;
        }
      }
      
      lastPinchDist = dist;
    }
  }, { passive: false });

  // Estilo del cursor para desktop
  if (isDesktop) {
    arContainer.style.cursor = 'grab';
  }

  // Crear botón de captura integrado en controles de zoom
  createCaptureButton();
}

// Función para crear botón de captura en los controles de zoom
function createCaptureButton() {
  // Detectar si es desktop
  const isDesktop = !('ontouchstart' in window) || window.innerWidth > 1024;
  
  console.log('🎮 Configurando botón de captura...', isDesktop ? 'Desktop' : 'Móvil');
  
  // Verificar si ya existe el botón en el HTML
  let captureBtn = document.getElementById('captureBtn');
  
  if (isDesktop) {
    // Agregar botón de captura a los controles de zoom existentes
    const zoomControls = document.querySelector('.zoom-controls');
    if (zoomControls) {
      const desktopCaptureBtn = document.createElement('button');
      desktopCaptureBtn.className = 'zoom-btn capture-btn-integrated';
      desktopCaptureBtn.id = 'captureBtnDesktop';
      desktopCaptureBtn.title = 'Capturar pantalla';
      desktopCaptureBtn.innerHTML = '📷';
      desktopCaptureBtn.style.display = 'none'; // Oculto hasta que se detecte el marcador
      zoomControls.appendChild(desktopCaptureBtn);
      
      desktopCaptureBtn.addEventListener('click', () => {
        console.log('🖱️ Click en botón de captura (Desktop)');
        captureScreen();
      });
      
      // Usar el botón de desktop
      captureBtn = desktopCaptureBtn;
      
      console.log('✅ Botón de captura desktop creado');
    } else {
      console.warn('⚠️ No se encontró .zoom-controls para agregar el botón');
    }
  } else {
    // Para móvil, usar el botón que ya existe en el HTML o crear uno nuevo
    if (!captureBtn) {
      captureBtn = document.createElement('button');
      captureBtn.className = 'capture-btn-mobile';
      captureBtn.id = 'captureBtn';
      captureBtn.title = 'Capturar pantalla';
      captureBtn.innerHTML = '<span class="capture-icon">📷</span>';
      captureBtn.style.display = 'none';
      document.body.appendChild(captureBtn);
      console.log('✅ Botón de captura móvil creado dinámicamente');
    } else {
      console.log('✅ Botón de captura móvil encontrado en HTML');
    }
    
    // Asegurar que el event listener esté configurado
    captureBtn.addEventListener('click', () => {
      console.log('👆 Click en botón de captura (Móvil)');
      captureScreen();
    });
  }
  
  console.log('✅ Botón de captura configurado correctamente');
}

// Función para capturar la pantalla completa (con video de fondo)
function captureScreen() {
  console.log('📸 Capturando pantalla completa...');
  
  // Buscar el botón que se usó (móvil o desktop)
  const captureBtn = document.getElementById('captureBtn') || document.getElementById('captureBtnDesktop');
  if (!captureBtn) {
    console.error('❌ Botón de captura no encontrado');
    return;
  }
  
  // Detectar si es desktop o móvil para el feedback visual
  const isDesktop = !('ontouchstart' in window) || window.innerWidth > 1024;
  let originalIcon;
  
  if (isDesktop) {
    originalIcon = captureBtn.innerHTML;
    captureBtn.innerHTML = '⏳';
  } else {
    const iconElement = captureBtn.querySelector('.capture-icon');
    if (iconElement) {
      originalIcon = iconElement.textContent;
      iconElement.textContent = '⏳';
    }
  }
  
  // Feedback visual
  captureBtn.classList.add('capturing');
  
  try {
    let renderer, scene, camera;
    
    if (useARjs) {
      // Usar AR.js
      if (!arjsRenderer || !arjsScene || !arjsCamera) {
        throw new Error('AR.js no está inicializado correctamente');
      }
      renderer = arjsRenderer;
      scene = arjsScene;
      camera = arjsCamera;
    } else {
      // Usar MindAR
      if (!mindarThree || !mindarThree.renderer || !mindarThree.scene || !mindarThree.camera) {
        throw new Error('MindAR no está inicializado correctamente');
      }
      renderer = mindarThree.renderer;
      scene = mindarThree.scene;
      camera = mindarThree.camera;
    }
    
    // Obtener el modelo activo (persistente o original)
    const activeModel = window.persistentModel || model3D;
    if (!activeModel || !activeModel.visible) {
      throw new Error('No hay modelo visible para capturar');
    }

    console.log('📸 Preparando captura del modelo 3D...');

    // Crear una escena temporal limpia solo para el modelo
    const captureScene = new THREE.Scene();
    
    // Copiar iluminación
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    captureScene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(1, 1, 1);
    captureScene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-1, -1, -1);
    captureScene.add(directionalLight2);
    
    // Clonar el modelo activo para la captura
    const modelClone = activeModel.clone();
    
    // Copiar transformaciones exactas
    modelClone.position.copy(activeModel.position);
    modelClone.rotation.copy(activeModel.rotation);
    modelClone.scale.copy(activeModel.scale);
    modelClone.updateMatrixWorld(true);
    
    captureScene.add(modelClone);
    
    // Crear canvas temporal para la captura
    const tempCanvas = document.createElement('canvas');
    const captureWidth = 1920;  // Resolución alta
    const captureHeight = 1920;
    tempCanvas.width = captureWidth;
    tempCanvas.height = captureHeight;
    
    // Crear renderer temporal
    const tempRenderer = new THREE.WebGLRenderer({
      canvas: tempCanvas,
      alpha: true,  // Fondo transparente
      antialias: true,
      preserveDrawingBuffer: true
    });
    
    tempRenderer.setSize(captureWidth, captureHeight);
    tempRenderer.setClearColor(0xffffff, 0); // Fondo transparente
    
    // Copiar configuración de la cámara
    const captureCamera = camera.clone();
    captureCamera.aspect = 1; // Aspecto cuadrado
    captureCamera.updateProjectionMatrix();
    
    // Renderizar la escena de captura
    tempRenderer.render(captureScene, captureCamera);
    
    console.log('✅ Modelo renderizado en canvas de captura');
    
    // Convertir a blob y descargar
    tempCanvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('No se pudo crear la imagen');
      }

      // Crear URL del blob
      const url = URL.createObjectURL(blob);
      
      // Crear timestamp para el nombre del archivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `MiningTech_AR_${timestamp}.png`;
      
      // Crear link de descarga
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Liberar URL
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      // Limpiar recursos temporales
      tempRenderer.dispose();
      captureScene.clear();
      
      console.log('✅ Captura guardada:', filename);
      
      // Feedback visual de éxito
      captureBtn.classList.remove('capturing');
      captureBtn.classList.add('captured');
      
      if (isDesktop) {
        captureBtn.innerHTML = '✅';
      } else {
        const iconElement = captureBtn.querySelector('.capture-icon');
        if (iconElement) iconElement.textContent = '✅';
      }
      
      setTimeout(() => {
        captureBtn.classList.remove('captured');
        if (isDesktop) {
          captureBtn.innerHTML = originalIcon;
        } else {
          const iconElement = captureBtn.querySelector('.capture-icon');
          if (iconElement) iconElement.textContent = originalIcon;
        }
      }, 2000);
      
    }, 'image/png', 1.0);
    
  } catch (error) {
    console.error('❌ Error al capturar pantalla:', error);
    
    captureBtn.classList.remove('capturing');
    captureBtn.classList.add('error');
    
    if (isDesktop) {
      captureBtn.innerHTML = '❌';
    } else {
      const iconElement = captureBtn.querySelector('.capture-icon');
      if (iconElement) iconElement.textContent = '❌';
    }
    
    setTimeout(() => {
      captureBtn.classList.remove('error');
      if (isDesktop) {
        captureBtn.innerHTML = originalIcon;
      } else {
        const iconElement = captureBtn.querySelector('.capture-icon');
        if (iconElement) iconElement.textContent = originalIcon;
      }
    }, 2000);
  }
}

// ========== FUNCIONES PARA AR.JS ==========
async function initARjs(barcodeValue, modelConfig, machineName, updateStatus, showError, loadingEl, modelInfoEl) {
  console.log('🚀 Inicializando AR.js con barcode:', barcodeValue);
  
  // Esperar a que THREEx se cargue (máximo 10 segundos)
  let attempts = 0;
  while (typeof THREEx === 'undefined' && attempts < 100) {
    console.log('⏳ Esperando a que AR.js se cargue... intento', attempts + 1);
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  // Verificar que THREEx esté disponible
  if (typeof THREEx === 'undefined' || typeof THREEx.ArToolkitSource === 'undefined') {
    const msg = 'No se detectó la API THREEx.ArToolkitSource — verifica que AR.js esté cargado correctamente.';
    console.error('❌', msg);
    if (updateStatus) updateStatus('Error: AR.js no disponible');
    if (showError) showError('No se pudo cargar AR.js. Verifica tu conexión a internet y recarga la página.');
    return;
  }
  
  console.log('✅ THREEx disponible:', THREEx);
  
  try {
    if (updateStatus) updateStatus(`Inicializando escáner barcode ${barcodeValue}...`);
    
    // Limpiar container
    const container = document.querySelector('#ar-container');
    if (container) container.innerHTML = '';
    
    // THREE.js básico
    arjsScene = new THREE.Scene();
    arjsCamera = new THREE.Camera();
    arjsScene.add(arjsCamera);
    
    arjsRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    arjsRenderer.setClearColor(new THREE.Color('lightgrey'), 0);
    arjsRenderer.setSize(window.innerWidth, window.innerHeight);
    arjsRenderer.domElement.style.position = 'fixed';
    arjsRenderer.domElement.style.top = '0';
    arjsRenderer.domElement.style.left = '0';
    arjsRenderer.domElement.style.zIndex = '1';
    arjsRenderer.domElement.classList.add('__arjs_renderer');
    
    if (container) {
      // Asegurarnos de no duplicar canvas
      const existing = container.querySelector('canvas.__arjs_renderer');
      if (existing) {
        existing.parentNode.replaceChild(arjsRenderer.domElement, existing);
      } else {
        container.appendChild(arjsRenderer.domElement);
      }
    }
    
    // Fuente de video (webcam)
    arToolkitSource = new THREEx.ArToolkitSource({ sourceType: 'webcam' });
    
    function onResize() {
      try {
        arToolkitSource.onResizeElement();
        arToolkitSource.copyElementSizeTo(arjsRenderer.domElement);
        if (arToolkitContext && arToolkitContext.arController) {
          arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas);
        }
      } catch (e) {
        console.warn('⚠️ onResize error:', e);
      }
    }
    
    // Inicializar fuente (promisificado)
    await new Promise((resolve) => {
      arToolkitSource.init(function onReady() {
        console.log('✅ Cámara lista');
        if (updateStatus) updateStatus('Cámara lista, inicializando contexto AR...');
        onResize();
        resolve();
      });
    });
    
    window.addEventListener('resize', onResize);
    
    // Contexto AR con soporte para barcode 3x3
    arToolkitContext = new THREEx.ArToolkitContext({
      cameraParametersUrl: 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js/data/data/camera_para.dat',
      detectionMode: 'mono',
      matrixCodeType: '3x3'
    });
    
    await new Promise((resolve) => {
      arToolkitContext.init(function onCompleted() {
        arjsCamera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
        console.log('✅ Contexto AR listo');
        if (updateStatus) updateStatus('Contexto AR listo. Buscando marcador...');
        resolve();
      });
    });
    
    // Grupo que representará al marcador
    markerRoot = new THREE.Group();
    arjsScene.add(markerRoot);
    
    // Controles del marcador: barcode
    const markerControls = new THREEx.ArMarkerControls(arToolkitContext, markerRoot, {
      type: 'barcode',
      barcodeValue: barcodeValue
    });
    
    console.log(`🎯 Marcador barcode ${barcodeValue} configurado`);
    
    // Cargar modelo 3D
    const loader = new GLTFLoader();
    const modelPath = `${import.meta.env.BASE_URL}models/${modelConfig.path}`;
    
    console.log('📦 Cargando modelo:', modelPath);
    
    try {
      const gltf = await new Promise((resolve, reject) => {
        loader.load(modelPath, resolve, undefined, reject);
      });
      
      model3D = gltf.scene;
      
      // AR.js usa unidades diferentes
      const arjsScale = modelConfig.scale * 1.5;
      model3D.scale.set(arjsScale, arjsScale, arjsScale);
      
      if (modelConfig.rotation) {
        model3D.rotation.set(
          modelConfig.rotation.x,
          modelConfig.rotation.y,
          modelConfig.rotation.z
        );
      }
      
      model3D.position.set(0, arjsScale / 2, 0);
      model3D.visible = true;
      
      markerRoot.add(model3D);
      console.log('✅ Modelo añadido:', modelPath);
    } catch (err) {
      console.warn('⚠️ No se pudo cargar modelo, usando cubo de prueba', err);
      
      // Cubo de fallback
      const cubeSize = 0.5;
      const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
      const material = new THREE.MeshNormalMaterial({ transparent: true, opacity: 0.9 });
      model3D = new THREE.Mesh(geometry, material);
      model3D.position.y = cubeSize / 2;
      markerRoot.add(model3D);
    }
    
    // Luz
    const light = new THREE.DirectionalLight(0xffffff, 0.9);
    light.position.set(0, 4, 0);
    arjsScene.add(light);
    arjsScene.add(new THREE.AmbientLight(0x666666));
    
    if (loadingEl) loadingEl.style.display = 'none';
    if (modelInfoEl) modelInfoEl.style.display = 'block';
    if (updateStatus) updateStatus(`Buscando marcador ${barcodeValue}...`);
    
    // Configurar controles táctiles
    setupTouchControls(model3D);
    
    // Loop de animación
    isRunning = true;
    let prevVisible = false;
    
    function animate() {
      if (!isRunning) return;
      requestAnimationFrame(animate);
      
      if (arToolkitSource && arToolkitSource.ready !== false) {
        try {
          arToolkitContext.update(arToolkitSource.domElement);
        } catch (e) {
          // Silenciar errores de update
        }
      }
      
      arjsRenderer.render(arjsScene, arjsCamera);
      
      // Detectar cambios de visibilidad del marcador
      const visible = markerRoot.visible;
      if (visible !== prevVisible) {
        prevVisible = visible;
        if (visible) {
          console.log(`🎯✅ Marcador ${barcodeValue} detectado!`);
          if (updateStatus) updateStatus(`Marcador ${barcodeValue} detectado ✅`);
          if (modelInfoEl) modelInfoEl.classList.add('active');
          
          // Mostrar botón de captura
          const captureBtn = document.getElementById('captureBtn');
          const captureBtnDesktop = document.getElementById('captureBtnDesktop');
          if (captureBtn) {
            captureBtn.style.display = 'flex';
            console.log('📷 Botón de captura móvil visible');
          }
          if (captureBtnDesktop) {
            captureBtnDesktop.style.display = 'flex';
            console.log('📷 Botón de captura desktop visible');
          }
        } else {
          console.log(`🎯❌ Marcador ${barcodeValue} perdido`);
          if (updateStatus) updateStatus(`Buscando marcador ${barcodeValue}...`);
          if (modelInfoEl) modelInfoEl.classList.remove('active');
        }
      }
    }
    animate();
    
    console.log('🎉 AR.js inicializado correctamente');
    
  } catch (error) {
    console.error('❌ Error inicializando AR.js:', error);
    if (updateStatus) updateStatus('Error al iniciar AR.js');
    if (loadingEl) loadingEl.style.display = 'none';
    if (showError) showError('No se pudo inicializar el sistema AR: ' + error.message);
  }
}

// Export stopAR function for external use
window.stopAR = stopAR;

// Configurar botón de resetear escáner (cuando el DOM esté listo)
document.addEventListener('DOMContentLoaded', () => {
  const resetScanBtn = document.getElementById('resetScanBtn');
  if (resetScanBtn) {
    resetScanBtn.addEventListener('click', async () => {
      console.log('🔄 Reseteando escáner...');
      
      try {
        // Detener MindAR primero
        if (mindarThree) {
          await mindarThree.stop();
          console.log('✅ MindAR detenido');
        }
        
        // Limpiar completamente la escena
        if (scene) {
          // Eliminar el modelo persistente si existe
          if (window.persistentModel) {
            scene.remove(window.persistentModel);
            // Liberar recursos del modelo
            if (window.persistentModel.traverse) {
              window.persistentModel.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                  if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose());
                  } else {
                    child.material.dispose();
                  }
                }
              });
            }
            window.persistentModel = null;
            console.log('✅ Modelo persistente eliminado y liberado');
          }
          
          // Limpiar todos los objetos de la escena
          while(scene.children.length > 0) { 
            const child = scene.children[0];
            scene.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
          console.log('✅ Escena limpiada completamente');
        }
        
        // Limpiar variables globales
        window.isModelLocked = false;
        window.currentModel = null;
        window.hasBeenDetected = {};
        
        // Ocultar todos los elementos de UI
        const captureBtn = document.getElementById('captureBtn');
        const statusTextEl = document.getElementById('statusText');
        const modelInfoEl = document.getElementById('modelInfo');
        const modelNameEl = document.getElementById('modelName');
        
        if (captureBtn) captureBtn.style.display = 'none';
        if (statusTextEl) statusTextEl.textContent = 'Reiniciando escáner...';
        if (modelInfoEl) {
          modelInfoEl.classList.remove('active');
          modelInfoEl.style.display = 'none';
        }
        if (modelNameEl) modelNameEl.textContent = '';
        
        // Ocultar botón de resetear
        resetScanBtn.classList.remove('visible');
        
        console.log('🔄 Recargando página para reiniciar...');
        
        // Recargar la página forzando limpieza de caché
        setTimeout(() => {
          window.location.reload(true);
        }, 300);
        
      } catch (error) {
        console.error('❌ Error al resetear:', error);
        // Si hay error, recargar de todos modos
        window.location.reload(true);
      }
    });
    
    console.log('✅ Botón de resetear escáner configurado');
  } else {
    console.warn('⚠️ No se encontró el botón de resetear (#resetScanBtn)');
  }
});
