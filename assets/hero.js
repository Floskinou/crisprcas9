/* CRISPR·CAS9 — animation Three.js de la page d'accueil.
   Double hélice instanciée (peu de draw calls) + poussière moléculaire.
   Le rendu s'arrête hors écran et respecte prefers-reduced-motion. */
(function () {
  'use strict';
  var canvas = document.getElementById('molecule');
  if (!canvas) return;
  var fallback = document.getElementById('nowebgl');
  if (!window.THREE) { if (fallback) fallback.style.display = 'flex'; return; }

  var host = canvas.parentElement;
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 12);

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  } catch (e) {
    if (fallback) fallback.style.display = 'flex';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x173c31, 1);

  var helix = new THREE.Group();
  scene.add(helix);

  var matA = new THREE.MeshStandardMaterial({ color: 0xc9e96b, roughness: 0.3, metalness: 0.1 });
  var matB = new THREE.MeshStandardMaterial({ color: 0xe9efdd, roughness: 0.35, metalness: 0.05 });
  var rungMat = new THREE.LineBasicMaterial({ color: 0x9fb98c, transparent: true, opacity: 0.58 });

  var COUNT = 126, RUNGS = 0, i, t, y, a, r, p1, p2;
  var beadGeo = new THREE.SphereGeometry(0.075, 10, 8);
  var rungGeo = new THREE.SphereGeometry(0.035, 7, 6);
  var beadsA = new THREE.InstancedMesh(beadGeo, matA, COUNT);
  var beadsB = new THREE.InstancedMesh(beadGeo, matB, COUNT);
  for (i = 0; i < COUNT; i++) if (i % 3 === 0) RUNGS++;
  var rungDotsA = new THREE.InstancedMesh(rungGeo, matA, RUNGS);
  var rungDotsB = new THREE.InstancedMesh(rungGeo, matB, RUNGS);
  var dummy = new THREE.Object3D();
  var rungPositions = [];
  var k = 0;

  for (i = 0; i < COUNT; i++) {
    t = i / (COUNT - 1);
    y = (t - 0.5) * 8.3;
    a = t * Math.PI * 8;
    r = 1.23;
    p1 = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    p2 = new THREE.Vector3(Math.cos(a + Math.PI) * r, y, Math.sin(a + Math.PI) * r);
    dummy.position.copy(p1); dummy.updateMatrix(); beadsA.setMatrixAt(i, dummy.matrix);
    dummy.position.copy(p2); dummy.updateMatrix(); beadsB.setMatrixAt(i, dummy.matrix);
    if (i % 3 === 0) {
      rungPositions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
      dummy.position.copy(p1); dummy.updateMatrix(); rungDotsA.setMatrixAt(k, dummy.matrix);
      dummy.position.copy(p2); dummy.updateMatrix(); rungDotsB.setMatrixAt(k, dummy.matrix);
      k++;
    }
  }
  beadsA.instanceMatrix.needsUpdate = true;
  beadsB.instanceMatrix.needsUpdate = true;
  rungDotsA.instanceMatrix.needsUpdate = true;
  rungDotsB.instanceMatrix.needsUpdate = true;

  var rungGeoBuffer = new THREE.BufferGeometry();
  rungGeoBuffer.setAttribute('position', new THREE.Float32BufferAttribute(rungPositions, 3));
  helix.add(beadsA, beadsB, new THREE.LineSegments(rungGeoBuffer, rungMat), rungDotsA, rungDotsB);

  var dustPositions = [];
  for (i = 0; i < 360; i++) {
    dustPositions.push((Math.random() - 0.5) * 11, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 5);
  }
  var dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dustPositions, 3));
  scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xb7ca9f, size: 0.025, transparent: true, opacity: 0.45 })));

  var key = new THREE.PointLight(0xc9e96b, 17, 18);
  key.position.set(3, 3, 5);
  scene.add(key);
  scene.add(new THREE.AmbientLight(0xe8f4e0, 1.7));

  function resize() {
    var w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(host); else window.addEventListener('resize', resize);
  resize();

  var targetX = 0, targetY = 0;
  host.addEventListener('pointermove', function (e) {
    var rect = host.getBoundingClientRect();
    targetY = ((e.clientX - rect.left) / rect.width - 0.5) * 0.35;
    targetX = ((e.clientY - rect.top) / rect.height - 0.5) * 0.2;
  });
  host.addEventListener('pointerleave', function () { targetX = 0; targetY = 0; });

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var frame = 0, raf = 0, onScreen = true;

  function draw() {
    renderer.render(scene, camera);
  }

  function animate() {
    if (!onScreen || document.hidden) { raf = 0; return; }
    if (reduce) { draw(); return; }
    raf = requestAnimationFrame(animate);
    frame += 0.006;
    helix.rotation.y += (targetY + Math.sin(frame) * 0.08 - helix.rotation.y) * 0.025;
    helix.rotation.x += (targetX - helix.rotation.x) * 0.025;
    helix.position.y = Math.sin(frame * 0.7) * 0.07;
    draw();
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      if (onScreen && !raf) animate();
      else if (!onScreen && raf) { cancelAnimationFrame(raf); raf = 0; }
    }, { threshold: 0 }).observe(host);
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && onScreen && !raf) animate();
    else if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; }
  });
  animate();
})();
