import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Variables globales
let mindarThree = null;
let isRunning = false;
let model3D = null;
let isRotating = false;
window.isModelLocked = false;
window.persistentModel = null;

window.startScanner = async () => {
  if (isRunning && mindarThree) {
    await stopAR();
  }

  // Obtener parámetros de la URL
  const urlParams = new URLSearchParams(window.location.search);
  const markerType = urlParams.get('marker') || 'excavadora';
  const machineName = urlParams.get('name') || 'Maquinaria';
  
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

    // Crear instancia de MindAR
    mindarThree = new MindARThree({
      container: document.querySelector("#ar-container"),
      imageTargetSrc: `${import.meta.env.BASE_URL}target/targets.mind`,
      filterMinCF: 0.0001,  // Reduce el jitter/temblor
      filterBeta: 10,       // Suaviza el seguimiento
      uiLoading: "no",
      uiScanning: "no",
      uiError: "no",
    });

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

    // Crear TODOS los anchors (7 targets en targets.mind)
    // Esto es CRÍTICO: MindAR requiere que se creen todos los anchors
    console.log('🎯 Creando 7 anchors para los 7 targets (lamp, pico, truck, tunel, garras, perforadora, carga)...');
    const anchors = [
      mindarThree.addAnchor(0), // lamp
      mindarThree.addAnchor(1), // pico
      mindarThree.addAnchor(2), // truck
      mindarThree.addAnchor(3), // tunel
      mindarThree.addAnchor(4), // garras
      mindarThree.addAnchor(5), // perforadora
      mindarThree.addAnchor(6), // carga
    ];
    console.log('✅ Anchors creados:', anchors.length);

    // Añadir el modelo al anchor correspondiente según el índice
    const targetAnchor = anchors[modelConfig.index];
    if (!targetAnchor) {
      console.error(`❌ No se pudo obtener anchor para índice ${modelConfig.index}`);
      throw new Error(`Anchor index ${modelConfig.index} no válido`);
    }
    
    targetAnchor.group.add(model3D);
    
    // Guardar referencia al anchor para mantenerlo visible
    window.targetAnchorGroup = targetAnchor.group;
    
    console.log(`📍 Modelo agregado al anchor ${modelConfig.index}`);
    console.log('📊 Estado del anchor:', {
      index: modelConfig.index,
      children: targetAnchor.group.children.length,
      modelo: model3D.type
    });

    // Variable para controlar si ya se detectó el marcador
    let hasBeenDetected = false;
    let persistentModel = null;
    
    // Configurar eventos para TODOS los anchors (con tracking persistente automático)
    anchors.forEach((anchor, idx) => {
      anchor.onTargetFound = () => {
        console.log(`✅ TARGET ${idx} DETECTADO`);
        if (idx === modelConfig.index) {
          console.log(`   ↳ Este es el target correcto para ${markerType}`);
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
          if (captureBtn) {
            captureBtn.style.display = 'flex';
            console.log('📷 Botón de captura activado y visible');
          } else {
            console.warn('⚠️ Botón de captura no encontrado en el DOM');
          }
        } else {
          console.log(`   ↳ Target incorrecto. Esperando target ${modelConfig.index} para ${markerType}`);
          updateStatus(`Marcador ${idx} detectado (usar marcador ${modelConfig.index})`);
        }
      };

      anchor.onTargetLost = () => {
        console.log(`❌ TARGET ${idx} PERDIDO`);
        if (idx === modelConfig.index && hasBeenDetected) {
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
  if (mindarThree && isRunning) {
    isRunning = false;

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

    } catch (error) {
      console.error('Error deteniendo AR:', error);
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
  arContainer.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      isDragging = true;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      isDragging = false;
      lastPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }, { passive: false });

  arContainer.addEventListener('touchend', (e) => {
    e.preventDefault();
    isDragging = false;
    lastPinchDist = 0;
  }, { passive: false });

  arContainer.addEventListener('touchmove', (e) => {
    e.preventDefault();
    
    const activeModel = getActiveModel();
    if (!activeModel) return;
    
    // Rotación completa con un dedo (horizontal y vertical)
    if (isDragging && e.touches.length === 1) {
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      
      const deltaX = touchX - lastTouchX;
      const deltaY = touchY - lastTouchY;
      
      // Rotación horizontal (eje Y) - más sensible
      activeModel.rotation.y += deltaX * 0.015;
      
      // Rotación vertical (eje X) - más sensible
      activeModel.rotation.x += deltaY * 0.015;
      
      lastTouchX = touchX;
      lastTouchY = touchY;
    } 
    // Zoom con pinch (dos dedos)
    else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      if (lastPinchDist > 0) {
        const delta = dist - lastPinchDist;
        const scaleFactor = 1 + (delta * 0.005);
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, activeModel.scale.x * scaleFactor));
        activeModel.scale.set(newScale, newScale, newScale);
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
  
  console.log('🎮 Creando botón de captura...', isDesktop ? 'Desktop' : 'Móvil');
  
  if (isDesktop) {
    // Agregar botón de captura a los controles de zoom existentes
    const zoomControls = document.querySelector('.zoom-controls');
    if (zoomControls) {
      const captureBtn = document.createElement('button');
      captureBtn.className = 'zoom-btn capture-btn-integrated';
      captureBtn.id = 'captureBtn';
      captureBtn.title = 'Capturar pantalla';
      captureBtn.innerHTML = '📷';
      captureBtn.style.display = 'none'; // Oculto hasta que se detecte el marcador
      zoomControls.appendChild(captureBtn);
      
      captureBtn.addEventListener('click', () => {
        console.log('🖱️ Click en botón de captura (Desktop)');
        captureScreen();
      });
      
      console.log('✅ Botón de captura desktop creado');
    } else {
      console.warn('⚠️ No se encontró .zoom-controls para agregar el botón');
    }
  } else {
    // Para móvil, crear botón flotante
    const captureBtn = document.createElement('button');
    captureBtn.className = 'capture-btn-mobile';
    captureBtn.id = 'captureBtn';
    captureBtn.title = 'Capturar pantalla';
    captureBtn.innerHTML = '<span class="capture-icon">📷</span>';
    captureBtn.style.display = 'none'; // Oculto hasta que se detecte el marcador
    document.body.appendChild(captureBtn);
    
    captureBtn.addEventListener('click', () => {
      console.log('👆 Click en botón de captura (Móvil)');
      captureScreen();
    });
    
    console.log('✅ Botón de captura móvil creado');
  }
}

// Función para capturar la pantalla completa (con video de fondo)
function captureScreen() {
  console.log('📸 Capturando pantalla completa...');
  
  const captureBtn = document.getElementById('captureBtn');
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
    if (!mindarThree || !mindarThree.renderer || !mindarThree.scene || !mindarThree.camera) {
      throw new Error('MindAR no está inicializado correctamente');
    }

    const { renderer, scene, camera } = mindarThree;
    
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

// Export stopAR function for external use
window.stopAR = stopAR;
