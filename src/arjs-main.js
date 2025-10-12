// ========== AR.js Main - Sistema de barcode markers 3x3 ==========
// Este archivo está completamente separado de MindAR para evitar conflictos

let arToolkitSource = null;
let arToolkitContext = null;
let markerRoot = null;
let scene = null;
let camera = null;
let renderer = null;
let isRunning = false;
let model3D = null;

// Variables para controles táctiles
let isDragging = false;
let lastTouchX = 0;
let lastTouchY = 0;
let lastPinchDist = 0;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5.0;

window.startScanner = async () => {
  if (isRunning) {
    await stopAR();
  }

  // Obtener parámetros de la URL
  const urlParams = new URLSearchParams(window.location.search);
  const markerType = urlParams.get('marker') || 'casco';
  const machineName = urlParams.get('name') || 'Maquinaria';
  
  // Elementos del DOM
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
    console.log('🚀 Iniciando AR.js Scanner...');
    updateStatus('Verificando AR.js...');

    // Esperar a que THREEx se cargue
    let attempts = 0;
    while (typeof THREEx === 'undefined' && attempts < 100) {
      console.log('⏳ Esperando AR.js... intento', attempts + 1);
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (typeof THREEx === 'undefined' || typeof THREEx.ArToolkitSource === 'undefined') {
      throw new Error('AR.js no se cargó correctamente');
    }
    
    console.log('✅ AR.js disponible');

    // Mapeo de marcadores a barcode IDs (matriz 3x3)
    // Los marcadores están en la carpeta markets/ con IDs del 20 al 31
    const barcodeMapping = {
      casco: 20,        // 20.png = lamp/casco
      pico: 21,         // 21.png = pico
      truck: 22,        // 22.png = truck/rodillo compactador
      tunel: 23,        // 23.png = tunel
      garras: 24,       // 24.png = garras/máquina araña
      perforadora: 25,  // 25.png = perforadora
      camion: 26        // 26.png = carga/camión minero
    };

    // Mapeo de marcadores a modelos 3D
    const modelMapping = {
      casco: { path: 'lamp.glb', scale: 0.5, rotation: { x: 0, y: 0, z: 0 } },
      pico: { path: 'pico.glb', scale: 0.5, rotation: { x: 0, y: 0, z: 0 } },
      truck: { path: 'truck.glb', scale: 1.5, rotation: { x: 0, y: 0, z: 0 } },
      tunel: { path: 'tunel.glb', scale: 0.5, rotation: { x: 0, y: 0, z: 0 } },
      garras: { path: 'garras.glb', scale: 1.5, rotation: { x: 0, y: 0, z: 0 } },
      perforadora: { path: 'perforadora.glb', scale: 1.5, rotation: { x: 0, y: 0, z: 0 } },
      camion: { path: 'carga.glb', scale: 1.5, rotation: { x: 0, y: 0, z: 0 } }
    };

    const barcodeValue = barcodeMapping[markerType];
    const modelConfig = modelMapping[markerType] || { path: 'lamp.glb', scale: 0.5, rotation: { x: 0, y: 0, z: 0 } };

    if (barcodeValue === undefined) {
      throw new Error(`Marcador "${markerType}" no encontrado`);
    }

    console.log(`📦 Configuración: Barcode ${barcodeValue} -> ${modelConfig.path}`);
    updateStatus(`Configurando barcode ${barcodeValue}...`);

    // Limpiar container
    const container = document.querySelector('#ar-container');
    if (container) container.innerHTML = '';

    // Configurar THREE.js
    scene = new THREE.Scene();
    camera = new THREE.Camera();
    scene.add(camera);

    renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      preserveDrawingBuffer: true  // Para capturas de pantalla
    });
    renderer.setClearColor(new THREE.Color('lightgrey'), 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '1';
    
    if (container) {
      container.appendChild(renderer.domElement);
    }

    updateStatus('Solicitando acceso a la cámara...');

    // Configurar fuente de video (webcam)
    arToolkitSource = new THREEx.ArToolkitSource({ 
      sourceType: 'webcam',
      sourceWidth: window.innerWidth > 640 ? 1280 : 640,
      sourceHeight: window.innerHeight > 480 ? 960 : 480,
      displayWidth: window.innerWidth,
      displayHeight: window.innerHeight
    });

    function onResize() {
      try {
        arToolkitSource.onResizeElement();
        arToolkitSource.copyElementSizeTo(renderer.domElement);
        if (arToolkitContext && arToolkitContext.arController) {
          arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas);
        }
      } catch (e) {
        console.warn('⚠️ Resize error:', e);
      }
    }

    // Inicializar cámara
    await new Promise((resolve, reject) => {
      arToolkitSource.init(function onReady() {
        console.log('✅ Cámara lista');
        updateStatus('Cámara lista, configurando detección...');
        
        // Forzar el tamaño correcto del video
        setTimeout(() => {
          onResize();
          
          // Asegurar que el video se muestre correctamente
          const video = arToolkitSource.domElement;
          if (video) {
            video.style.position = 'absolute';
            video.style.top = '50%';
            video.style.left = '50%';
            video.style.transform = 'translate(-50%, -50%)';
            video.style.minWidth = '100%';
            video.style.minHeight = '100%';
            video.style.width = 'auto';
            video.style.height = 'auto';
            video.style.objectFit = 'cover';
            console.log('📹 Video configurado:', video.videoWidth, 'x', video.videoHeight);
          }
        }, 100);
        
        resolve();
      }, function onError(error) {
        console.error('❌ Error al iniciar cámara:', error);
        reject(error);
      });
    });

    window.addEventListener('resize', () => {
      onResize();
      // Forzar actualización del renderer
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Configurar contexto AR con matriz 3x3
    arToolkitContext = new THREEx.ArToolkitContext({
      cameraParametersUrl: 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js/data/data/camera_para.dat',
      detectionMode: 'mono',
      matrixCodeType: '3x3',  // Usar matriz 3x3 simple (no HAMMING63)
      labelingMode: 'black_region',  // Volver a black_region (más estricto)
      patternRatio: 0.5,
      imageSmoothingEnabled: false,
      maxDetectionRate: 30,  // Reducir frecuencia para evitar falsos positivos
      canvasWidth: 640,
      canvasHeight: 480,
      // Parámetros adicionales para reducir falsos positivos
      thresholdMode: 'manual',
      thresholdValue: 100  // Umbral más alto para reducir falsos positivos
    });

    await new Promise((resolve) => {
      arToolkitContext.init(function onCompleted() {
        camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
        console.log('✅ Contexto AR configurado:');
        console.log('   - Modo detección:', arToolkitContext.parameters.detectionMode);
        console.log('   - Tipo matriz:', arToolkitContext.parameters.matrixCodeType);
        console.log('   - Labeling mode:', arToolkitContext.parameters.labelingMode);
        console.log('   - Canvas:', arToolkitContext.arController.canvas.width, 'x', arToolkitContext.arController.canvas.height);
        console.log('🔍 Buscando barcode ID:', barcodeValue);
        updateStatus('Sistema AR listo. Buscando marcador...');
        resolve();
      });
    });

    // Crear grupo para el marcador
    markerRoot = new THREE.Group();
    scene.add(markerRoot);

    // Configurar controles del marcador (barcode 3x3)
    const markerControls = new THREEx.ArMarkerControls(arToolkitContext, markerRoot, {
      type: 'barcode',
      barcodeValue: barcodeValue,
      changeMatrixMode: 'cameraTransformMatrix',
      smooth: true,
      smoothCount: 5,
      smoothTolerance: 0.01,
      smoothThreshold: 2
    });

    console.log(`🎯 Marcador barcode ${barcodeValue} configurado`);

    updateStatus('Cargando modelo 3D...');

    // Cargar modelo 3D
    const modelPath = `/models/${modelConfig.path}`;
    console.log('📦 Cargando modelo:', modelPath);

    try {
      const loader = new THREE.GLTFLoader();
      const gltf = await new Promise((resolve, reject) => {
        loader.load(
          modelPath,
          (gltf) => {
            console.log('✅ Modelo cargado:', modelPath);
            resolve(gltf);
          },
          (xhr) => {
            const percent = (xhr.loaded / xhr.total) * 100;
            updateStatus(`Cargando modelo ${percent.toFixed(0)}%`);
          },
          (error) => {
            console.warn('⚠️ Error cargando modelo:', error);
            reject(error);
          }
        );
      });

      model3D = gltf.scene;
      
      // Aplicar escala
      model3D.scale.set(modelConfig.scale, modelConfig.scale, modelConfig.scale);
      
      // Aplicar rotación inicial
      if (modelConfig.rotation) {
        model3D.rotation.set(
          modelConfig.rotation.x,
          modelConfig.rotation.y,
          modelConfig.rotation.z
        );
      }
      
      // Posicionar sobre el marcador
      model3D.position.y = modelConfig.scale / 2;
      
      markerRoot.add(model3D);
      console.log('✅ Modelo añadido a la escena');
      
    } catch (err) {
      console.warn('⚠️ Usando cubo de prueba');
      
      // Cubo de fallback
      const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const material = new THREE.MeshPhongMaterial({ 
        color: 0xd81e27,
        shininess: 100 
      });
      model3D = new THREE.Mesh(geometry, material);
      model3D.position.y = 0.25;
      markerRoot.add(model3D);
    }

    // Iluminación
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-1, -1, -1);
    scene.add(directionalLight2);

    // Ocultar loading
    if (loadingEl) {
      loadingEl.classList.add('hidden');
    }

    updateStatus('Buscando marcador...');

    // Configurar controles táctiles
    setupTouchControls();

    // Crear botón de captura
    createCaptureButton();

    // Loop de animación
    isRunning = true;
    let prevVisible = false;
    let detectionCount = 0;
    let frameCount = 0;
    let lastDebugTime = Date.now();
    
    // Sistema de confirmación para evitar falsos positivos
    let consecutiveDetections = 0;
    const REQUIRED_DETECTIONS = 10; // Requiere 10 frames consecutivos para confirmar
    let confirmedVisible = false;

    function animate() {
      if (!isRunning) return;
      requestAnimationFrame(animate);

      frameCount++;
      
      if (arToolkitSource && arToolkitSource.ready !== false) {
        try {
          arToolkitContext.update(arToolkitSource.domElement);
          
          // Debug cada 2 segundos
          const now = Date.now();
          if (now - lastDebugTime > 2000) {
            lastDebugTime = now;
            
            // Intentar obtener información de marcadores detectados
            if (arToolkitContext.arController) {
              const detectedMarkers = arToolkitContext.arController.getMarkerNum();
              console.log('🔍 Debug AR:', {
                buscando: `Barcode ${barcodeValue}`,
                markerVisible: markerRoot.visible,
                marcadoresDetectados: detectedMarkers,
                videoReady: arToolkitSource.ready,
                canvasSize: `${arToolkitContext.arController.canvas.width}x${arToolkitContext.arController.canvas.height}`
              });
              
              // Si hay marcadores detectados, mostrar cuáles con validación
              if (detectedMarkers > 0) {
                console.log('   📊 Hay', detectedMarkers, 'marcador(es) visible(s):');
                let validCount = 0;
                for (let i = 0; i < detectedMarkers; i++) {
                  const marker = arToolkitContext.arController.getMarker(i);
                  if (marker && marker.idPatt >= 0) {
                    const confidence = (marker.cfPatt * 100).toFixed(1);
                    const isValid = marker.cfPatt >= 0.5;
                    const status = isValid ? '✅ VÁLIDO' : '❌ FALSO POSITIVO';
                    console.log(`   ${status} - ID: ${marker.idPatt}, Confianza: ${confidence}%`);
                    if (isValid) validCount++;
                  }
                }
                if (validCount === 0) {
                  console.log('   ⚠️ Todos son falsos positivos (confianza < 50%)');
                }
              } else {
                console.log('   ❌ No hay marcadores detectados');
              }
            }
          }
        } catch (e) {
          if (frameCount % 120 === 0) {
            console.warn('⚠️ Error en update:', e.message);
          }
        }
      }

      renderer.render(scene, camera);

      // Sistema de detección con confirmación para evitar falsos positivos
      const visible = markerRoot.visible;
      
      // Validar que realmente hay un marcador con alta confianza
      let isValidDetection = false;
      let currentConfidence = 0;
      
      if (visible && arToolkitContext.arController) {
        try {
          const detectedMarkers = arToolkitContext.arController.getMarkerNum();
          for (let i = 0; i < detectedMarkers; i++) {
            const marker = arToolkitContext.arController.getMarker(i);
            if (marker && marker.idPatt === barcodeValue) {
              currentConfidence = marker.cfPatt;
              // Requerir confianza mínima de 0.6 (60%) - más estricto
              if (marker.cfPatt >= 0.6) {
                isValidDetection = true;
              }
              break;
            }
          }
        } catch (e) {
          // Silenciar error
        }
      }
      
      // Sistema de confirmación: requiere detecciones consecutivas
      if (isValidDetection) {
        consecutiveDetections++;
        if (consecutiveDetections === 1) {
          console.log(`   🔍 Posible marcador ${barcodeValue}, confirmando... (${consecutiveDetections}/${REQUIRED_DETECTIONS})`);
        }
      } else {
        if (consecutiveDetections > 0) {
          console.log(`   ❌ Perdida detección después de ${consecutiveDetections} frames (era falso positivo)`);
        }
        consecutiveDetections = 0;
      }
      
      // Solo confirmar si hay suficientes detecciones consecutivas
      const shouldBeVisible = consecutiveDetections >= REQUIRED_DETECTIONS;
      
      // Cambio de estado confirmado
      if (shouldBeVisible !== confirmedVisible) {
        confirmedVisible = shouldBeVisible;
        
        if (shouldBeVisible) {
          detectionCount++;
          console.log(`🎯✅ Marcador barcode ${barcodeValue} CONFIRMADO! (${consecutiveDetections} frames, ${(currentConfidence * 100).toFixed(1)}% confianza)`);
          console.log('   📍 Posición:', markerRoot.position);
          console.log('   🔄 Rotación:', markerRoot.rotation);
          console.log('   📏 Escala modelo:', model3D ? model3D.scale : 'sin modelo');
          
          updateStatus(`Barcode ${barcodeValue} detectado ✓`);
          
          if (modelInfoEl) {
            modelInfoEl.classList.add('active');
          }
          
          // Mostrar botón de captura
          const captureBtn = document.getElementById('captureBtn');
          if (captureBtn) {
            captureBtn.style.display = 'flex';
          }
        } else {
          console.log(`🎯❌ Marcador barcode ${barcodeValue} perdido`);
          updateStatus(`Buscando barcode ${barcodeValue}...`);
          
          if (modelInfoEl) {
            modelInfoEl.classList.remove('active');
          }
        }
      }
      
      // Mostrar/ocultar modelo según estado confirmado
      if (model3D) {
        model3D.visible = confirmedVisible;
      }
    }

    animate();
    console.log('🎉 AR.js Scanner iniciado correctamente');

  } catch (error) {
    console.error('❌ Error al inicializar AR.js:', error);
    
    let errorMsg = 'No se pudo inicializar la realidad aumentada. ';
    
    if (error.name === 'NotAllowedError') {
      errorMsg += 'Has denegado el permiso de cámara.';
    } else if (error.name === 'NotFoundError') {
      errorMsg += 'No se encontró ninguna cámara.';
    } else if (error.name === 'NotReadableError') {
      errorMsg += 'La cámara está siendo usada por otra aplicación.';
    } else {
      errorMsg += error.message || 'Error desconocido';
    }
    
    showError(errorMsg);
  }
};

