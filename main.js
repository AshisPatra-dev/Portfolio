/* ===================================================
   3D Portfolio — main.js
   Three.js Scenes + GSAP Animations + Interactions
   =================================================== */

'use strict';

// ============================================================
// 1. UTILITIES
// ============================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ---- Mobile / performance helpers (prevents phone crashes) ----
const IS_MOBILE = window.matchMedia('(max-width: 768px)').matches ||
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.maxTouchPoints > 1 && window.matchMedia('(pointer: coarse)').matches);
const PREFERS_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function createRenderer(canvas) {
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !IS_MOBILE,
      alpha: true,
      powerPreference: IS_MOBILE ? 'low-power' : 'high-performance',
    });
    renderer.setPixelRatio(IS_MOBILE ? 1 : Math.min(window.devicePixelRatio, 1.5));
    canvas.addEventListener('webglcontextlost', (e) => e.preventDefault(), false);
    return renderer;
  } catch (err) {
    console.warn('WebGL unavailable, skipping 3D scene', err);
    return null;
  }
}

// Only render while the canvas is on screen and the tab is visible
function startLoop(el, frame) {
  let visible = true, running = false;
  const tick = () => {
    if (!visible || document.hidden) { running = false; return; }
    requestAnimationFrame(tick);
    frame();
  };
  const kick = () => { if (!running && visible && !document.hidden) { running = true; tick(); } };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      kick();
    }, { rootMargin: '100px' }).observe(el);
  }
  document.addEventListener('visibilitychange', kick);
  kick();
}

// Ignore height-only resizes (mobile URL bar show/hide while scrolling)
function onWidthResize(cb) {
  let lastW = window.innerWidth, timer;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (window.innerWidth !== lastW) { lastW = window.innerWidth; cb(); }
    }, 200);
  });
}

// ============================================================
// 2. LOADING SCREEN
// ============================================================
function initLoader() {
  const loader = $('#loader');
  const minTime = 2000;
  const startTime = Date.now();

  const hideLoader = () => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, minTime - elapsed);
    setTimeout(() => {
      if (loader) loader.classList.add('hidden');
    }, remaining);
  };

  if (document.readyState === 'complete') {
    hideLoader();
  } else {
    window.addEventListener('load', hideLoader);
  }
}

// ============================================================
// 3. CUSTOM CURSOR
// ============================================================
function initCursor() {
  const cursor = $('#cursor');
  const follower = $('#cursor-follower');
  let mouseX = 0, mouseY = 0;
  let followerX = 0, followerY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
  });

  function animateCursor() {
    followerX += (mouseX - followerX) * 0.1;
    followerY += (mouseY - followerY) * 0.1;
    follower.style.left = followerX + 'px';
    follower.style.top = followerY + 'px';
    requestAnimationFrame(animateCursor);
  }
  animateCursor();
}

// ============================================================
// 4. NAVIGATION
// ============================================================
function initNav() {
  const navbar = $('#navbar');
  const hamburger = $('#hamburger');
  const mobileMenu = $('#mobile-menu');
  const mobileLinks = $$('.mobile-link');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('open');
  });

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('open');
    });
  });
}

