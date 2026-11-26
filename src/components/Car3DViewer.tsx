import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CarFront, RotateCw } from 'lucide-react';
import type { CameraMode, ThemeMode } from '../utils/launcherStore';
import { isDarkThemeActive } from '../utils/launcherStore';

interface Car3DViewerProps {
  car3DOn: boolean;
  demoDriveOn: boolean;
  rainbowRoadOn: boolean;
  themeMode: ThemeMode;
  cameraMode: CameraMode;
  compact?: boolean;
  className?: string;
}

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const Car3DViewer: React.FC<Car3DViewerProps> = ({
  car3DOn,
  demoDriveOn,
  rainbowRoadOn,
  themeMode,
  cameraMode,
  compact = false,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ demoDriveOn, rainbowRoadOn, themeMode, cameraMode });
  propsRef.current = { demoDriveOn, rainbowRoadOn, themeMode, cameraMode };

  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [modelReady, setModelReady] = useState<boolean>(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [turntableDeg, setTurntableDeg] = useState<number>(28);
  const dragStartRef = useRef<{ x: number; deg: number } | null>(null);

  useEffect(() => {
    if (!car3DOn) return;
    const container = mountRef.current;
    if (!container) return;

    let disposed = false;
    let frameId = 0;
    let resetTimer: number | undefined;
    let webglLost = false;

    const isSoftwareGl = detectSoftwareGl();

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 220);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.15, 280);
    const fsdLookAtBase = new THREE.Vector3(0, 0.52, 0);
    camera.position.set(0, 2.25, 4.45);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);

    // Studio environment reflections for metallic EV paint & glass
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.065;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.05;
    controls.enablePan = false;
    controls.minPolarAngle = 0.14;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 1.8;
    controls.maxDistance = 36.0;
    controls.target.copy(fsdLookAtBase);
    controls.update();

    let isUserInteracting = false;
    const onControlsStart = () => {
      isUserInteracting = true;
      if (resetTimer !== undefined) window.clearTimeout(resetTimer);
    };
    const onControlsEnd = () => {
      if (resetTimer !== undefined) window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        isUserInteracting = false;
      }, 3600);
    };
    controls.addEventListener('start', onControlsStart);
    controls.addEventListener('end', onControlsEnd);

    // Warm/cool three-point automotive studio lighting
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const mainSun = new THREE.DirectionalLight(0xfff7ed, 1.4);
    mainSun.position.set(8, 16, 10);
    scene.add(mainSun);

    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.85);
    rimLight.position.set(-8, 10, -12);
    scene.add(rimLight);

    // Ground radar disc shader (fades smoothly to transparent at edges)
    const groundUniforms = {
      uNight: { value: isDarkThemeActive(propsRef.current.themeMode) ? 1.0 : 0.0 },
      uPulse: { value: 0.0 },
      uSpeedNorm: { value: 0.0 },
    };

    const groundGeo = new THREE.CircleGeometry(140, 64);
    const groundMat = new THREE.ShaderMaterial({
      uniforms: groundUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec3 vWorldPos;
        uniform float uNight;
        uniform float uPulse;
        uniform float uSpeedNorm;
        void main() {
          float r = length(vWorldPos.xz);
          float fade = 1.0 - smoothstep(12.0, 95.0, r);
          if (fade <= 0.005) discard;
          vec3 dayCol = vec3(0.84, 0.89, 0.95);
          vec3 nightCol = vec3(0.03, 0.06, 0.13);
          vec3 col = mix(dayCol, nightCol, uNight);
          float gx = abs(fract(vWorldPos.x * 0.125) - 0.5);
          float gz = abs(fract(vWorldPos.z * 0.125) - 0.5);
          float grid = 1.0 - smoothstep(0.0, 0.025, min(gx, gz));
          vec3 gridCol = mix(vec3(0.50, 0.65, 0.82), vec3(0.14, 0.50, 0.78), uNight);
          col = mix(col, gridCol, grid * mix(0.24, 0.42, uNight) * (1.0 - smoothstep(18.0, 85.0, r)));
          float pulseR = fract(uPulse) * 26.0;
          float ring = exp(-pow((r - pulseR) * 0.65, 2.0)) * (1.0 - fract(uPulse));
          col += vec3(0.15, 0.72, 0.98) * ring * (0.28 + 0.30 * uSpeedNorm);
          float alpha = fade * mix(0.26, 0.66, uNight);
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    const groundDisc = new THREE.Mesh(groundGeo, groundMat);
    groundDisc.rotation.x = -Math.PI / 2;
    groundDisc.position.y = -0.01;
    scene.add(groundDisc);

    // Contact shadow beneath EV
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sctx = shadowCanvas.getContext('2d');
    if (sctx) {
      const sgrad = sctx.createRadialGradient(128, 128, 12, 128, 128, 120);
      sgrad.addColorStop(0, 'rgba(0,0,0,0.82)');
      sgrad.addColorStop(0.55, 'rgba(0,0,0,0.36)');
      sgrad.addColorStop(1, 'rgba(0,0,0,0)');
      sctx.fillStyle = sgrad;
      sctx.fillRect(0, 0, 256, 256);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    shadowTex.colorSpace = THREE.SRGBColorSpace;
    const shadowGeo = new THREE.PlaneGeometry(2.15, 3.65);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.015;
    shadowPlane.visible = false;
    scene.add(shadowPlane);

    const carBodyGroup = new THREE.Group();
    scene.add(carBodyGroup);
    const allWheels: THREE.Object3D[] = [];

    // Predictive FSD / Rainbow Road path ribbon
    const PATH_SEGS = 56;
    const PATH_LEN = 30.0;
    const PATH_HALF_W = 1.15;
    const pathPositions = new Float32Array((PATH_SEGS + 1) * 2 * 3);
    const pathUvs = new Float32Array((PATH_SEGS + 1) * 2 * 2);
    const pathIndices: number[] = [];
    for (let i = 0; i <= PATH_SEGS; i++) {
      const t = i / PATH_SEGS;
      const z = 1.8 - PATH_LEN * t;
      const idx = i * 2;
      pathPositions[idx * 3] = -PATH_HALF_W;
      pathPositions[idx * 3 + 1] = 0;
      pathPositions[idx * 3 + 2] = z;
      pathPositions[(idx + 1) * 3] = PATH_HALF_W;
      pathPositions[(idx + 1) * 3 + 1] = 0;
      pathPositions[(idx + 1) * 3 + 2] = z;
      pathUvs[idx * 2] = -1.0;
      pathUvs[idx * 2 + 1] = -z;
      pathUvs[(idx + 1) * 2] = 1.0;
      pathUvs[(idx + 1) * 2 + 1] = -z;
      if (i < PATH_SEGS) {
        pathIndices.push(idx, idx + 1, idx + 2, idx + 1, idx + 3, idx + 2);
      }
    }
    const pathGeo = new THREE.BufferGeometry();
    pathGeo.setAttribute('position', new THREE.BufferAttribute(pathPositions, 3));
    pathGeo.setAttribute('uv', new THREE.BufferAttribute(pathUvs, 2));
    pathGeo.setIndex(pathIndices);

    const pathUniforms = {
      uFlow: { value: 0.0 },
      uWave: { value: 0.0 },
      uRainbow: { value: propsRef.current.rainbowRoadOn ? 1.0 : 0.0 },
      uSpeedNorm: { value: 0.0 },
    };
    const pathMat = new THREE.ShaderMaterial({
      uniforms: pathUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform float uFlow;
        uniform float uWave;
        uniform float uRainbow;
        uniform float uSpeedNorm;
        const float TAU = 6.2831853;
        vec3 rb(float t) {
          return 0.52 + 0.48 * cos(TAU * (t + vec3(0.0, 0.33, 0.67)));
        }
        void main() {
          float lat = vUv.x;
          float aLat = abs(lat);
          float dist = vUv.y;
          float farFade = smoothstep(28.0, 11.0, dist);
          float nearFade = smoothstep(-2.4, -0.5, dist);
          float sideFade = 1.0 - smoothstep(0.75, 1.0, aLat);
          float env = farFade * nearFade * sideFade;
          if (env <= 0.004) discard;
          float wave = exp(-pow((fract(dist * 0.24 + uWave - aLat * 0.28) - 0.5) * 4.2, 2.0));
          vec3 fsdCol = mix(vec3(0.08, 0.45, 0.85), vec3(0.22, 0.84, 1.0), 0.35 + 0.65 * wave);
          vec3 rainbowCol = rb(lat * 0.45 + dist * 0.07 + uFlow) * (0.85 + 0.25 * wave);
          vec3 col = mix(fsdCol, rainbowCol, uRainbow);
          float edgeLine = 1.0 - smoothstep(0.68, 0.78, aLat);
          float borderGlow = exp(-pow((aLat - 0.74) / 0.08, 2.0)) * 0.7;
          col = mix(col, vec3(0.88, 0.96, 1.0), borderGlow * 0.65);
          float alpha = env * (edgeLine * mix(0.32, 0.65, uRainbow) + borderGlow * 0.42 + wave * 0.14 * uSpeedNorm);
          gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.92));
        }
      `,
    });
    const pathMesh = new THREE.Mesh(pathGeo, pathMat);
    pathMesh.position.y = 0.02;
    scene.add(pathMesh);

    let lastPathCurvature = 999.0;
    function updatePredictivePath(curvature: number) {
      if (Math.abs(curvature - lastPathCurvature) < 0.002) return;
      lastPathCurvature = curvature;
      const attr = pathGeo.attributes.position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i <= PATH_SEGS; i++) {
        const t = i / PATH_SEGS;
        const z = 1.8 - PATH_LEN * t;
        const d = Math.max(0.0, -z - 0.5);
        const cx = curvature * d * d * 0.025;
        const slope = curvature * 2.0 * d * 0.025;
        const inv = 1.0 / Math.sqrt(1.0 + slope * slope);
        const idx = i * 2;
        arr[idx * 3] = cx - PATH_HALF_W * inv;
        arr[idx * 3 + 2] = z - PATH_HALF_W * slope * inv;
        arr[(idx + 1) * 3] = cx + PATH_HALF_W * inv;
        arr[(idx + 1) * 3 + 2] = z + PATH_HALF_W * slope * inv;
      }
      attr.needsUpdate = true;
    }

    // Load the authentic carnew.glb model
    const maxAniso = isSoftwareGl
      ? 1
      : Math.min(2, renderer.capabilities.getMaxAnisotropy?.() ?? 1);
    const loader = new GLTFLoader();
    loader.load(
      '/models/carnew.glb',
      (gltf) => {
        if (disposed) return;
        const loaded = gltf.scene;
        loaded.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => {
              if (!m) return;
              m.side = m.transparent ? THREE.DoubleSide : THREE.FrontSide;
              const std = m as THREE.MeshStandardMaterial;
              [std.map, std.normalMap, std.roughnessMap, std.metalnessMap].forEach((tex) => {
                if (tex) {
                  tex.anisotropy = maxAniso;
                  if (tex === std.map) tex.colorSpace = THREE.SRGBColorSpace;
                }
              });
            });
          }
        });

        carBodyGroup.add(loaded);
        const box0 = new THREE.Box3().setFromObject(loaded);
        const size0 = box0.getSize(new THREE.Vector3());
        const maxDim = Math.max(size0.x, size0.y, size0.z);
        const scale = 2.95 / (maxDim || 1);
        loaded.scale.set(scale, scale, scale);
        loaded.rotation.y = Math.PI;
        loaded.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(loaded);
        const center = box.getCenter(new THREE.Vector3());
        loaded.position.x -= center.x;
        loaded.position.z -= center.z;
        loaded.position.y -= box.min.y;
        loaded.updateMatrixWorld(true);

        loaded.traverse((node) => {
          if ((node as THREE.Mesh).isMesh && node.name && /wheel|tire|rim|輪/i.test(node.name)) {
            allWheels.push(node);
          }
        });

        const alignedBox = new THREE.Box3().setFromObject(carBodyGroup);
        const alignedCenter = alignedBox.getCenter(new THREE.Vector3());
        const carHeight = alignedBox.max.y - alignedBox.min.y;
        fsdLookAtBase.set(alignedCenter.x, alignedCenter.y + carHeight * 0.12, alignedCenter.z);
        shadowPlane.visible = true;
        setModelReady(true);
        setLoadProgress(100);
      },
      (xhr) => {
        if (disposed) return;
        if (xhr.total > 0) {
          setLoadProgress(Math.min(99, Math.round((xhr.loaded / xhr.total) * 100)));
        }
      },
      () => {
        if (disposed) return;
        setModelError('無法載入 3D 電動車模型');
      }
    );

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      webglLost = true;
    };
    const handleContextRestored = () => {
      webglLost = false;
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const resizeObserver = new ResizeObserver(() => {
      if (disposed) return;
      const w = Math.max(container.clientWidth, 100);
      const h = Math.max(container.clientHeight, 100);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // Pacing helper for Software WebGL (per threejs skill)
    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    let prevTime = performance.now();
    let currentSpeedKmh = 0;
    let currentCurvature = 0;
    let demoZ = 0;
    let pulsePhase = 0;
    let pathFlowPhase = 0;
    let pathWavePhase = 0;
    const desiredCamPos = new THREE.Vector3();

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - prevTime) / 1000));
      prevTime = now;

      const { demoDriveOn: isDemo, rainbowRoadOn: isRainbow, themeMode: tMode, cameraMode: cMode } =
        propsRef.current;

      const nightTarget = isDarkThemeActive(tMode) ? 1.0 : 0.0;
      groundUniforms.uNight.value +=
        (nightTarget - groundUniforms.uNight.value) * Math.min(1.0, dt * 4.0);
      const nVal = groundUniforms.uNight.value;
      hemiLight.intensity = 1.05 - nVal * 0.35;
      mainSun.intensity = 1.45 - nVal * 0.4;

      let targetSpeed = 0;
      let targetCurvature = 0;
      if (isDemo) {
        const t = now * 0.001;
        const K = (Math.PI * 2.0) / 200.0;
        targetSpeed = 48.0 + 24.0 * Math.sin(t * 0.55);
        const mps = currentSpeedKmh / 3.6;
        demoZ -= mps * dt;
        if (demoZ <= -200.0) demoZ += 200.0;
        const roadSlope = Math.cos(demoZ * K) * 14.0 * K;
        targetCurvature = Math.max(-1.25, Math.min(1.25, -roadSlope * 2.2));
      }

      const prevSpeed = currentSpeedKmh;
      currentSpeedKmh += (targetSpeed - currentSpeedKmh) * Math.min(1.0, dt * 3.8);
      if (currentSpeedKmh < 0.15 && targetSpeed === 0) currentSpeedKmh = 0;
      currentCurvature += (targetCurvature - currentCurvature) * Math.min(1.0, dt * 4.5);

      const accel = (currentSpeedKmh - prevSpeed) / dt;
      const targetPitch = Math.max(-0.04, Math.min(0.04, -accel * 0.0016));
      const targetRoll = Math.max(
        -0.04,
        Math.min(0.04, -currentCurvature * 0.024 * Math.min(1.0, currentSpeedKmh / 40.0))
      );
      carBodyGroup.rotation.x += (targetPitch - carBodyGroup.rotation.x) * Math.min(1.0, dt * 6.0);
      carBodyGroup.rotation.z += (targetRoll - carBodyGroup.rotation.z) * Math.min(1.0, dt * 6.0);

      const mps = currentSpeedKmh / 3.6;
      const wheelStep = (mps * dt) / 0.26;
      for (let i = 0; i < allWheels.length; i++) {
        allWheels[i].rotation.x -= wheelStep;
      }

      updatePredictivePath(currentCurvature);
      const speedNorm = Math.min(1.0, currentSpeedKmh / 100.0);
      pathFlowPhase = (pathFlowPhase + mps * 0.055 * dt) % 1.0;
      pathWavePhase = (pathWavePhase + mps * 0.15 * dt) % 1.0;
      pulsePhase = (pulsePhase + (0.28 + speedNorm * 0.45) * dt) % 1.0;
      pathUniforms.uFlow.value = pathFlowPhase;
      pathUniforms.uWave.value = pathWavePhase;
      pathUniforms.uRainbow.value +=
        ((isRainbow ? 1.0 : 0.0) - pathUniforms.uRainbow.value) * Math.min(1.0, dt * 6.0);
      pathUniforms.uSpeedNorm.value = speedNorm;
      groundUniforms.uPulse.value = pulsePhase;
      groundUniforms.uSpeedNorm.value = speedNorm;

      if (!isUserInteracting) {
        if (cMode === 1) {
          desiredCamPos.set(0, (compact ? 14.5 : 18.0) + speedNorm * 4.0, compact ? 6.2 : 7.5);
        } else if (cMode === 2) {
          const angle = now * 0.00032;
          const radius = compact ? 3.85 : 4.6;
          desiredCamPos.set(Math.sin(angle) * radius, compact ? 1.85 : 2.05, Math.cos(angle) * radius);
        } else {
          desiredCamPos.set(
            0,
            (compact ? 1.85 : 2.2) + speedNorm * 0.3,
            (compact ? 3.55 : 4.35) + speedNorm * 0.95
          );
        }
        camera.position.lerp(desiredCamPos, Math.min(1.0, dt * 3.2));
        controls.target.lerp(fsdLookAtBase, Math.min(1.0, dt * 5.0));
      }
      controls.update();
      if (camera.position.y < 0.35) camera.position.y = 0.35;

      if (!webglLost) {
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      renderer.render(scene, camera);
      afterDraw(tick);
    } else {
      frameId = window.requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      if (resetTimer !== undefined) window.clearTimeout(resetTimer);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlsStart);
      controls.removeEventListener('end', onControlsEnd);
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      groundGeo.dispose();
      groundMat.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      shadowTex.dispose();
      pathGeo.dispose();
      pathMat.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [car3DOn]);

  if (!car3DOn) {
    return (
      <div
        className={`relative w-full h-full flex flex-col items-center justify-center select-none cursor-grab active:cursor-grabbing ${className}`}
        onPointerDown={(e) => {
          dragStartRef.current = { x: e.clientX, deg: turntableDeg };
        }}
        onPointerMove={(e) => {
          if (!dragStartRef.current) return;
          const dx = e.clientX - dragStartRef.current.x;
          setTurntableDeg((dragStartRef.current.deg + dx * 0.45) % 360);
        }}
        onPointerUp={() => {
          dragStartRef.current = null;
        }}
        onPointerLeave={() => {
          dragStartRef.current = null;
        }}
      >
        <div className="relative flex flex-col items-center gap-3">
          <div
            className="w-48 h-48 rounded-full border border-sky-400/30 bg-sky-500/10 flex items-center justify-center shadow-inner transition-transform duration-75"
            style={{ transform: `perspective(600px) rotateY(${turntableDeg}deg)` }}
          >
            <CarFront className="w-24 h-24 text-sky-400" strokeWidth={1.4} />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <RotateCw size={13} />
            <span>360° 轉盤檢視 · 左右拖曳旋轉（{Math.round(((turntableDeg % 360) + 360) % 360)}°）</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="car-3d-viewport"
      className={`relative w-full h-full overflow-hidden ${className}`}
    >
      {/* Dedicated isolated WebGL canvas container */}
      <div ref={mountRef} className="w-full h-full" />

      {!modelReady && !modelError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="px-4 py-2 rounded-2xl bg-slate-900/80 border border-white/15 text-xs font-medium text-slate-100 flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-sky-400 animate-spin" />
            <span>
              載入 3D 電動車模型{loadProgress > 0 ? ` ${loadProgress}%` : '…'}
            </span>
          </div>
        </div>
      )}

      {modelError && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300">
          <CarFront size={compact ? 36 : 48} className="text-sky-400/80" />
          <p className="text-xs font-medium">{modelError}</p>
        </div>
      )}
    </div>
  );
};