// Función para detener AR
const stopAR = async () => {
  isRunning = false;
  
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
};

// Configurar controles táctiles
function setupTouchControls() {
  if (!model3D) return;

  const arContainer = document.querySelector('#ar-container');
  const isDesktop = !('ontouchstart' in window) || window.innerWidth > 1024;

  // Controles de zoom para desktop
  if (isDesktop) {
    const zoomControls = document.createElement('div');
    zoomControls.className = 'zoom-controls';
    zoomControls.innerHTML = `
      <button class="zoom-btn" id="zoomIn" title="Aumentar tamaño">+</button>
      <div class="zoom-indicator" id="zoomLevel">100%</div>
      <button class="zoom-btn" id="zoomOut" title="Disminuir tamaño">−</button>
      <button class="zoom-btn" id="zoomReset" title="Restablecer">⟲</button>
    `;
    document.body.appendChild(zoomControls);

    const rotationControls = document.createElement('div');
    rotationControls.className = 'rotation-controls';
    rotationControls.innerHTML = `
      <button class="rotation-btn" id="rotateUp">↑</button>
      <button class="rotation-btn" id="rotateLeft">←</button>
      <button class="rotation-btn" id="rotateReset">⟲</button>
      <button class="rotation-btn" id="rotateRight">→</button>
      <button class="rotation-btn" id="rotateDown">↓</button>
    `;
    document.body.appendChild(rotationControls);

    const initialScale = model3D.scale.x;
    const initialRotation = { x: model3D.rotation.x, y: model3D.rotation.y, z: model3D.rotation.z };

    const updateZoomDisplay = () => {
      const percentage = Math.round((model3D.scale.x / initialScale) * 100);
      document.getElementById('zoomLevel').textContent = `${percentage}%`;
    };

    document.getElementById('zoomIn').addEventListener('click', () => {
      const newScale = Math.min(model3D.scale.x * 1.2, MAX_SCALE);
      model3D.scale.set(newScale, newScale, newScale);
      updateZoomDisplay();
    });

    document.getElementById('zoomOut').addEventListener('click', () => {
      const newScale = Math.max(model3D.scale.x * 0.8, MIN_SCALE);
      model3D.scale.set(newScale, newScale, newScale);
      updateZoomDisplay();
    });

    document.getElementById('zoomReset').addEventListener('click', () => {
      model3D.scale.set(initialScale, initialScale, initialScale);
      updateZoomDisplay();
    });

    // Rotación con botones
    const ROTATION_SPEED = 0.05;
    let rotationInterval = null;

    const startRotation = (axis, direction) => {
      if (rotationInterval) clearInterval(rotationInterval);
      rotationInterval = setInterval(() => {
        model3D.rotation[axis] += ROTATION_SPEED * direction;
      }, 16);
    };

    const stopRotation = () => {
      if (rotationInterval) {
        clearInterval(rotationInterval);
        rotationInterval = null;
      }
    };

    document.getElementById('rotateLeft').addEventListener('mousedown', () => startRotation('y', -1));
    document.getElementById('rotateLeft').addEventListener('mouseup', stopRotation);
    document.getElementById('rotateLeft').addEventListener('mouseleave', stopRotation);

    document.getElementById('rotateRight').addEventListener('mousedown', () => startRotation('y', 1));
    document.getElementById('rotateRight').addEventListener('mouseup', stopRotation);
    document.getElementById('rotateRight').addEventListener('mouseleave', stopRotation);

    document.getElementById('rotateUp').addEventListener('mousedown', () => startRotation('x', -1));
    document.getElementById('rotateUp').addEventListener('mouseup', stopRotation);
    document.getElementById('rotateUp').addEventListener('mouseleave', stopRotation);

    document.getElementById('rotateDown').addEventListener('mousedown', () => startRotation('x', 1));
    document.getElementById('rotateDown').addEventListener('mouseup', stopRotation);
    document.getElementById('rotateDown').addEventListener('mouseleave', stopRotation);

    document.getElementById('rotateReset').addEventListener('click', () => {
      model3D.rotation.set(initialRotation.x, initialRotation.y, initialRotation.z);
    });

    // Zoom con rueda del mouse
    arContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, model3D.scale.x * delta));
      model3D.scale.set(newScale, newScale, newScale);
      updateZoomDisplay();
    }, { passive: false });
  }

  // Rotación con mouse (desktop)
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  arContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    if (isDesktop) arContainer.style.cursor = 'grabbing';
  });

  arContainer.addEventListener('mouseup', () => {
    isDragging = false;
    if (isDesktop) arContainer.style.cursor = 'grab';
  });

  arContainer.addEventListener('mouseleave', () => {
    isDragging = false;
    if (isDesktop) arContainer.style.cursor = 'grab';
  });

  arContainer.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      model3D.rotation.y += dx * 0.01;
      model3D.rotation.x += dy * 0.01;
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });

  // Controles táctiles móviles
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
    
    // Rotación con un dedo
    if (isDragging && e.touches.length === 1) {
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      
      const deltaX = touchX - lastTouchX;
      const deltaY = touchY - lastTouchY;
      
      model3D.rotation.y += deltaX * 0.015;
      model3D.rotation.x += deltaY * 0.015;
      
      lastTouchX = touchX;
      lastTouchY = touchY;
    } 
    // Zoom con dos dedos
    else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      if (lastPinchDist > 0) {
        const delta = dist - lastPinchDist;
        const scaleFactor = 1 + (delta * 0.005);
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, model3D.scale.x * scaleFactor));
        model3D.scale.set(newScale, newScale, newScale);
      }
      
      lastPinchDist = dist;
    }
  }, { passive: false });

  if (isDesktop) {
    arContainer.style.cursor = 'grab';
  }
}