// ============================================================
// 5. HERO CANVAS — Three.js Particle Field + Crystal
// ============================================================
function initHeroScene() {
  const canvas = $('#hero-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const renderer = createRenderer(canvas);
  if (!renderer) return;
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 5);

  // Ambient Light
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));

  // Point Lights
  const lights = [
    { color: 0x6C63FF, pos: [3, 3, 2], intensity: 2 },
    { color: 0x00D4FF, pos: [-3, -2, 1], intensity: 1.5 },
    { color: 0xFF6B9D, pos: [0, -3, 3], intensity: 1 },
  ];
  lights.forEach(({ color, pos, intensity }) => {
    const light = new THREE.PointLight(color, intensity, 15);
    light.position.set(...pos);
    scene.add(light);
  });

  // ---- Main Crystal (Icosahedron) ----
  const crystalGroup = new THREE.Group();
  scene.add(crystalGroup);

  // Solid core
  const coreGeo = new THREE.IcosahedronGeometry(1.2, 0);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x0a0f2e,
    emissive: 0x2a1a6e,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.8,
    transparent: true,
    opacity: 0.85,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  crystalGroup.add(coreMesh);

  // Wireframe overlay
  const wireGeo = new THREE.IcosahedronGeometry(1.25, 0);
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x6C63FF,
    wireframe: true,
    transparent: true,
    opacity: 0.4,
  });
  const wireMesh = new THREE.Mesh(wireGeo, wireMat);
  crystalGroup.add(wireMesh);

  // Outer glow shell
  const glowGeo = new THREE.IcosahedronGeometry(1.55, 0);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x00D4FF,
    wireframe: true,
    transparent: true,
    opacity: 0.12,
  });
  const glowMesh = new THREE.Mesh(glowGeo, glowMat);
  crystalGroup.add(glowMesh);

  // Inner glow sphere
  const innerGeo = new THREE.SphereGeometry(0.8, 32, 32);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0x6C63FF,
    transparent: true,
    opacity: 0.15,
  });
  crystalGroup.add(new THREE.Mesh(innerGeo, innerMat));

  // Position crystal to the right
  crystalGroup.position.set(2.5, 0, 0);

  // ---- Orbiting Rings ----
  const rings = [];
  [1.8, 2.2, 2.7].forEach((r, i) => {
    const geo = new THREE.TorusGeometry(r, 0.008, 16, 100);
    const mat = new THREE.MeshBasicMaterial({
      color: i === 0 ? 0x6C63FF : i === 1 ? 0x00D4FF : 0xFF6B9D,
      transparent: true,
      opacity: 0.5,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = Math.PI / 2 + (i * 0.5);
    ring.rotation.y = i * 0.8;
    crystalGroup.add(ring);
    rings.push(ring);
  });

  // ---- Particle Field (Starfield) ----
  const particleCount = IS_MOBILE ? 600 : 2000;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  const colorOptions = [
    new THREE.Color(0x6C63FF),
    new THREE.Color(0x00D4FF),
    new THREE.Color(0xFF6B9D),
    new THREE.Color(0xffffff),
  ];

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 30;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;

    const c = colorOptions[Math.floor(Math.random() * colorOptions.length)];
    colors[i * 3]     = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
    sizes[i] = Math.random() * 2 + 0.5;
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  pGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const pMat = new THREE.PointsMaterial({
    size: 0.04,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    sizeAttenuation: true,
  });

  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  // ---- Floating geometric accents ----
  const accents = [];
  const accentGeometries = [
    new THREE.OctahedronGeometry(0.15),
    new THREE.TetrahedronGeometry(0.12),
    new THREE.BoxGeometry(0.15, 0.15, 0.15),
  ];
  const accentColors = [0x6C63FF, 0x00D4FF, 0xFF6B9D];

  for (let i = 0; i < (IS_MOBILE ? 5 : 12); i++) {
    const geo = accentGeometries[i % 3];
    const mat = new THREE.MeshBasicMaterial({
      color: accentColors[i % 3],
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 4 - 1,
    );
    mesh.userData = {
      speed: Math.random() * 0.008 + 0.003,
      rotX: Math.random() * 0.02,
      rotY: Math.random() * 0.02,
      floatAmp: Math.random() * 0.2 + 0.1,
      floatFreq: Math.random() * 0.5 + 0.5,
      baseY: mesh.position.y,
    };
    scene.add(mesh);
    accents.push(mesh);
  }

  // ---- Mouse Parallax ----
  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;

  if (!IS_MOBILE) document.addEventListener('mousemove', (e) => {
    targetX = (e.clientX / window.innerWidth  - 0.5) * 0.6;
    targetY = (e.clientY / window.innerHeight - 0.5) * -0.4;
  });

  // ---- Resize ----
  onWidthResize(() => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---- Animation Loop ----
  const clock = new THREE.Clock();
  function frame() {
    const t = clock.getElapsedTime();

    // Smooth mouse follow
    currentX += (targetX - currentX) * 0.05;
    currentY += (targetY - currentY) * 0.05;
    crystalGroup.rotation.y = t * 0.3 + currentX;
    crystalGroup.rotation.x = t * 0.15 + currentY;

    // Ring rotations
    rings[0].rotation.z += 0.008;
    rings[1].rotation.x += 0.005;
    rings[2].rotation.y += 0.006;

    // Particles drift
    particles.rotation.y += 0.0003;
    particles.rotation.x += 0.0001;

    // Accent objects
    accents.forEach((a) => {
      a.rotation.x += a.userData.rotX;
      a.rotation.y += a.userData.rotY;
      a.position.y = a.userData.baseY + Math.sin(t * a.userData.floatFreq) * a.userData.floatAmp;
    });

    // Camera subtle float
    camera.position.y = Math.sin(t * 0.2) * 0.1;

    renderer.render(scene, camera);
  }
  startLoop(canvas, frame);
}

// ============================================================
// 6. ABOUT CANVAS — Torus Knot / Orbiting Rings
// ============================================================
function initAboutScene() {
  if (IS_MOBILE || PREFERS_REDUCED) return;
  const canvas = $('#about-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const w = canvas.parentElement.offsetWidth;
  const h = canvas.parentElement.offsetHeight;

  const renderer = createRenderer(canvas);
  if (!renderer) return;
  renderer.setSize(w, h);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
  camera.position.set(0, 0, 6);

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const pl = new THREE.PointLight(0x6C63FF, 3, 20);
  pl.position.set(2, 2, 2);
  scene.add(pl);

  // Torus Knot
  const geo = new THREE.TorusKnotGeometry(1.5, 0.4, 128, 16);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0a0a2e,
    emissive: 0x3322aa,
    emissiveIntensity: 0.3,
    roughness: 0.3,
    metalness: 0.9,
    wireframe: false,
  });
  const knot = new THREE.Mesh(geo, mat);
  scene.add(knot);

  // Wireframe overlay
  const wGeo = new THREE.TorusKnotGeometry(1.53, 0.41, 128, 16);
  const wMat = new THREE.MeshBasicMaterial({ color: 0x6C63FF, wireframe: true, transparent: true, opacity: 0.2 });
  scene.add(new THREE.Mesh(wGeo, wMat));

  const clock = new THREE.Clock();

  onWidthResize(() => {
    const nw = canvas.parentElement.offsetWidth;
    const nh = canvas.parentElement.offsetHeight;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  });

  function frame() {
    const t = clock.getElapsedTime();
    knot.rotation.x = t * 0.2;
    knot.rotation.y = t * 0.3;
    renderer.render(scene, camera);
  }
  startLoop(canvas, frame);
}

// ============================================================
// 7. SKILLS CANVAS — Grid / Network background
// ============================================================
function initSkillsScene() {
  if (IS_MOBILE || PREFERS_REDUCED) return;
  const canvas = $('#skills-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const w = window.innerWidth;
  const h = canvas.parentElement.offsetHeight;

  const renderer = createRenderer(canvas);
  if (!renderer) return;
  renderer.setSize(w, h);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
  camera.position.set(0, 0, 5);

  // Grid of points
  const pCount = 500;
  const pos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 20;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0x6C63FF, size: 0.04, transparent: true, opacity: 0.6 });
  scene.add(new THREE.Points(geo, mat));

  const clock = new THREE.Clock();
  function frame() {
    const t = clock.getElapsedTime();
    scene.rotation.y = t * 0.05;
    renderer.render(scene, camera);
  }
  startLoop(canvas, frame);
}

// ============================================================
// 8. CONTACT CANVAS — Animated grid plane
// ============================================================
function initContactScene() {
  if (IS_MOBILE || PREFERS_REDUCED) return;
  const canvas = $('#contact-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const renderer = createRenderer(canvas);
  if (!renderer) return;
  renderer.setSize(window.innerWidth, canvas.parentElement.offsetHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / canvas.parentElement.offsetHeight, 0.1, 100);
  camera.position.set(0, 4, 8);
  camera.lookAt(0, 0, 0);

  // Grid helper styled
  const grid = new THREE.GridHelper(40, 40, 0x6C63FF, 0x1a1a4e);
  grid.material.opacity = 0.3;
  grid.material.transparent = true;
  scene.add(grid);

  // Floating particles
  const pc = 200;
  const pp = new Float32Array(pc * 3);
  for (let i = 0; i < pc; i++) {
    pp[i * 3]     = (Math.random() - 0.5) * 30;
    pp[i * 3 + 1] = Math.random() * 5;
    pp[i * 3 + 2] = (Math.random() - 0.5) * 30;
  }
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  scene.add(new THREE.Points(pgeo, new THREE.PointsMaterial({ color: 0x00D4FF, size: 0.06, transparent: true, opacity: 0.5 })));

  const clock = new THREE.Clock();
  function frame() {
    const t = clock.getElapsedTime();
    camera.position.x = Math.sin(t * 0.1) * 3;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  startLoop(canvas, frame);
}

// ============================================================
// 9. TYPED TEXT EFFECT
// ============================================================
function initTyped() {
  const el = $('#typed-text');
  if (!el) return;

  const words = ['build 3D Experiences.', 'craft stunning UIs.', 'architect APIs.', 'love clean code.'];
  let wIdx = 0, cIdx = 0, deleting = false;

  function type() {
    const current = words[wIdx];
    if (!deleting) {
      el.textContent = current.slice(0, ++cIdx);
      if (cIdx === current.length) {
        deleting = true;
        setTimeout(type, 2000);
        return;
      }
    } else {
      el.textContent = current.slice(0, --cIdx);
      if (cIdx === 0) {
        deleting = false;
        wIdx = (wIdx + 1) % words.length;
      }
    }
    setTimeout(type, deleting ? 40 : 80);
  }
  type();
}

// ============================================================
// 10. SCROLL REVEAL ANIMATIONS
// ============================================================
function initRevealAnimations() {
  const elements = $$('[data-reveal]');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('revealed');
          }, 150 * (Array.from(elements).indexOf(entry.target) % 4));
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    elements.forEach(el => observer.observe(el));
  } else {
    elements.forEach(el => el.classList.add('revealed'));
  }

  // Skill bars
  const skillFills = $$('.skill-bar-fill');
  const skillObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const fill = entry.target;
        fill.style.width = fill.dataset.width + '%';
        skillObserver.unobserve(fill);
      }
    });
  }, { threshold: 0.3 });

  skillFills.forEach(fill => skillObserver.observe(fill));
}

