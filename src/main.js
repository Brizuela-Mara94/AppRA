import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Variables globales para el reinicio
let mindarThree = null;
let isRunning = false;
let restartButtonListener = null;

// Cargamos el sonido globalmente (ruta relativa con base URL)
const roarAudio = new Audio(`${import.meta.env.BASE_URL}sounds/roar.mp3`);

window.start = async () => {
  if (isRunning && mindarThree) {
    await stopAR();
  }

  mindarThree = new MindARThree({
    container: document.querySelector("#ar-container"),
    imageTargetSrc: `${import.meta.env.BASE_URL}mind/targets.mind`, // RUTA CON BASE URL
  });

  const { renderer, scene, camera } = mindarThree;

  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  const anchors = [
    mindarThree.addAnchor(0),
    mindarThree.addAnchor(1),
    mindarThree.addAnchor(2),
    mindarThree.addAnchor(3),
  ];

  const loader = new GLTFLoader();
  const loadModel = (url, scale = 0.1) => {
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          model.scale.set(scale, scale, scale);
          resolve(model);
        },
        undefined,
        (error) => reject(error)
      );
    });
  };

  try {
    const models = await Promise.all([
      loadModel(`${import.meta.env.BASE_URL}models/brachiosaurus.glb`, 0.1),
      loadModel(`${import.meta.env.BASE_URL}models/trex.glb`, 0.1),
      loadModel(`${import.meta.env.BASE_URL}models/triceratops.glb`, 1),
      loadModel(`${import.meta.env.BASE_URL}models/velociraptor.glb`, 0.1),
    ]);

    anchors.forEach((anchor, i) => {
      anchor.group.add(models[i]);
    });

    const labels = [
      document.getElementById('label-brachiosaurus'),
      document.getElementById('label-trex'),
      document.getElementById('label-triceratops'),
      document.getElementById('label-velociraptor'),
    ];

    anchors.forEach((anchor, i) => {
      anchor.onTargetFound = () => {
        labels[i].style.display = 'block';
        document.getElementById('restart-button').classList.add('hidden');
        roarAudio.currentTime = 0;
        roarAudio.play();

        if (window.showDinoInfo) {
          window.showDinoInfo(i);
        }
      };

      anchor.onTargetLost = () => {
        labels[i].style.display = 'none';
        document.getElementById('restart-button').classList.remove('hidden');
        roarAudio.pause();
        roarAudio.currentTime = 0;

        if (window.hideDinoInfo) {
          window.hideDinoInfo();
        }
      };
    });

    await mindarThree.start();
    isRunning = true;

    renderer.setAnimationLoop(() => {
      if (isRunning) {
        models.forEach((model) => {
          model.rotation.y += 0.01;
        });
        renderer.render(scene, camera);
      }
    });

    document.getElementById('restart-button').classList.remove('hidden');
    setupRestartButton();

  } catch (error) {
    console.error('Error cargando modelos:', error);
    const searchText = document.querySelector('.search-text');
    if (searchText) {
      searchText.textContent = '❌ Error cargando modelos';
      searchText.style.color = '#ff6b6b';
    }
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

      const labels = document.querySelectorAll('.label');
      labels.forEach(label => {
        label.style.display = 'none';
      });

      if (window.hideDinoInfo) {
        window.hideDinoInfo();
      }

    } catch (error) {
      console.error('Error deteniendo AR:', error);
    }
  }
};

const setupRestartButton = () => {
  const restartButton = document.getElementById('restart-button');

  if (restartButtonListener) {
    restartButton.removeEventListener('click', restartButtonListener);
  }

  restartButtonListener = async () => {
    console.log('Reiniciando escaneo...');

    restartButton.classList.add('hidden');
    const originalText = restartButton.textContent;
    restartButton.textContent = '⏳ Reiniciando...';
    restartButton.disabled = true;

    try {
      await stopAR();

      const searchText = document.querySelector('.search-text');
      if (searchText) {
        searchText.textContent = '🔍 Buscando marcadores...';
        searchText.style.color = '#00b894';
      }

      setTimeout(async () => {
        await window.start();
        restartButton.textContent = originalText;
        restartButton.disabled = false;
      }, 500);

    } catch (error) {
      console.error('Error en reinicio:', error);
      restartButton.classList.remove('hidden');
      restartButton.textContent = originalText;
      restartButton.disabled = false;
    }
  };

  restartButton.addEventListener('click', restartButtonListener);
};

