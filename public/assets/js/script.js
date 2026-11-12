/* ==========================================================================
   Meridian — behaviour

   Third-party libraries used (all loaded from index.html):
     Three.js            the globe in the hero
     GSAP + ScrollTrigger + SplitText   entrance, scroll and text animation
     Lenis               smooth scrolling
     Chart.js            the two climate charts
     Leaflet             the route map
     Fullscreen Lightbox full-screen photographs (wired up in the HTML)
     Cleave.js           month and number formatting in the form

   Contents
     1.  Helpers
     2.  Shared state: the chosen destination
     3.  Smooth scrolling (Lenis)
     4.  Header and navigation
     5.  Cursor companion
     6.  Globe (Three.js)
     7.  Focus card
     8.  Destinations (the six)
     9.  Journey: tabs, route, map (Leaflet), climate (Chart.js)
     10. Field notes reel
     11. Inquiry form (Cleave.js)
     12. Footer clocks
     13. Motion (GSAP)
     14. Start
   ========================================================================== */

(function () {
  'use strict';

  /* 1. Helpers
     ======================================================================== */

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  const animate = hasGsap && !reduceMotion;

  const RAD = Math.PI / 180;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /* "03:12" in the given time zone */
  const localTime = (timeZone) => new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timeZone
  }).format(new Date());

  const indexOfDestination = (id) => DESTINATIONS.findIndex((destination) => destination.id === id);

  if (hasGsap) gsap.registerPlugin(ScrollTrigger, SplitText);


  /* 2. Shared state: the chosen destination
     The globe, focus card, gallery, journey panel and form all follow it.
     ======================================================================== */

  const state = { index: 0 };
  const listeners = [];

  const onSelect = (listener) => listeners.push(listener);

  /* source: 'init', 'tour', 'globe', 'card', 'place', 'tab' or 'form' */
  function select(index, source) {
    const count = DESTINATIONS.length;
    const next = ((index % count) + count) % count;
    const changed = next !== state.index;
    state.index = next;
    listeners.forEach((listener) => listener(DESTINATIONS[next], next, source, changed));
  }


  /* 3. Smooth scrolling (Lenis)
     ======================================================================== */

  let lenis = null;
  const scrollLocks = new Set();

  /* stop the page scrolling behind the menu or the lightbox */
  function lockScroll(name, locked) {
    if (locked) scrollLocks.add(name); else scrollLocks.delete(name);
    const anyLock = scrollLocks.size > 0;
    if (lenis) {
      if (anyLock) lenis.stop(); else lenis.start();
    } else {
      root.style.overflow = scrollLocks.has('menu') ? 'hidden' : '';
    }
  }

  function scrollToTarget(target) {
    if (lenis) {
      lenis.scrollTo(target, { offset: -72, duration: 1.4 });
    } else {
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
  }

  function initScroll() {
    if (animate && typeof Lenis !== 'undefined') {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);

      /* the lightbox adds a class to <html> while it is open */
      new MutationObserver(() => lockScroll('lightbox', root.classList.contains('fslightbox-open')))
        .observe(root, { attributes: true, attributeFilter: ['class'] });
    }

    /* every in-page link glides to its section */
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute('href');
      const target = id.length > 1 ? $(id) : null;
      if (!target) return;
      event.preventDefault();
      scrollToTarget(target);
    });
  }


  /* 4. Header and navigation
     ======================================================================== */

  function initHeader() {
    const header = $('#site-header');
    const toggle = $('.nav-toggle');
    const nav = $('#site-nav');
    if (!header) return;

    let lastY = window.scrollY;
    let ticking = false;

    /* backed once scrolled; hides on the way down, returns on the way up */
    function update() {
      const y = window.scrollY;
      const open = nav.classList.contains('is-open');
      header.classList.toggle('is-scrolled', y > 16 && !open);
      header.classList.toggle('is-hidden', y > 320 && y > lastY + 2 && !open);
      if (y < lastY - 2 || y <= 320) header.classList.remove('is-hidden');
      lastY = y;
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });

    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close' : 'Menu';
      lockScroll('menu', open);
      update();
      if (open && animate) {
        gsap.fromTo('.site-nav__list li', { y: 24, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
      }
    }

    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
    /* leaving the small-screen layout closes the sheet */
    window.matchMedia('(min-width: 60em)').addEventListener('change', () => setOpen(false));

    update();
  }


  /* 5. Cursor companion
     A small tag beside the pointer that names what can be done there.
     ======================================================================== */

  function initCursor() {
    const cursor = $('#cursor');
    const label = $('#cursor-label');
    if (!cursor || !animate || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const moveX = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3' });
    const moveY = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3' });

    window.addEventListener('pointermove', (event) => {
      moveX(event.clientX);
      moveY(event.clientY);
      const target = event.target instanceof Element ? event.target : null;
      const zone = target ? target.closest('[data-cursor]') : null;
      /* buttons and links inside a zone keep the ordinary pointer */
      const control = target ? target.closest('button, .text-link') : null;
      const active = Boolean(zone) && !control;
      if (active) label.textContent = zone.dataset.cursor;
      cursor.classList.toggle('is-active', active);
    }, { passive: true });

    document.addEventListener('pointerleave', () => cursor.classList.remove('is-active'));
  }


  /* 6. Globe (Three.js)
     A shaded sphere with a graticule, stippled land, coastlines and six pins.
     The pin labels are HTML buttons, placed by projecting each pin.
     ======================================================================== */

  function initGlobe() {
    const stage = $('#globe');
    const canvas = $('#globe-canvas');
    const pinList = $('#globe-pins');
    if (!stage || typeof THREE === 'undefined') return null;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (error) {
      /* no WebGL: the focus card still works without the globe */
      stage.closest('.hero__stage').classList.add('is-flat');
      return null;
    }

    const INK = 0x15302a;
    const BRASS = 0x8f6f2e;      /* 3.6:1 against the sphere */

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    camera.position.set(0, 0, 4.6);

    /* latitude and longitude to a point on the sphere; lng 0 faces the camera */
    const toVector = (lat, lng, radius) => new THREE.Vector3(
      radius * Math.cos(lat * RAD) * Math.sin(lng * RAD),
      radius * Math.sin(lat * RAD),
      radius * Math.cos(lat * RAD) * Math.cos(lng * RAD)
    );

    /* --- the ball itself: shaded in view space so the light never turns --- */
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1, 72, 48),
      new THREE.ShaderMaterial({
        uniforms: {
          uLight: { value: new THREE.Color(0xfcfbf8) },
          uShade: { value: new THREE.Color(0xc6c2b4) }
        },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uLight;
          uniform vec3 uShade;
          varying vec3 vNormal;
          void main() {
            float lit = dot(vNormal, normalize(vec3(-0.45, 0.55, 0.7))) * 0.5 + 0.5;
            float rim = pow(1.0 - max(vNormal.z, 0.0), 2.4);
            vec3 color = mix(uShade, uLight, smoothstep(0.2, 0.95, lit));
            color = mix(color, uShade * 0.88, rim * 0.6);
            gl_FragColor = vec4(color, 1.0);
          }
        `
      })
    ));

    /* everything drawn on the surface turns together */
    const globe = new THREE.Group();
    scene.add(globe);

    /* --- graticule: a line of longitude and latitude every 30 degrees --- */
    const grid = [];
    for (let lng = -180; lng < 180; lng += 30) {
      for (let lat = -84; lat < 84; lat += 4) {
        grid.push(toVector(lat, lng, 1.001), toVector(lat + 4, lng, 1.001));
      }
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      for (let lng = -180; lng < 180; lng += 4) {
        grid.push(toVector(lat, lng, 1.001), toVector(lat, lng + 4, 1.001));
      }
    }
    globe.add(new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(grid),
      new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.1 })
    ));

    /* --- land: evenly spaced dots, kept only where the mask says land --- */
    const mask = Uint8Array.from(atob(WORLD_LAND), (character) => character.charCodeAt(0));
    const isLand = (lat, lng) => {
      const row = clamp(Math.floor(90 - lat), 0, 179);
      const column = ((Math.floor(lng + 180) % 360) + 360) % 360;
      const bit = row * 360 + column;
      return (mask[bit >> 3] >> (bit & 7)) & 1;
    };

    const dots = [];
    const total = 30000;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < total; i += 1) {
      const y = 1 - (2 * (i + 0.5)) / total;
      const ring = Math.sqrt(1 - y * y);
      const x = Math.cos(i * goldenAngle) * ring;
      const z = Math.sin(i * goldenAngle) * ring;
      if (isLand(Math.asin(y) / RAD, Math.atan2(x, z) / RAD)) dots.push(x * 1.002, y * 1.002, z * 1.002);
    }

    /* a soft round sprite so the dots are circles, not squares */
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const spriteContext = sprite.getContext('2d');
    spriteContext.fillStyle = '#ffffff';
    spriteContext.beginPath();
    spriteContext.arc(32, 32, 28, 0, Math.PI * 2);
    spriteContext.fill();

    const dotGeometry = new THREE.BufferGeometry();
    dotGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dots, 3));
    globe.add(new THREE.Points(dotGeometry, new THREE.PointsMaterial({
      color: INK,
      size: 0.0098,
      map: new THREE.CanvasTexture(sprite),
      transparent: true,
      opacity: 0.78,
      alphaTest: 0.2,
      depthWrite: false
    })));

    /* --- coastlines, unpacked from the delta-encoded rings in world.js --- */
    const coast = [];
    WORLD_COAST.forEach((ringData) => {
      let lng = ringData[0];
      let lat = ringData[1];
      for (let i = 2; i < ringData.length; i += 2) {
        const nextLng = lng + ringData[i];
        const nextLat = lat + ringData[i + 1];
        /* skip the artificial edges along the date line and the south pole */
        const seam = (Math.abs(lng) >= 1799 && Math.abs(nextLng) >= 1799) || (lat <= -899 && nextLat <= -899);
        if (!seam && Math.abs(nextLng - lng) < 300) {
          coast.push(toVector(lat / 10, lng / 10, 1.003), toVector(nextLat / 10, nextLng / 10, 1.003));
        }
        lng = nextLng;
        lat = nextLat;
      }
    });
    globe.add(new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(coast),
      new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.8 })
    ));

    /* --- pins: a brass bead and a ring that pulses on the chosen one --- */
    const outward = new THREE.Vector3(0, 0, 1);
    const pins = DESTINATIONS.map((destination, index) => {
      const position = toVector(destination.lat, destination.lng, 1.012);
      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(0.017, 20, 14),
        new THREE.MeshBasicMaterial({ color: BRASS })
      );
      bead.position.copy(position);

      const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.032, 0.038, 48),
        new THREE.MeshBasicMaterial({ color: BRASS, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
      );
      halo.position.copy(position);
      halo.quaternion.setFromUnitVectors(outward, position.clone().normalize());
      globe.add(bead, halo);

      /* the label is a real button, so the globe works from the keyboard too */
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pin';
      button.textContent = destination.name;
      button.addEventListener('click', () => select(index, 'globe'));
      item.appendChild(button);
      pinList.appendChild(item);

      return { position: position, bead: bead, halo: halo, item: item, button: button };
    });

    /* --- the meridian ring the studio is named for --- */
    const ringTilt = new THREE.Group();
    ringTilt.rotation.z = -0.41;
    const meridian = new THREE.Mesh(
      new THREE.TorusGeometry(1.13, 0.0042, 10, 220),
      new THREE.MeshBasicMaterial({ color: BRASS })
    );
    meridian.rotation.y = 1.2;
    ringTilt.add(meridian);
    scene.add(ringTilt);

    /* --- state --- */
    const view = { lat: 18, lng: 100 };      /* the point of the globe facing the viewer */
    const pointer = { x: 0, y: 0 };
    let active = 0;
    let arc = null;
    let dragging = false;
    let velocity = 0;
    let lastX = 0;
    let lastY = 0;
    let visible = true;
    let frame = 0;
    let size = 0;

    function resize() {
      size = stage.clientWidth;
      if (!size) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(size, size, false);
      draw();
    }

    const projected = new THREE.Vector3();

    function draw() {
      globe.rotation.set(view.lat * RAD, -view.lng * RAD, 0);
      globe.updateMatrixWorld();

      /* a touch of parallax: the camera leans towards the pointer */
      camera.position.x += (pointer.x * 0.22 - camera.position.x) * 0.06;
      camera.position.y += (pointer.y * 0.16 - camera.position.y) * 0.06;
      camera.lookAt(0, 0, 0);

      pins.forEach((pin) => {
        projected.copy(pin.position).applyMatrix4(globe.matrixWorld);
        const facing = clamp((projected.z - 0.2) / 0.22, 0, 1);
        projected.project(camera);
        const x = (projected.x * 0.5 + 0.5) * size;
        const y = (-projected.y * 0.5 + 0.5) * size;
        pin.item.style.transform = 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px)';
        pin.item.style.opacity = facing.toFixed(2);
        pin.item.style.visibility = facing > 0.05 ? 'visible' : 'hidden';
      });

      renderer.render(scene, camera);
    }

    function tick(time) {
      frame = 0;
      if (!dragging) {
        /* coast after a drag, then drift very slowly */
        view.lng -= velocity;
        velocity *= 0.94;
        if (Math.abs(velocity) < 0.01) velocity = 0;
      }

      const pulse = (time / 1800) % 1;
      pins.forEach((pin, index) => {
        const chosen = index === active;
        pin.bead.scale.setScalar(chosen ? 1.5 : 1);
        pin.halo.scale.setScalar(chosen ? 1 + pulse * 2.2 : 1);
        pin.halo.material.opacity = chosen ? (1 - pulse) * 0.9 : 0;
      });

      draw();
      start();
    }

    /* Only animate while the globe is on screen and the tab is in front. */
    function start() {
      if (!frame && visible && !document.hidden && !reduceMotion) frame = requestAnimationFrame(tick);
    }

    /* a raised arc from the last destination to the new one */
    function drawArc(from, to) {
      if (arc) {
        globe.remove(arc);
        arc.geometry.dispose();
        arc.material.dispose();
        arc = null;
      }
      if (!animate || from === to) return;

      const a = toVector(DESTINATIONS[from].lat, DESTINATIONS[from].lng, 1);
      const b = toVector(DESTINATIONS[to].lat, DESTINATIONS[to].lng, 1);
      const angle = a.angleTo(b);
      const lift = 0.06 + 0.2 * (angle / Math.PI);
      const steps = 96;
      const points = [];
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        /* spherical interpolation, lifted in the middle */
        const point = a.clone().multiplyScalar(Math.sin((1 - t) * angle) / Math.sin(angle))
          .add(b.clone().multiplyScalar(Math.sin(t * angle) / Math.sin(angle)));
        points.push(point.multiplyScalar(1.012 + Math.sin(t * Math.PI) * lift));
      }

      arc = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: BRASS, transparent: true, opacity: 1 })
      );
      arc.geometry.setDrawRange(0, 0);
      globe.add(arc);

      const progress = { value: 0 };
      const current = arc;
      gsap.to(progress, {
        value: 1,
        duration: 1.7,
        ease: 'power2.inOut',
        onUpdate: () => current.geometry.setDrawRange(0, Math.ceil(progress.value * (steps + 1)))
      });
      gsap.to(current.material, { opacity: 0, duration: 1.2, delay: 3.2 });
    }

    /* turn the globe to face a destination, the short way round */
    function focus(index, immediate) {
      const destination = DESTINATIONS[index];
      const previous = active;
      active = index;
      pins.forEach((pin, i) => pin.button.classList.toggle('is-active', i === index));

      const lat = clamp(destination.lat, -38, 44);
      const turn = ((destination.lng - view.lng + 540) % 360) - 180;
      velocity = 0;

      if (!animate || immediate) {
        view.lat = lat;
        view.lng += turn;
        draw();
        return;
      }
      drawArc(previous, index);
      gsap.to(view, { lat: lat, lng: view.lng + turn, duration: 1.9, ease: 'power3.inOut', overwrite: true });
    }

    /* --- dragging --- */
    canvas.addEventListener('pointerdown', (event) => {
      dragging = true;
      velocity = 0;
      lastX = event.clientX;
      lastY = event.clientY;
      canvas.classList.add('is-dragging');
      canvas.setPointerCapture(event.pointerId);
      if (hasGsap) gsap.killTweensOf(view);
      touched();
    });

    canvas.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      /* dragging across the globe turns it half way round */
      const degreesPerPixel = 180 / (size * 0.84);
      const dx = (event.clientX - lastX) * degreesPerPixel;
      const dy = (event.clientY - lastY) * degreesPerPixel;
      lastX = event.clientX;
      lastY = event.clientY;
      view.lng -= dx;
      velocity = dx;
      /* on touch, vertical movement is left to the page so it can scroll */
      if (event.pointerType !== 'touch') view.lat = clamp(view.lat + dy, -55, 60);
      if (reduceMotion) draw();
    });

    const release = () => {
      dragging = false;
      canvas.classList.remove('is-dragging');
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);

    stage.closest('.hero').addEventListener('pointermove', (event) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = -(event.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    /* --- the tour: advance every few seconds unless the globe was just used --- */
    let lastTouch = 0;
    function touched() {
      lastTouch = Date.now();
    }

    if (!reduceMotion) {
      setInterval(() => {
        if (visible && !document.hidden && !dragging && Date.now() - lastTouch > 10000) {
          select(state.index + 1, 'tour');
        }
      }, 7000);
    }

    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      start();
    }).observe(stage);
    document.addEventListener('visibilitychange', start);
    new ResizeObserver(resize).observe(stage);

    onSelect((destination, index, source) => {
      if (source !== 'tour') touched();
      focus(index, source === 'init');
    });

    resize();
    start();

    return {
      /* used by the entrance animation to spin the globe into place */
      spinIn() {
        if (!animate) return;
        gsap.from(view, { lng: view.lng - 150, lat: -8, duration: 2.6, ease: 'power3.out' });
      }
    };
  }


  /* 7. Focus card
     ======================================================================== */

  function initFocus() {
    const card = $('#focus');
    if (!card) return;

    const image = $('#focus-image');
    const parts = {
      number: $('#focus-number'),
      name: $('#focus-name-text'),
      country: $('#focus-country'),
      time: $('#focus-time'),
      season: $('#focus-season')
    };
    const source = (destination) => 'assets/images/destinations/' + destination.image + '-560.jpg';

    /* what slides on a change: the name, the country line, then each fact row */
    const groups = $$('.focus__line', card).map((line) => [line])
      .concat($$('.focus__facts div', card).map((row) => Array.from(row.children)));

    /* fetch all six thumbnails now, so a change never waits for one */
    DESTINATIONS.forEach((destination) => {
      new Image().src = source(destination);
    });

    function fill(destination, index) {
      image.src = source(destination);
      parts.number.textContent = index + 1;
      parts.name.textContent = destination.name;
      parts.country.textContent = destination.country;
      parts.time.textContent = localTime(destination.timeZone);
      parts.season.textContent = destination.season;
    }

    $('#focus-prev').addEventListener('click', () => select(state.index - 1, 'card'));
    $('#focus-next').addEventListener('click', () => select(state.index + 1, 'card'));

    let timeline = null;
    let shown = 0;

    onSelect((destination, index, origin, changed) => {
      if (!animate || !changed || origin === 'init') {
        fill(destination, index);
        shown = index;
        return;
      }

      /* forward: old leaves upward, new rises from below; back: the reverse */
      const count = DESTINATIONS.length;
      const forward = (index - shown + count) % count <= count / 2;
      const exit = forward ? -1 : 1;
      shown = index;

      if (timeline) timeline.kill();
      timeline = gsap.timeline();

      groups.forEach((group, i) => {
        timeline.to(group, { yPercent: 115 * exit, duration: 0.45, ease: 'power3.in' }, i * 0.04);
      });
      timeline.to(image, { yPercent: 101 * exit, duration: 0.5, ease: 'power3.in' }, 0);

      /* out of sight: swap the content and move it to the other side */
      timeline.add(() => {
        fill(DESTINATIONS[state.index], state.index);
        gsap.set(groups.flat(), { yPercent: -115 * exit });
        gsap.set(image, { yPercent: -101 * exit, scale: 1.2 });
      }, 0.62);

      groups.forEach((group, i) => {
        timeline.to(group, { yPercent: 0, duration: 0.85, ease: 'power3.out' }, 0.62 + i * 0.07);
      });
      timeline.to(image, { yPercent: 0, scale: 1, duration: 1.1, ease: 'power3.out' }, 0.62);
    });

    /* keep the clock honest */
    setInterval(() => {
      parts.time.textContent = localTime(DESTINATIONS[state.index].timeZone);
    }, 30000);
  }


  /* 8. Destinations (the six)
     Choosing a card sets the destination; its link scrolls to the journey.
     ======================================================================== */

  function initPlaces() {
    /* cards react only to hover or focus; none is marked as chosen */
    $$('[data-select]').forEach((link) => {
      link.addEventListener('click', () => select(indexOfDestination(link.dataset.select), 'place'));
    });
  }


  /* 9. Journey: tabs, route, map (Leaflet), climate (Chart.js)
     ======================================================================== */

  function initJourney() {
    const tabList = $('#journey-tabs');
    const panel = $('#journey-panel');
    if (!tabList || !panel) return;

    const parts = {
      place: $('#journey-place'),
      title: $('#journey-title'),
      summary: $('#journey-summary'),
      nights: $('#journey-nights'),
      price: $('#journey-price'),
      season: $('#journey-season'),
      stops: $('#journey-stops'),
      note: $('#climate-note'),
      rows: $('#climate-rows')
    };

    /* --- tabs: in index.html in DESTINATIONS order, with arrow-key support --- */
    const tabs = $$('.tabs__tab', tabList);
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(index, 'tab'));
    });

    tabList.addEventListener('keydown', (event) => {
      const keys = { ArrowRight: state.index + 1, ArrowLeft: state.index - 1, Home: 0, End: tabs.length - 1 };
      if (!(event.key in keys)) return;
      event.preventDefault();
      select(keys[event.key], 'tab');
      tabs[state.index].focus();
    });

    /* --- map --- */
    let map = null;
    let layer = null;
    let markers = [];

    if (typeof L !== 'undefined') {
      map = L.map('journey-map', {
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: !L.Browser.mobile,
        maxZoom: 11
      });
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
      L.tileLayer(esri + 'World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri'
      }).addTo(map);
      L.tileLayer(esri + 'World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}').addTo(map);
      layer = L.layerGroup().addTo(map);
      map.setView([DESTINATIONS[0].lat, DESTINATIONS[0].lng], 6);
    }

    function focusStop(index) {
      $$('.stops__stop', parts.stops).forEach((stop, i) => stop.classList.toggle('is-active', i === index));
      markers.forEach((marker, i) => {
        const element = marker.getElement();
        if (element) element.classList.toggle('is-active', i === index);
        if (i === index) marker.openTooltip(); else marker.closeTooltip();
      });
      if (map && markers[index]) {
        map.flyTo(markers[index].getLatLng(), Math.max(map.getZoom(), 8), { duration: animate ? 1.2 : 0 });
      }
    }

    function drawMap(destination) {
      if (!map) return;
      layer.clearLayers();
      const points = destination.stops.map((stop) => [stop.lat, stop.lng]);

      L.polyline(points, { color: '#86692f', weight: 2, dashArray: '2 8', lineCap: 'round', interactive: false }).addTo(layer);
      markers = destination.stops.map((stop, index) => {
        const marker = L.marker([stop.lat, stop.lng], {
          icon: L.divIcon({
            className: 'stop-pin',
            html: '<span class="stop-pin__dot">' + (index + 1) + '</span>',
            iconSize: [34, 34]
          }),
          title: stop.name,
          alt: stop.name
        }).addTo(layer);
        marker.bindTooltip(stop.name, { direction: 'top', offset: [0, -16], className: 'stop-label', opacity: 1 });
        marker.on('click', () => focusStop(index));
        return marker;
      });

      map.invalidateSize();
      /* extra room at the top, where the arch narrows the frame */
      map.fitBounds(points, { paddingTopLeft: [56, 110], paddingBottomRight: [56, 64], animate: false });
    }

    /* --- climate charts --- */
    const COLORS = {
      paper: '#f5f4f0',
      soft: '#c8cdc9',                      /* axis labels, 8.7:1 */
      faint: 'rgba(245, 244, 240, 0.5)',    /* ordinary bars, 4.4:1 */
      grid: 'rgba(245, 244, 240, 0.14)',
      brass: '#dcc48e',                     /* recommended months, 8.3:1 */
      band: 'rgba(220, 196, 142, 0.14)',
      ink: '#171c1a'
    };
    let best = DESTINATIONS[0].best;
    let highsChart = null;
    let rainChart = null;

    /* a soft gold band behind the recommended months */
    const seasonBand = {
      id: 'seasonBand',
      beforeDatasetsDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        const step = scales.x.getPixelForValue(1) - scales.x.getPixelForValue(0);
        ctx.save();
        ctx.fillStyle = COLORS.band;
        best.forEach((month) => {
          const x = scales.x.getPixelForValue(month - 1);
          ctx.fillRect(x - step / 2, chartArea.top, step, chartArea.bottom - chartArea.top);
        });
        ctx.restore();
      }
    };

    function buildCharts() {
      if (typeof Chart === 'undefined') return;

      Chart.defaults.font.family = "'Hanken Grotesk', system-ui, sans-serif";
      Chart.defaults.font.size = 14;
      Chart.defaults.color = COLORS.soft;

      const isBest = (context) => best.includes(context.dataIndex + 1);
      const shared = (unit) => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: reduceMotion ? 0 : 900, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            offset: true,
            grid: { display: false },
            border: { color: COLORS.grid },
            ticks: { maxRotation: 0, autoSkip: false }
          },
          y: {
            beginAtZero: unit === 'mm',
            grace: '12%',
            border: { display: false },
            grid: { color: COLORS.grid },
            ticks: { maxTicksLimit: 4 }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: COLORS.paper,
            titleColor: COLORS.ink,
            bodyColor: COLORS.ink,
            padding: 10,
            cornerRadius: 6,
            displayColors: false,
            callbacks: {
              title: (items) => MONTH_NAMES[items[0].dataIndex],
              label: (item) => item.formattedValue + ' ' + unit,
              afterLabel: (item) => (best.includes(item.dataIndex + 1) ? 'Recommended' : '')
            }
          }
        }
      });
      const labels = MONTH_NAMES.map((name) => name.charAt(0));

      highsChart = new Chart($('#chart-highs'), {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            data: DESTINATIONS[0].highs.slice(),
            borderColor: COLORS.paper,
            borderWidth: 2,
            tension: 0.35,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBorderWidth: 2,
            pointBorderColor: '#15302a',
            pointBackgroundColor: (context) => (isBest(context) ? COLORS.brass : COLORS.paper)
          }]
        },
        options: shared('°C'),
        plugins: [seasonBand]
      });

      rainChart = new Chart($('#chart-rain'), {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            data: DESTINATIONS[0].rain.slice(),
            backgroundColor: (context) => (isBest(context) ? COLORS.brass : COLORS.faint),
            hoverBackgroundColor: COLORS.paper,
            borderRadius: 3,
            barPercentage: 0.62,
            categoryPercentage: 1
          }]
        },
        options: shared('mm'),
        plugins: [seasonBand]
      });
    }

    function drawClimate(destination) {
      best = destination.best;
      parts.note.textContent = 'We recommend ' + destination.season + '. Those months are marked in gold.';
      parts.rows.innerHTML = MONTH_NAMES.map((name, index) => '<tr><th scope="row">' + name + '</th><td>'
        + destination.highs[index] + '</td><td>' + destination.rain[index] + '</td><td>'
        + (destination.best.includes(index + 1) ? 'Yes' : '') + '</td></tr>').join('');

      if (!highsChart) return;
      highsChart.data.datasets[0].data = destination.highs.slice();
      rainChart.data.datasets[0].data = destination.rain.slice();
      highsChart.update();
      rainChart.update();
    }

    /* --- writing a destination into the panel --- */
    function fill(destination) {
      parts.place.textContent = destination.name + ', ' + destination.country;
      parts.title.textContent = destination.journey;
      parts.summary.textContent = destination.summary;
      parts.nights.textContent = destination.nights + ' nights';
      parts.price.textContent = 'From $' + destination.price.toLocaleString('en-US') + ' each';
      parts.season.textContent = destination.season;

      parts.stops.innerHTML = '';
      destination.stops.forEach((stop, index) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'stops__stop';
        const nights = stop.nights ? stop.nights + (stop.nights === 1 ? ' night' : ' nights') : 'Day visit';
        button.innerHTML = '<span class="stops__number">' + (index + 1) + '</span>'
          + '<span class="stops__name"><span>' + stop.name + '</span><span class="stops__nights">' + nights + '</span></span>'
          + '<span class="stops__text">' + stop.text + '</span>';
        button.addEventListener('click', () => focusStop(index));
        item.appendChild(button);
        parts.stops.appendChild(item);
      });

      drawMap(destination);
      drawClimate(destination);
    }

    buildCharts();

    let swap = null;

    onSelect((destination, index, source, changed) => {
      tabs.forEach((tab, i) => {
        tab.setAttribute('aria-selected', String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', tabs[index].id);
      /* keep the chosen tab in view on narrow screens */
      const tab = tabs[index];
      tabList.scrollTo({ left: tab.offsetLeft - 24, behavior: reduceMotion ? 'auto' : 'smooth' });

      if (!animate || !changed || source === 'init') {
        fill(destination);
        return;
      }
      /* the old journey fades down and away, then the new one settles in */
      const moving = ['.journey__main > *', '.journey__side', '.climate'];
      if (swap) swap.kill();
      swap = gsap.timeline()
        .to(moving, { autoAlpha: 0, y: 16, duration: 0.35, ease: 'power2.in' })
        .add(() => fill(DESTINATIONS[state.index]))
        .to(moving, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.05, ease: 'power3.out' });
    });

    /* the map measures itself wrongly until the layout has settled */
    window.addEventListener('load', () => {
      if (map) {
        map.invalidateSize();
        drawMap(DESTINATIONS[state.index]);
      }
    });
  }


  /* 10. Field notes reel
     A native sideways scroller: swipe, shift+wheel, touch, keys, buttons, drag.
     ======================================================================== */

  function initReel() {
    const reel = $('#field-reel');
    if (!reel) return;

    const bar = $('#field-bar');
    const previous = $('#field-prev');
    const next = $('#field-next');
    const items = $$('.reel__item', reel);
    const behavior = reduceMotion ? 'auto' : 'smooth';

    /* the distance from one photograph to the next */
    const stride = () => (items[1] ? items[1].offsetLeft - items[0].offsetLeft : reel.clientWidth * 0.8);

    let ticking = false;
    function update() {
      const max = reel.scrollWidth - reel.clientWidth;
      const progress = max > 0 ? clamp(reel.scrollLeft / max, 0, 1) : 0;
      const share = reel.scrollWidth > 0 ? reel.clientWidth / reel.scrollWidth : 1;
      bar.style.transform = 'scaleX(' + (share + progress * (1 - share)).toFixed(4) + ')';
      previous.disabled = reel.scrollLeft <= 2;
      next.disabled = reel.scrollLeft >= max - 2;
      ticking = false;
    }

    reel.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    window.addEventListener('resize', update);

    previous.addEventListener('click', () => reel.scrollBy({ left: -stride(), behavior: behavior }));
    next.addEventListener('click', () => reel.scrollBy({ left: stride(), behavior: behavior }));

    /* keep sideways swipes from the smooth scroller so the page stays still */
    reel.addEventListener('wheel', (event) => {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) event.stopPropagation();
    }, { passive: true });

    /* --- dragging with the mouse --- */
    let drag = null;
    let moved = false;

    reel.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      drag = { x: event.clientX, left: reel.scrollLeft };
      moved = false;
    });

    window.addEventListener('pointermove', (event) => {
      if (!drag) return;
      const distance = event.clientX - drag.x;
      if (!moved && Math.abs(distance) > 6) {
        moved = true;
        reel.classList.add('is-dragging');
      }
      if (moved) reel.scrollLeft = drag.left - distance;
    });

    const release = () => {
      if (!drag) return;
      drag = null;
      if (!moved) return;
      /* settle on the nearest photograph, then hand back to scroll snapping */
      const nearest = Math.round(reel.scrollLeft / stride()) * stride();
      reel.scrollTo({ left: nearest, behavior: behavior });
      setTimeout(() => {
        reel.classList.remove('is-dragging');
        moved = false;
      }, reduceMotion ? 0 : 450);
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);

    /* a drag must not also open the photograph it started on */
    reel.addEventListener('click', (event) => {
      if (moved) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
    reel.addEventListener('dragstart', (event) => event.preventDefault());

    update();
  }


  /* 11. Inquiry form (Cleave.js)
     ======================================================================== */

  function initForm() {
    const form = $('#inquiry-form');
    if (!form) return;

    const done = $('#form-done');
    const advice = $('#when-hint');
    const destinationField = $('#destination');
    const fields = {
      name: $('#name'),
      email: $('#email'),
      when: $('#when'),
      travellers: $('#travellers')
    };

    if (typeof Cleave !== 'undefined') {
      new Cleave(fields.when, { date: true, datePattern: ['m', 'Y'], delimiter: '/' });
      new Cleave('#budget', { numeral: true, numeralDecimalScale: 0, numeralPositiveOnly: true });
    }

    /* "03/2027" -> { month: 3, year: 2027 } or null; the slash is optional */
    const parseMonth = (text) => {
      const match = /^(\d{2})\/?(\d{4})$/.exec(text.trim());
      if (!match) return null;
      const month = Number(match[1]);
      return month >= 1 && month <= 12 ? { month: month, year: Number(match[2]) } : null;
    };

    const isAhead = (when) => {
      const now = new Date();
      return when.year > now.getFullYear() || (when.year === now.getFullYear() && when.month >= now.getMonth() + 1);
    };

    /* each rule returns an error message, or an empty string when valid */
    const rules = {
      name: (input) => (input.value.trim().length >= 2 ? '' : 'Enter your name so we know who to reply to.'),
      email: (input) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim()) ? '' : 'Enter an email address, like name@example.com.'),
      when(input) {
        const when = parseMonth(input.value);
        if (!when) return 'Enter a month and year, like 03/2027.';
        return isAhead(when) ? '' : 'Choose a month that has not passed.';
      },
      travellers(input) {
        const value = Number(input.value);
        return Number.isInteger(value) && value >= 1 && value <= 12 ? '' : 'We plan journeys for 1 to 12 travellers.';
      }
    };

    function validate(key) {
      const input = fields[key];
      const error = $('#' + key + '-error');
      const message = rules[key](input);
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
      error.textContent = message;
      error.hidden = !message;
      if (message) {
        input.setAttribute('aria-errormessage', error.id);
      } else {
        input.removeAttribute('aria-errormessage');
      }
      return !message;
    }

    Object.keys(fields).forEach((key) => {
      const input = fields[key];
      input.addEventListener('blur', () => { if (input.value) validate(key); });
      input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') validate(key); });
    });

    /* advise on the chosen month, using the same data as the climate charts */
    function advise() {
      const when = parseMonth(fields.when.value);
      const destination = DESTINATIONS[indexOfDestination(destinationField.value)];
      if (!when || !destination) {
        advice.hidden = true;
        return;
      }
      const month = MONTH_NAMES[when.month - 1];
      const place = destination.inProse || destination.name;
      advice.textContent = destination.best.includes(when.month)
        ? month + ' is one of the months we recommend for ' + place + '.'
        : month + ' is outside the season we recommend for ' + place + '. Its best months are ' + destination.season + '.';
      advice.hidden = false;
    }

    fields.when.addEventListener('input', advise);
    destinationField.addEventListener('change', () => {
      select(indexOfDestination(destinationField.value), 'form');
      advise();
    });
    onSelect((destination) => {
      destinationField.value = destination.id;
      advise();
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const invalid = Object.keys(fields).filter((key) => !validate(key));
      if (invalid.length) {
        fields[invalid[0]].focus();
        return;
      }

      const when = parseMonth(fields.when.value);
      const travellers = Number(fields.travellers.value);
      const destination = DESTINATIONS[indexOfDestination(destinationField.value)];
      $('#form-done-text').textContent = 'Thank you, ' + fields.name.value.trim().split(' ')[0] + '. A planner will write to '
        + fields.email.value.trim() + ' within one working day about ' + (destination.inProse || destination.name) + ' in '
        + MONTH_NAMES[when.month - 1] + ' ' + when.year + ', for ' + travellers
        + (travellers === 1 ? ' traveller.' : ' travellers.');

      form.hidden = true;
      done.hidden = false;
      done.focus({ preventScroll: true });
      if (animate) gsap.from(done, { autoAlpha: 0, y: 24, duration: 0.7, ease: 'power3.out' });
      scrollToTarget($('#inquire'));
    });

    $('#form-reset').addEventListener('click', () => {
      form.reset();
      destinationField.value = DESTINATIONS[state.index].id;
      advice.hidden = true;
      done.hidden = true;
      form.hidden = false;
      fields.name.focus();
    });
  }


  /* 12. Footer clocks
     ======================================================================== */

  function initClocks() {
    const items = $$('#clocks .clocks__item');
    if (!items.length) return;

    const update = () => items.forEach((item) => {
      $('time', item).textContent = localTime(item.dataset.zone);
    });
    update();
    setInterval(update, 30000);
  }


  /* 13. Motion (GSAP)
     One orchestrated entrance behind the loader, then scroll-driven reveals.
     Everything here is skipped when the visitor prefers reduced motion.
     ======================================================================== */

  function initMotion(globe) {
    const loader = $('#loader');
    root.classList.add('is-ready');

    if (!animate) {
      if (loader) loader.remove();
      return;
    }

    /* hold the hero back while the loader covers it */
    gsap.set('[data-hero]', { autoAlpha: 0, y: 32 });
    gsap.set('.brand, .nav-toggle, .site-nav__list li', { autoAlpha: 0, y: -16 });
    gsap.set('.hero__title', { autoAlpha: 0 });

    const fonts = document.fonts && document.fonts.load
      ? Promise.race([
        Promise.all([document.fonts.load("400 1em 'Newsreader'"), document.fonts.load("400 1em 'Hanken Grotesk'")])
          .then(() => document.fonts.ready),
        wait(1800)
      ])
      : Promise.resolve();

    /* --- loader: counts a full turn, then lifts --- */
    const turn = { degrees: 0 };
    const counted = new Promise((resolve) => {
      gsap.timeline({ onComplete: resolve })
        .from('.loader__mark', { yPercent: 60, autoAlpha: 0, duration: 0.9, ease: 'power3.out' })
        .to(turn, {
          degrees: 360,
          duration: 1.5,
          ease: 'power2.inOut',
          onUpdate: () => { $('#loader-count').textContent = Math.round(turn.degrees); }
        }, 0)
        .to('#loader-line', { scaleX: 1, duration: 1.5, ease: 'power2.inOut' }, 0);
    });

    Promise.all([fonts, counted]).then(() => {
      /* --- entrance --- */
      gsap.set('.hero__title', { autoAlpha: 1 });
      SplitText.create('.hero__title', {
        type: 'lines',
        mask: 'lines',
        linesClass: 'split-line',
        autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, { yPercent: 115, duration: 1.4, stagger: 0.12, delay: 0.35, ease: 'power4.out' })
      });

      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .to(loader, { yPercent: -100, duration: 1.1, ease: 'power4.inOut', onComplete: () => loader.remove() })
        .add(() => { if (globe) globe.spinIn(); }, 0.2)
        .to('.brand, .nav-toggle, .site-nav__list li', { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.05 }, 0.7)
        .to('[data-hero]', { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.14 }, 0.75);

      splitHeadings();
      splitStatement();
      ScrollTrigger.refresh();
    });

    /* --- section headings: lines rise out of a mask --- */
    function splitHeadings() {
      $$('[data-split]').forEach((heading) => {
        SplitText.create(heading, {
          type: 'lines',
          mask: 'lines',
          linesClass: 'split-line',
          autoSplit: true,
          onSplit: (self) => gsap.from(self.lines, {
            yPercent: 110,
            duration: 1.2,
            stagger: 0.1,
            ease: 'power4.out',
            scrollTrigger: { trigger: heading, start: 'top 88%', once: true }
          })
        });
      });
    }

    /* --- statement: the words fill in as the paragraph is read --- */
    function splitStatement() {
      const text = $('.statement__text');
      if (!text) return;
      const split = SplitText.create(text, { type: 'words' });
      /* unread words stay at a 3:1 contrast, enough for text this large */
      gsap.fromTo(split.words, { color: '#808683' }, {
        color: '#171c1a',
        stagger: 0.1,
        ease: 'none',
        scrollTrigger: { trigger: text, start: 'top 82%', end: 'bottom 48%', scrub: true }
      });
    }

    /* --- hero: the copy and globe part slightly as the page leaves --- */
    gsap.to('.hero__copy', {
      yPercent: -10,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to('.globe', {
      yPercent: 8,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });

    /* --- general reveals --- */
    $$('.lede, [data-reveal]').forEach((element) => {
      if (element.closest('.hero')) return;
      gsap.from(element, {
        autoAlpha: 0,
        y: 28,
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: element, start: 'top 90%', once: true }
      });
    });

    /* --- destinations: each row of arches is uncovered as it arrives --- */
    gsap.set('.place__media', { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set('.place__body', { autoAlpha: 0 });
    ScrollTrigger.batch('.place', {
      start: 'top 88%',
      once: true,
      onEnter: (batch) => {
        gsap.to(batch.map((place) => $('.place__media', place)), {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1.3,
          stagger: 0.12,
          ease: 'power4.inOut'
        });
        gsap.to(batch.map((place) => $('.place__body', place)), {
          autoAlpha: 1,
          duration: 0.9,
          delay: 0.5,
          stagger: 0.12,
          ease: 'power2.out'
        });
      }
    });

    /* --- journey --- */
    gsap.from('.tabs__tab', {
      autoAlpha: 0,
      y: 20,
      duration: 0.8,
      stagger: 0.06,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.tabs', start: 'top 90%', once: true }
    });
    gsap.from('.journey__map', {
      clipPath: 'inset(100% 0% 0% 0%)',
      duration: 1.5,
      ease: 'power4.inOut',
      scrollTrigger: { trigger: '.journey__map', start: 'top 85%', once: true }
    });

    /* --- approach: three photographs at three depths, and a turning seal --- */
    $$('[data-depth]').forEach((item) => {
      const depth = Number(item.dataset.depth);
      gsap.fromTo(item, { y: depth }, {
        y: -depth,
        ease: 'none',
        scrollTrigger: { trigger: '#collage', start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    gsap.to('#seal', {
      rotation: 200,
      ease: 'none',
      scrollTrigger: { trigger: '#collage', start: 'top bottom', end: 'bottom top', scrub: true }
    });

    /* --- field notes --- */
    gsap.from('.reel__item', {
      autoAlpha: 0,
      y: 60,
      duration: 1.2,
      stagger: 0.09,
      ease: 'power3.out',
      scrollTrigger: { trigger: '#field-reel', start: 'top 85%', once: true }
    });

    /* --- closing: the photograph drifts behind its text --- */
    gsap.fromTo('#closing-media', { yPercent: -8 }, {
      yPercent: 8,
      ease: 'none',
      scrollTrigger: { trigger: '.closing', start: 'top bottom', end: 'bottom top', scrub: true }
    });

    /* --- inquire and footer --- */
    gsap.from('.form > *, .contact__item', {
      autoAlpha: 0,
      y: 24,
      duration: 0.9,
      stagger: 0.07,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.inquire__grid', start: 'top 80%', once: true }
    });
    gsap.from('#footer-mark', {
      yPercent: 35,
      autoAlpha: 0,
      duration: 1.6,
      ease: 'power4.out',
      scrollTrigger: { trigger: '#footer-mark', start: 'top 95%', once: true }
    });

    /* images arriving late change the page height */
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }


  /* 14. Start
     ======================================================================== */

  initScroll();
  initHeader();
  initCursor();
  const globe = initGlobe();
  initFocus();
  initPlaces();
  initJourney();
  initReel();
  initForm();
  initClocks();
  select(0, 'init');
  initMotion(globe);
}());