// ============================================================
// 11. STAT COUNTER
// ============================================================
function animateStats() {
  const stats = $$('.stat-number');
  stats.forEach(stat => {
    const target = parseInt(stat.dataset.target);
    let current = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      stat.textContent = Math.floor(current);
      if (current >= target) clearInterval(timer);
    }, 25);
  });
}

// ============================================================
// 12. PROJECT CARD TILT
// ============================================================
function initCardTilt() {
  const cards = $$('.project-card');

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rotX = ((y - cy) / cy) * -8;
      const rotY = ((x - cx) / cx) * 8;

      card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-8px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
      setTimeout(() => { card.style.transition = ''; }, 500);
    });
  });
}



// ============================================================
// 13. CONTACT FORM
// ============================================================
function initContactForm() {
  const form = $('#contact-form');
  const success = $('#form-success');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('#btn-send');
    btn.querySelector('.btn-text').textContent = 'Sending...';
    btn.disabled = true;

    setTimeout(() => {
      success.classList.add('visible');
      btn.querySelector('.btn-text').textContent = 'Send Message';
      btn.disabled = false;
      form.reset();
      setTimeout(() => success.classList.remove('visible'), 5000);
    }, 1800);
  });
}

// ============================================================
// 14. SMOOTH SCROLL FOR NAV LINKS
// ============================================================
function initSmoothScroll() {
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ============================================================
// 15. GSAP SCROLL ANIMATIONS (if GSAP loaded)
// ============================================================
function initGSAP() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  // Hero parallax
  gsap.to('.hero-canvas', {
    yPercent: 30,
    ease: 'none',
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    }
  });

  // Section title underline
  gsap.utils.toArray('.section-title').forEach(el => {
    gsap.from(el, {
      opacity: 0,
      y: 40,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none reverse',
      }
    });
  });

  // NOTE: .project-card and .skill-category reveal/entrance animation is
  // handled by the [data-reveal] + IntersectionObserver system in
  // initRevealAnimations() below. They used to ALSO be animated here with
  // gsap.from({opacity:0, ...}), which sets an inline opacity style that
  // overrides the CSS class-based reveal. Having both systems fight over
  // the same elements is what caused the Skills/Projects content to
  // sometimes stay invisible. Do not re-add opacity tweens for these
  // selectors here — extend initRevealAnimations()/CSS instead.
}

// ============================================================
// 16. ACTIVE NAV HIGHLIGHTING
// ============================================================

// ============================================================
// SCROLL PROGRESS BAR
// ============================================================
function initScrollProgress() {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);
  let ticking = false;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(window.scrollY / max, 1) : 0) + ')';
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
}

function initActiveNav() {
  const sections = $$('section[id]');
  const navLinks = $$('.nav-link');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.toggle(
            'active',
            link.getAttribute('href') === '#' + entry.target.id
          );
        });
      }
    });
  }, { threshold: 0.5 });

  sections.forEach(s => observer.observe(s));
}

// ============================================================
// INIT ALL
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initCursor();
  initNav();
  initTyped();
  initSmoothScroll();
  initContactForm();
  initCardTilt();
  initGSAP();
  initActiveNav();
  initScrollProgress();
  initRevealAnimations();
  animateStats();

  // Three.js scenes (init after a small delay so DOM is painted)
  setTimeout(() => {
    initHeroScene();
    initAboutScene();
    initSkillsScene();
    initContactScene();
  }, 100);
});