// Crear botón de captura
function createCaptureButton() {
  const isDesktop = !('ontouchstart' in window) || window.innerWidth > 1024;
  
  if (isDesktop) {
    const zoomControls = document.querySelector('.zoom-controls');
    if (zoomControls) {
      const captureBtn = document.createElement('button');
      captureBtn.className = 'zoom-btn capture-btn-integrated';
      captureBtn.id = 'captureBtn';
      captureBtn.title = 'Capturar pantalla';
      captureBtn.innerHTML = '📷';
      captureBtn.style.display = 'none';
      zoomControls.appendChild(captureBtn);
      
      captureBtn.addEventListener('click', captureScreen);
    }
  } else {
    const captureBtn = document.createElement('button');
    captureBtn.className = 'capture-btn-mobile';
    captureBtn.id = 'captureBtn';
    captureBtn.innerHTML = '📷';
    captureBtn.style.display = 'none';
    document.body.appendChild(captureBtn);
    
    captureBtn.addEventListener('click', captureScreen);
  }
}

// Capturar pantalla
function captureScreen() {
  console.log('📸 Capturando pantalla...');
  
  const captureBtn = document.getElementById('captureBtn');
  if (!captureBtn) return;
  
  const isDesktop = !('ontouchstart' in window) || window.innerWidth > 1024;
  const originalIcon = captureBtn.innerHTML;
  
  captureBtn.innerHTML = '⏳';
  captureBtn.classList.add('capturing');
  
  try {
    if (!renderer || !scene || !camera || !model3D) {
      throw new Error('Sistema AR no inicializado');
    }

    // Crear escena temporal limpia
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
    
    // Clonar modelo
    const modelClone = model3D.clone();
    modelClone.position.copy(model3D.position);
    modelClone.rotation.copy(model3D.rotation);
    modelClone.scale.copy(model3D.scale);
    modelClone.updateMatrixWorld(true);
    
    captureScene.add(modelClone);
    
    // Canvas temporal de alta resolución
    const tempCanvas = document.createElement('canvas');
    const captureWidth = 1920;
    const captureHeight = 1920;
    tempCanvas.width = captureWidth;
    tempCanvas.height = captureHeight;
    
    const tempRenderer = new THREE.WebGLRenderer({
      canvas: tempCanvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    
    tempRenderer.setSize(captureWidth, captureHeight);
    tempRenderer.setClearColor(0xffffff, 0);
    
    const captureCamera = camera.clone();
    captureCamera.aspect = 1;
    captureCamera.updateProjectionMatrix();
    
    tempRenderer.render(captureScene, captureCamera);
    
    tempCanvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('No se pudo crear la imagen');
      }

      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `MiningTech_AR_${timestamp}.png`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      tempRenderer.dispose();
      captureScene.clear();
      
      console.log('✅ Captura guardada:', filename);
      
      captureBtn.classList.remove('capturing');
      captureBtn.classList.add('captured');
      captureBtn.innerHTML = '✅';
      
      setTimeout(() => {
        captureBtn.classList.remove('captured');
        captureBtn.innerHTML = originalIcon;
      }, 2000);
      
    }, 'image/png', 1.0);
    
  } catch (error) {
    console.error('❌ Error al capturar:', error);
    
    captureBtn.classList.remove('capturing');
    captureBtn.classList.add('error');
    captureBtn.innerHTML = '❌';
    
    setTimeout(() => {
      captureBtn.classList.remove('error');
      captureBtn.innerHTML = originalIcon;
    }, 2000);
  }
}

// Exportar función de detención
window.stopAR = stopAR;
