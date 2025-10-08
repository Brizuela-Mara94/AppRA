import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Variables globales
let mindarThree = null;
let isRunning = false;
let model3D = null;
let isRotating = false;

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
    const modelMapping = {
      // Dinosaurios originales (si los quieres mantener para pruebas)
      dino1_brachiosaurus: { path: 'brachiosaurus.glb', scale: 0.1, index: 0, rotation: { x: 0, y: 0, z: 0 } },
      dino2_trex: { path: 'trex.glb', scale: 0.1, index: 1, rotation: { x: 0, y: 0, z: 0 } },
      dino3_triceratops: { path: 'triceratops.glb', scale: 1.0, index: 2, rotation: { x: 0, y: 0, z: 0 } },
      dino4_velociraptor: { path: 'velociraptor.glb', scale: 0.1, index: 3, rotation: { x: 0, y: 0, z: 0 } },
      
      // Maquinaria - según el orden de compilación de targets.mind
      // ÍNDICE 0 - Marcador: lamp
      casco: { path: 'lamp.glb', scale: 0.3, index: 0, rotation: { x: 0, y: 0, z: 0 } },
      
      // ÍNDICE 1 - Marcador: pico
      pico: { path: 'pico.glb', scale: 0.3, index: 1, rotation: { x: 0, y: 0, z: 0 } },
      
      // ÍNDICE 2 - Marcador: truck
      camion: { path: 'truck.glb', scale: 1, index: 2, rotation: { x: 0, y: 0, z: 0 } },
      
      // ÍNDICE 3 - Marcador: tunel
      excavadora: { path: 'tunel.glb', scale: 0.3, index: 3, rotation: { x: 0, y: 0, z: 0 } },
      pala: { path: 'tuneldoble.glb', scale: 0.1, index: 3, rotation: { x: 0, y: 0, z: 0 } },
      
      // ÍNDICE 4 - Marcador: garras
      cargador: { path: 'garras.glb', scale: 1, index: 4, rotation: { x: 0, y: 0, z: 0 } },
      bulldozer: { path: 'bulldozer.glb', scale: 0.1, index: 4, rotation: { x: 0, y: 0, z: 0 } },
      
      // Otros (asignar a índices existentes)
      perforadora: { path: 'perforadora.glb', scale: 1.0, index: 3, rotation: { x: 0, y: 0, z: 0 } },
      motoniveladora: { path: 'motoniveladora.glb', scale: 1.0, index: 4, rotation: { x: 0, y: 0, z: 0 } }
    };

    const modelConfig = modelMapping[markerType] || { path: 'trex.glb', scale: 0.1, index: 1, rotation: { x: 0, y: 0, z: 0 } };

    // Crear instancia de MindAR
    mindarThree = new MindARThree({
      container: document.querySelector("#ar-container"),
      imageTargetSrc: `${import.meta.env.BASE_URL}target/targets.mind`,
    });

    const { renderer, scene, camera } = mindarThree;

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

    // Crear TODOS los anchors (5 targets en targets.mind)
    // Esto es CRÍTICO: MindAR requiere que se creen todos los anchors
    console.log('🎯 Creando 5 anchors para los 5 targets (lamp, pico, truck, tunel, garras)...');
    const anchors = [
      mindarThree.addAnchor(0), // lamp
      mindarThree.addAnchor(1), // pico
      mindarThree.addAnchor(2), // truck
      mindarThree.addAnchor(3), // tunel
      mindarThree.addAnchor(4), // garras
    ];
    console.log('✅ Anchors creados:', anchors.length);

    // Añadir el modelo al anchor correspondiente según el índice
    const targetAnchor = anchors[modelConfig.index];
    if (!targetAnchor) {
      console.error(`❌ No se pudo obtener anchor para índice ${modelConfig.index}`);
      throw new Error(`Anchor index ${modelConfig.index} no válido`);
    }
    
    targetAnchor.group.add(model3D);
    console.log(`📍 Modelo agregado al anchor ${modelConfig.index}`);
    console.log('📊 Estado del anchor:', {
      index: modelConfig.index,
      children: targetAnchor.group.children.length,
      modelo: model3D.type
    });

    // Configurar eventos para TODOS los anchors (para debugging)
    anchors.forEach((anchor, idx) => {
      anchor.onTargetFound = () => {
        console.log(`✅ TARGET ${idx} DETECTADO`);
        if (idx === modelConfig.index) {
          console.log(`   ↳ Este es el target correcto para ${markerType}`);
          updateStatus('Modelo detectado ✓');
          if (modelInfoEl) {
            modelInfoEl.classList.add('active');
          }
        } else {
          console.log(`   ↳ Target incorrecto. Esperando target ${modelConfig.index} para ${markerType}`);
          updateStatus(`Marcador ${idx} detectado (usar marcador ${modelConfig.index})`);
        }
      };

      anchor.onTargetLost = () => {
        console.log(`❌ TARGET ${idx} PERDIDO`);
        if (idx === modelConfig.index) {
          updateStatus('Buscando marcador...');
          if (modelInfoEl) {
            modelInfoEl.classList.remove('active');
          }
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
        if (isRotating && model3D) {
          model3D.rotation.y += 0.01;
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
  let isDragging = false;
  let lastPinchDist = 0;

  const arContainer = document.querySelector('#ar-container');

  arContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  arContainer.addEventListener('mouseup', () => {
    isDragging = false;
  });

  arContainer.addEventListener('mousemove', (e) => {
    if (isDragging && model) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      model.rotation.y += dx * 0.01;
      model.rotation.x += dy * 0.01;
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });

  arContainer.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      lastPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  });

  arContainer.addEventListener('touchend', () => {
    isDragging = false;
    lastPinchDist = 0;
  });

  arContainer.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches.length === 1 && model) {
      const dx = e.touches[0].clientX - lastX;
      const dy = e.touches[0].clientY - lastY;
      model.rotation.y += dx * 0.01;
      model.rotation.x += dy * 0.01;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2 && model) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist - lastPinchDist;
      const newScale = model.scale.x + delta * 0.001;
      model.scale.set(newScale, newScale, newScale);
      lastPinchDist = dist;
    }
  });
}

// Export stopAR function for external use
window.stopAR = stopAR;
