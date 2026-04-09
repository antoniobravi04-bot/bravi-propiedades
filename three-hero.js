// Subtle Three.js hero background — floating geometric shapes evoking architecture
// Respects "minimalist and sober" brief: very low opacity, slow movement, navy palette
// Disabled on mobile (< 768px) and when prefers-reduced-motion is set

(function () {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas || !window.THREE) return;

  // Performance: skip on mobile or reduced-motion
  const isMobile = window.innerWidth < 768;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isMobile || reducedMotion) return;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 20;

  // ── Palette: navy tones ──────────────────────────────────────────────────
  const colors = [0x1e4976, 0x4a90c4, 0x0d2137, 0x2a6496];

  // ── Building-like box meshes ─────────────────────────────────────────────
  const objects = [];
  const count   = 28;

  for (let i = 0; i < count; i++) {
    const h    = Math.random() * 4 + 1;
    const w    = Math.random() * 1.2 + 0.4;
    const geo  = new THREE.BoxGeometry(w, h, w * 0.7);
    const mat  = new THREE.MeshBasicMaterial({
      color:       colors[Math.floor(Math.random() * colors.length)],
      wireframe:   Math.random() > 0.5,
      transparent: true,
      opacity:     Math.random() * 0.12 + 0.04,
    });
    const mesh = new THREE.Mesh(geo, mat);

    mesh.position.set(
      (Math.random() - 0.5) * 48,
      (Math.random() - 0.5) * 28,
      (Math.random() - 0.5) * 12
    );
    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    // Store drift speeds
    mesh.userData = {
      vy:      (Math.random() - 0.5) * 0.004,
      rx:      (Math.random() - 0.5) * 0.003,
      ry:      (Math.random() - 0.5) * 0.002,
    };

    scene.add(mesh);
    objects.push(mesh);
  }

  // ── Subtle horizontal lines (horizon / skyline feel) ────────────────────
  for (let i = 0; i < 4; i++) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-30, 0, 0),
      new THREE.Vector3( 30, 0, 0),
    ]);
    const mat  = new THREE.LineBasicMaterial({ color: 0x4a90c4, transparent: true, opacity: 0.06 });
    const line = new THREE.Line(geo, mat);
    line.position.y = (Math.random() - 0.5) * 20;
    line.position.z = -5 - Math.random() * 5;
    scene.add(line);
  }

  // ── Resize handler ───────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    if (window.innerWidth < 768) {
      renderer.domElement.style.display = 'none';
      return;
    }
    renderer.domElement.style.display = '';
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, { passive: true });

  // ── Animate ──────────────────────────────────────────────────────────────
  let frameId;
  function animate() {
    frameId = requestAnimationFrame(animate);
    objects.forEach(m => {
      m.position.y += m.userData.vy;
      m.rotation.x += m.userData.rx;
      m.rotation.y += m.userData.ry;

      // Wrap vertically
      if (m.position.y >  16) m.position.y = -16;
      if (m.position.y < -16) m.position.y =  16;
    });
    renderer.render(scene, camera);
  }
  animate();

  // Stop animation when hero is off screen (perf)
  const hero = document.querySelector('.hero');
  const stopObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      if (!frameId) animate();
    } else {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  });
  stopObserver.observe(hero);
})();
