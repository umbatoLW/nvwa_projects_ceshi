"use client";

import { useState, useEffect, useRef } from "react";

interface Model3DViewerProps {
  modelUrl?: string;
  previewImage?: string;
  className?: string;
}

export function Model3DViewer({ modelUrl, previewImage, className = "" }: Model3DViewerProps) {
  const [isClient, setIsClient] = useState(false);
  const [ThreeComponents, setThreeComponents] = useState<{
    THREE: typeof import("three");
    GLTFLoader: typeof import("three/examples/jsm/loaders/GLTFLoader.js").GLTFLoader;
    OrbitControls: typeof import("three/examples/jsm/controls/OrbitControls.js").OrbitControls;
  } | null>(null);

  useEffect(() => {
    setIsClient(true);
    // 动态导入 three.js
    Promise.all([
      import("three"),
      import("three/examples/jsm/loaders/GLTFLoader.js"),
      import("three/examples/jsm/controls/OrbitControls.js"),
    ]).then(([THREE, { GLTFLoader }, { OrbitControls }]) => {
      setThreeComponents({ THREE, GLTFLoader, OrbitControls });
    }).catch((err) => {
      console.error("[Model3DViewer] Failed to load three.js:", err);
    });
  }, []);

  if (!isClient) {
    return (
      <div className={className}>
        <div className="w-full h-full bg-[#0F0F0F] rounded-xl flex items-center justify-center">
          <p className="text-sm text-[#9CA3AF]">3D查看器加载中...</p>
        </div>
      </div>
    );
  }

  if (!ThreeComponents || !modelUrl) {
    return (
      <div className={className}>
        <div className="w-full h-full bg-[#0F0F0F] rounded-xl flex items-center justify-center">
          {previewImage ? (
            <img src={previewImage} alt="3D preview" className="w-full h-full object-contain rounded-xl" />
          ) : (
            <p className="text-sm text-[#9CA3AF]">暂无3D模型</p>
          )}
        </div>
      </div>
    );
  }

  // 渲染完整3D查看器
  return <Model3DViewerInner {...ThreeComponents} modelUrl={modelUrl} previewImage={previewImage} className={className} />;
}

// 内部组件接收已加载的模块
function Model3DViewerInner({
  THREE,
  GLTFLoader,
  OrbitControls,
  modelUrl,
  previewImage,
  className,
}: {
  THREE: typeof import("three");
  GLTFLoader: typeof import("three/examples/jsm/loaders/GLTFLoader.js").GLTFLoader;
  OrbitControls: typeof import("three/examples/jsm/controls/OrbitControls.js").OrbitControls;
} & Model3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: import("three").Scene;
    camera: import("three").PerspectiveCamera;
    renderer: import("three").WebGLRenderer;
    controls: InstanceType<typeof OrbitControls>;
    loader: InstanceType<typeof GLTFLoader>;
    animationId: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0f0f);

    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 1, 3);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.5;
    controls.maxDistance = 10;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 0, -5);
    scene.add(fillLight);

    const loader = new GLTFLoader();

    const onProgress = (event: { loaded: number; total: number }) => {
      const percent = (event.loaded / event.total) * 100;
      setProgress(percent);
    };

    loader.load(
      modelUrl!,
      (gltf) => {
        const loadedModel = gltf.scene;
        
        // 计算边界框并居中
        const box = new THREE.Box3().setFromObject(loadedModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        loadedModel.scale.setScalar(scale);
        
        loadedModel.position.sub(center.multiplyScalar(scale));
        
        scene.add(loadedModel);
        setLoading(false);
      },
      onProgress,
      (err) => {
        console.error("3D模型加载失败:", err);
        setError("3D模型加载失败");
        setLoading(false);
      }
    );

    let animationId: number = 0;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current = { scene, camera, renderer, controls, loader, animationId };

    const handleResize = () => {
      if (!container || !sceneRef.current) return;
      const { camera, renderer } = sceneRef.current;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [THREE, GLTFLoader, OrbitControls, modelUrl]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-[#0F0F0F] rounded-xl flex flex-col items-center justify-center z-10">
          <div className="w-32 h-32 border-4 border-[#333333] border-t-[#0ABAB5] rounded-full animate-spin" />
          <p className="mt-3 text-sm">{progress > 0 ? `${progress.toFixed(0)}%` : "加载中..."}</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 bg-[#0F0F0F] rounded-xl flex flex-col items-center justify-center">
          {previewImage && (
            <img src={previewImage} alt="3D preview" className="w-full h-full object-contain rounded-xl" />
          )}
          <p className="mt-3 text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
