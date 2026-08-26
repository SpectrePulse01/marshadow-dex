"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type MasterBall3DProps = {
  onActivate: () => void;
};

export default function MasterBall3D({ onActivate }: MasterBall3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.05, 5.7);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      // Some mobile browsers disable WebGL under memory pressure. The CSS ball
      // keeps the Pokédex accessible instead of letting Three.js crash React.
      setWebglUnavailable(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const ball = new THREE.Group();
    scene.add(ball);

    const purple = new THREE.MeshPhysicalMaterial({
      color: 0x5d16c8,
      metalness: 0.35,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      emissive: 0x16002f,
      emissiveIntensity: 0.5,
    });
    const white = new THREE.MeshPhysicalMaterial({
      color: 0xf2ecff,
      metalness: 0.1,
      roughness: 0.22,
      clearcoat: 0.85,
    });
    const black = new THREE.MeshPhysicalMaterial({
      color: 0x09050f,
      metalness: 0.45,
      roughness: 0.18,
      clearcoat: 0.75,
    });
    const pink = new THREE.MeshStandardMaterial({
      color: 0xff42c8,
      emissive: 0xb00074,
      emissiveIntensity: 1.15,
      metalness: 0.2,
      roughness: 0.2,
    });

    const top = new THREE.Mesh(
      new THREE.SphereGeometry(1.28, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2),
      purple,
    );
    const bottom = new THREE.Mesh(
      new THREE.SphereGeometry(1.28, 64, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      white,
    );
    ball.add(top, bottom);

    const band = new THREE.Mesh(new THREE.TorusGeometry(1.235, 0.115, 20, 96), black);
    ball.add(band);

    const outerButton = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.17, 64), black);
    outerButton.rotation.x = Math.PI / 2;
    outerButton.position.set(0, 0, 1.2);
    const innerButton = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.19, 64), white);
    innerButton.rotation.x = Math.PI / 2;
    innerButton.position.set(0, 0, 1.31);
    const buttonCore = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.205, 48), pink);
    buttonCore.rotation.x = Math.PI / 2;
    buttonCore.position.set(0, 0, 1.42);
    ball.add(outerButton, innerButton, buttonCore);

    [-0.5, 0.5].forEach((x) => {
      const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 20), pink);
      jewel.scale.set(1.1, 0.72, 0.28);
      jewel.position.set(x, 0.63, 1.02);
      jewel.rotation.z = x > 0 ? -0.22 : 0.22;
      ball.add(jewel);
    });

    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 256;
    labelCanvas.height = 160;
    const context = labelCanvas.getContext("2d");
    if (context) {
      context.clearRect(0, 0, 256, 160);
      context.fillStyle = "#ff5bd5";
      context.shadowColor = "#ff38c7";
      context.shadowBlur = 22;
      context.font = "900 118px Arial Black, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("M", 128, 84);
    }
    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    labelTexture.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.45),
      new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true, depthWrite: false }),
    );
    label.position.set(0, 0.57, 1.205);
    label.rotation.x = -0.13;
    ball.add(label);

    const auraRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.72, 0.025, 10, 120),
      new THREE.MeshBasicMaterial({ color: 0xba6cff, transparent: true, opacity: 0.7 }),
    );
    auraRing.rotation.x = 1.12;
    auraRing.rotation.z = 0.4;
    scene.add(auraRing);

    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(150 * 3);
    for (let index = 0; index < 150; index += 1) {
      const radius = 2 + Math.random() * 1.8;
      const angle = Math.random() * Math.PI * 2;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 3.6;
      positions[index * 3 + 2] = Math.sin(angle) * radius - 1;
    }
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({ color: 0xb45cff, size: 0.025, transparent: true, opacity: 0.8 }),
    );
    scene.add(particles);

    scene.add(new THREE.HemisphereLight(0xdcc8ff, 0x100018, 2.4));
    const keyLight = new THREE.PointLight(0xff73dd, 28, 10);
    keyLight.position.set(-2.4, 2.6, 3.4);
    const rimLight = new THREE.PointLight(0x713cff, 34, 9);
    rimLight.position.set(2.8, -1.4, 2.1);
    scene.add(keyLight, rimLight);

    let targetX = -0.08;
    let targetZ = 0;
    let spinVelocity = 0.015;
    let lastPointerX = 0;
    let lastPointerAt = 0;
    let frame = 0;
    let destroyed = false;
    let inViewport = true;
    const onPointerMove = (event: PointerEvent) => {
      const bounds = mount.getBoundingClientRect();
      targetX = -((event.clientY - bounds.top) / bounds.height - 0.5) * 0.55;
      targetZ = -((event.clientX - bounds.left) / bounds.width - 0.5) * 0.3;

      const now = performance.now();
      if (lastPointerAt) {
        const delta = event.clientX - lastPointerX;
        const time = Math.max(8, now - lastPointerAt);
        const gestureVelocity = Math.min(0.13, Math.abs(delta / time) * 0.075);
        spinVelocity = Math.max(spinVelocity, 0.02 + gestureVelocity);
      }
      lastPointerX = event.clientX;
      lastPointerAt = now;
    };
    const onPointerDown = (event: PointerEvent) => {
      lastPointerX = event.clientX;
      lastPointerAt = performance.now();
      spinVelocity = Math.max(spinVelocity, 0.075);
    };
    const onPointerLeave = () => {
      targetX = -0.08;
      targetZ = 0;
      lastPointerAt = 0;
    };
    mount.addEventListener("pointermove", onPointerMove);
    mount.addEventListener("pointerdown", onPointerDown);
    mount.addEventListener("pointerleave", onPointerLeave);

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const clock = new THREE.Clock();
    const animate = () => {
      if (destroyed || !inViewport || document.hidden) {
        frame = 0;
        return;
      }
      const elapsed = clock.getElapsedTime();
      ball.rotation.x += (targetX + Math.sin(elapsed * 0.72) * 0.045 - ball.rotation.x) * 0.055;
      ball.rotation.z += (targetZ - ball.rotation.z) * 0.06;
      ball.rotation.y += spinVelocity;
      spinVelocity += (0.015 - spinVelocity) * 0.024;
      ball.position.y = Math.sin(elapsed * 1.25) * 0.13;
      auraRing.rotation.z += 0.011 + Math.min(spinVelocity, 0.08) * 0.12;
      auraRing.rotation.y = Math.sin(elapsed * 0.55) * 0.4;
      particles.rotation.y -= 0.0018;
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(animate);
    };
    const startAnimation = () => {
      if (!destroyed && inViewport && !document.hidden && frame === 0) frame = window.requestAnimationFrame(animate);
    };
    const stopAnimation = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      inViewport = entry?.isIntersecting ?? true;
      if (inViewport) startAnimation();
      else stopAnimation();
    }, { threshold: 0.01 });
    const onVisibilityChange = () => {
      if (document.hidden) stopAnimation();
      else startAnimation();
    };
    visibilityObserver.observe(mount);
    document.addEventListener("visibilitychange", onVisibilityChange);
    startAnimation();

    return () => {
      destroyed = true;
      stopAnimation();
      observer.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      mount.removeEventListener("pointermove", onPointerMove);
      mount.removeEventListener("pointerdown", onPointerDown);
      mount.removeEventListener("pointerleave", onPointerLeave);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      labelTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className={`masterball-webgl ${webglUnavailable ? "is-fallback" : ""}`} ref={mountRef}>
      {webglUnavailable && <span className="masterball-webgl__fallback" aria-hidden="true"><i>M</i></span>}
      <button type="button" onClick={onActivate} aria-label="Abrir a Pokédex pela Master Ball 3D">
        <span>ABRIR POKÉDEX</span>
      </button>
    </div>
  );
}
