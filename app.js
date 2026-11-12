(() => {
  'use strict';
  const config = window.RALL_CONFIG || {};
  const social = config.social || {};
  const live = config.live || {};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const toast = $('#toast');
  let toastTimer;

  function notify(message) {
    $('#toast-message').textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 4200);
  }

  function validUrl(value, allowedHosts) {
    try {
      const u = new URL(String(value || '').trim());
      if (u.protocol !== 'https:') return null;
      if (allowedHosts && !allowedHosts.some(h => u.hostname === h || u.hostname.endsWith('.' + h))) return null;
      return u;
    } catch (_) { return null; }
  }

  // Permitir exclusivamente los sitios oficiales en reproductores embebidos.
  const youtubeId = /^[a-zA-Z0-9_-]{11}$/.test(String(live.youtubeVideoId || '')) ? live.youtubeVideoId : '';
  const fbVideo = validUrl(live.facebookVideoUrl, ['facebook.com', 'fb.watch']);
  const ttVideo = validUrl(live.tiktokVideoUrl, ['tiktok.com']);
  const tiktokPostId = ttVideo ? (ttVideo.pathname.match(/\/video\/(\d+)/) || [])[1] : null;
  const playUrls = {
    youtube: youtubeId ? `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&playsinline=1` : '',
    facebook: fbVideo ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(fbVideo.toString())}&show_text=false&width=1000` : '',
    tiktok: tiktokPostId ? `https://www.tiktok.com/player/v1/${tiktokPostId}?controls=1&description=1` : ''
  };
  let activePlatform = 'rall';
  let isLive = Boolean(live.isLive);

  function initStream() {
    const frame = $('#stream-frame');
    const placeholder = $('#stream-placeholder');
    const status = $('#live-status-text');
    const signal = $('#live-signal');
    const title = $('#stream-title');
    const description = $('#stream-platform-description');
    const profileLink = $('#platform-profile-link');
    const platformNames = { rall: 'RALL TV', youtube: 'YouTube', facebook: 'Facebook', tiktok: 'TikTok' };
    const messages = {
      rall: 'La señal oficial del RALL, transmitida aquí mismo, sin salir de nuestra web.',
      youtube: 'Mira las transmisiones y los mejores peñonazos en YouTube.',
      facebook: 'Acompáñanos también en nuestra comunidad de Facebook.',
      tiktok: 'Los directos de TikTok se abren desde su plataforma oficial.'
    };
    function selectPlatform(platform, focus = false) {
      if (!Object.hasOwn(platformNames, platform)) return;
      activePlatform = platform;
      $$('.platform-tab').forEach(tab => {
        const active = tab.dataset.platform === platform;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        if (active && focus) tab.focus();
      });
      // El reproductor se carga solo si existe un enlace oficial configurado.
      const url = platform === 'rall' ? '' : playUrls[platform];
      frame.src = 'about:blank'; // Detener audio al cambiar de plataforma.
      frame.hidden = !url;
      const rallTab = platform === 'rall';
      $('#rall-internal').hidden = !rallTab;
      placeholder.hidden = rallTab || Boolean(url);
      window.RALL_LIVE?.onPlatformChange(rallTab);
      if (url) frame.src = url;
      const configuredTitle = String(live.title || '').trim();
      title.textContent = rallTab ? 'RALL TV · La señal de los peñonazos' : (configuredTitle && isLive ? configuredTitle : (url ? `Disfruta el RALL en ${platformNames[platform]}` : 'La próxima descarga se está preparando')); 
      description.textContent = rallTab ? messages.rall : (url ? messages[platform] : (platform === 'tiktok' ? messages.tiktok : 'Mantente pendiente de nuestras redes para el próximo peñonazo.')); 
      const targetUrl = rallTab ? null : validUrl(social[platform], platform === 'youtube' ? ['youtube.com', 'youtu.be'] : platform === 'facebook' ? ['facebook.com', 'fb.com', 'fb.watch'] : ['tiktok.com']);
      profileLink.href = targetUrl ? targetUrl.toString() : '#redes';
      profileLink.target = targetUrl ? '_blank' : '_self';
      profileLink.rel = targetUrl ? 'noopener noreferrer' : '';
      profileLink.firstChild.textContent = targetUrl ? `IR A NUESTRO ${platformNames[platform].toUpperCase()} ` : 'EXPLORA NUESTRAS REDES ';
    }
    status.textContent = isLive ? 'EN VIVO AHORA' : 'PRÓXIMA TRANSMISIÓN';
    signal.classList.toggle('is-live', isLive);
    $$('.platform-tab').forEach(tab => {
      tab.addEventListener('click', () => selectPlatform(tab.dataset.platform));
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const all = ['rall', 'youtube', 'facebook', 'tiktok'];
        let i = all.indexOf(activePlatform);
        if (event.key === 'ArrowLeft') i = (i + all.length - 1) % all.length;
        if (event.key === 'ArrowRight') i = (i + 1) % all.length;
        if (event.key === 'Home') i = 0;
        if (event.key === 'End') i = all.length - 1;
        selectPlatform(all[i], true);
      });
    });
    // Comenzar con la primera señal embebida disponible.
    const first = 'rall';
    selectPlatform(first);
  }

  function initSocial() {
    const links = $('#social-links');
    const providers = [
      ['tiktok', 'TIKTOK', ['tiktok.com']],
      ['facebook', 'FACEBOOK', ['facebook.com', 'fb.com', 'fb.watch']],
      ['instagram', 'INSTAGRAM', ['instagram.com']],
      ['youtube', 'YOUTUBE', ['youtube.com', 'youtu.be']]
    ];
    const verified = providers.map(([key, label, hosts]) => ({ label, href: validUrl(social[key], hosts) })).filter(item => item.href);
    if (!verified.length) return;
    links.replaceChildren();
    verified.forEach(({ label, href }) => {
      const a = document.createElement('a');
      a.href = href.toString();
      a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = label + ' ↗';
      links.appendChild(a);
    });
  }

  function initEvents() {
    const list = $('#events-list');
    const events = Array.isArray(config.events) ? config.events : [];
    const parsed = events.filter(e => e && /^\d{4}-\d{2}-\d{2}$/.test(e.date || '') && typeof e.title === 'string' && e.title.trim())
      .sort((a, b) => a.date.localeCompare(b.date));
    if (!parsed.length) return;
    const formatter = new Intl.DateTimeFormat('es-CO', { month: 'short' });
    list.replaceChildren();
    for (const ev of parsed) {
      const dt = new Date(`${ev.date}T12:00:00`);
      if (Number.isNaN(dt.getTime())) continue;
      const article = document.createElement('article');
      article.className = 'event-card';
      const date = document.createElement('div');
      date.className = 'event-date';
      const day = document.createElement('strong'); day.textContent = String(dt.getDate()).padStart(2, '0');
      const month = document.createElement('span'); month.textContent = formatter.format(dt).toUpperCase();
      date.append(day, month);
      const details = document.createElement('div'); details.className = 'event-details';
      const h3 = document.createElement('h3'); h3.textContent = ev.title;
      const p = document.createElement('p'); p.textContent = [ev.location, ev.time].filter(Boolean).join(' • ') || 'Detalles próximamente';
      details.append(h3, p);
      article.append(date, details);
      const href = validUrl(ev.link);
      if (href) {
        const a = document.createElement('a');
        a.className = 'event-action'; a.href = href.toString();
        a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.textContent = '↗'; a.setAttribute('aria-label', `Información de ${ev.title}`);
        article.appendChild(a);
      }
      list.appendChild(article);
    }
  }

  async function copyText(value) {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(value); return true; }
    } catch (_) { /* fallback */ }
    const textarea = document.createElement('textarea');
    textarea.value = value; textarea.style.position = 'fixed'; textarea.style.opacity = '0';
    document.body.appendChild(textarea); textarea.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) { /* manual */ }
    textarea.remove();
    return ok;
  }

  async function sharePage() {
    const data = { title: 'RALL Turbo Laser', text: '¡Que suene la máquina! Conoce el RALL Turbo Laser.', url: window.location.href.split('#')[0] };
    if (navigator.share) {
      try { await navigator.share(data); return; } catch (err) { if (err.name === 'AbortError') return; }
    }
    const success = await copyText(data.url);
    notify(success ? 'Enlace de la página copiado' : 'Copia el enlace desde la barra del navegador');
  }

  function initBooking() {
    const dialog = $('#booking-dialog');
    const openButton = $('#book-button');
    const form = $('#booking-form');
    const dateInput = $('#contact-date');
    const whatsappDigits = String(social.whatsapp || '').replace(/\D/g, '');
    const hasWhatsapp = /^\d{10,15}$/.test(whatsappDigits);
    $('#booking-help').textContent = hasWhatsapp ? 'Al enviar, abrirás WhatsApp con tu mensaje listo para enviar.' : 'Podrás copiar el mensaje y enviarlo al equipo por tus canales habituales.';
    const today = new Date();
    const tzSafe = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    dateInput.min = tzSafe;
    openButton.addEventListener('click', () => dialog.showModal());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const name = $('#contact-name').value.trim().slice(0, 90);
      const city = $('#contact-city').value.trim().slice(0, 110);
      const date = dateInput.value;
      const message = `¡Hola, equipo de RALL Turbo Laser! 🎶\nMi nombre es ${name}.\nMe interesa contratar el picó para un evento.\n📍 Lugar: ${city}\n📅 Fecha aproximada: ${date}\n¿Me pueden contar sobre disponibilidad y cotización?`;
      if (hasWhatsapp) {
        const url = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        notify('WhatsApp listo: envía tu mensaje en la ventana abierta');
      } else {
        const copied = await copyText(message);
        if (copied) notify('Solicitud copiada. Compártela con el equipo del RALL');
        else window.prompt('Copia tu solicitud de evento:', message);
      }
      dialog.close();
    });
  }

  // Álbum interactivo: se alimenta del contenido editable en site.config.js.
  function initGallery() {
    const safeAsset = value => /^[a-z0-9-]+\.webp$/.test(String(value || '')) ? `assets/${value}` : '';
    const gallery = (Array.isArray(config.gallery) ? config.gallery : []).filter(item => item && safeAsset(item.image) && ['djs','pico','cultura'].includes(item.category));
    const djItems = Array.isArray(config.djs) ? config.djs : [];
    const grid = $('#gallery-grid');
    const djList = $('#dj-list');
    const dialog = $('#gallery-dialog');
    const photo = $('#dialog-image');
    const caption = $('#dialog-caption');
    const count = $('#dialog-count');
    let filtered = [...gallery];
    let activeIndex = 0;
    let lastTrigger = null;

    const categoryNames = { djs: 'EN LA CABINA', pico: 'LA MÁQUINA', cultura: 'CULTURA RALL' };
    const makeSpan = (name, value) => { const el = document.createElement('span'); el.className = name; el.textContent = value; return el; };

    for (const dj of djItems) {
      if (!dj || !safeAsset(dj.photo)) continue;
      const card = document.createElement('article'); card.className = 'dj-card reveal';
      const figure = document.createElement('div'); figure.className = 'dj-photo';
      const image = document.createElement('img'); image.src = safeAsset(dj.photo); image.alt = 'Fotografía de una sesión en la cabina del RALL Turbo Laser'; image.loading = 'lazy'; image.decoding = 'async';
      figure.append(image, makeSpan('dj-card-label', String(dj.label || 'RALL / EN CABINA').slice(0, 48)));
      const body = document.createElement('div'); body.className = 'dj-card-content';
      const title = document.createElement('h3'); title.textContent = String(dj.name || 'Desde la cabina').slice(0, 60);
      const subtitle = document.createElement('p'); subtitle.textContent = String(dj.subtitle || 'RALL Turbo Laser').slice(0, 110);
      body.append(title, subtitle, makeSpan('dj-card-symbol', '↗'));
      card.append(figure, body);
      djList.append(card);
    }

    function makeGalleryCard(entry, idx) {
      const card = document.createElement('button'); card.className = 'gallery-card gallery-v3-card reveal';
      card.type = 'button'; card.dataset.category = entry.category; card.dataset.galleryIndex = String(idx);
      card.setAttribute('aria-label', `Ampliar imagen: ${entry.title}`);
      const img = document.createElement('img');
      img.src = safeAsset(entry.thumb) || safeAsset(entry.image);
      img.alt = String(entry.alt || entry.title || 'RALL Turbo Laser');
      img.loading = idx < 2 ? 'eager' : 'lazy'; img.decoding = 'async';
      const overlay = document.createElement('div'); overlay.className = 'gallery-v3-overlay';
      const meta = document.createElement('div');
      meta.append(makeSpan('gallery-v3-number', `${String(idx + 1).padStart(2,'0')} / ${categoryNames[entry.category]}`));
      const title = document.createElement('strong'); title.textContent = String(entry.title || 'RALL Turbo Laser').slice(0, 90);
      meta.append(title);
      overlay.append(meta, makeSpan('gallery-expand', '↗'));
      card.append(img, overlay);
      card.addEventListener('click', () => openPhoto(entry, card));
      return card;
    }
    gallery.forEach((entry,index) => grid.append(makeGalleryCard(entry,index)));

    function visibleCards() { return [...grid.children].filter(card => !card.hidden); }
    function setFilter(value) {
      const filter = ['todos','djs','pico','cultura'].includes(value) ? value : 'todos';
      filtered = gallery.filter(entry => filter === 'todos' || entry.category === filter);
      [...grid.children].forEach(card => {
        card.hidden = filter !== 'todos' && card.dataset.category !== filter;
        card.classList.add('is-visible');
      });
      $$('.gallery-filter').forEach(button => {
        const active = button.dataset.galleryFilter === filter;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      $('#gallery-total').textContent = `${String(filtered.length).padStart(2, '0')} ${filtered.length === 1 ? 'FOTOGRAFÍA' : 'FOTOGRAFÍAS'}`;
    }
    function setPhoto(entry) {
      const full = safeAsset(entry.image);
      if (!full) return;
      photo.src = full;
      photo.alt = String(entry.alt || entry.title || 'Foto de RALL Turbo Laser');
      caption.textContent = String(entry.title || 'RALL Turbo Laser');
      count.textContent = `${activeIndex + 1} / ${filtered.length}`;
    }
    function openPhoto(entry, trigger) {
      lastTrigger = trigger;
      activeIndex = Math.max(0,filtered.indexOf(entry));
      setPhoto(filtered[activeIndex]);
      dialog.showModal();
    }
    function stepPhoto(delta) {
      if (!dialog.open || !filtered.length) return;
      activeIndex = (activeIndex + delta + filtered.length) % filtered.length;
      setPhoto(filtered[activeIndex]);
    }
    $('#lightbox-prev').addEventListener('click', () => stepPhoto(-1));
    $('#lightbox-next').addEventListener('click', () => stepPhoto(1));
    dialog.addEventListener('close', () => { photo.removeAttribute('src'); lastTrigger?.focus(); });
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); stepPhoto(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); stepPhoto(1); }
    });
    $$('.gallery-filter').forEach(button => button.addEventListener('click', () => setFilter(button.dataset.galleryFilter)));
    $$('[data-gallery-jump]').forEach(link => link.addEventListener('click', () => setFilter(link.dataset.galleryJump)));
    setFilter('todos');
  }

  function initNavigation() {
    const menu = $('#mobile-nav');
    const toggle = $('#menu-toggle');
    function closeMenu() { menu.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Abrir menú'); }
    toggle.addEventListener('click', () => {
      menu.hidden = !menu.hidden;
      toggle.setAttribute('aria-expanded', String(!menu.hidden));
      toggle.setAttribute('aria-label', menu.hidden ? 'Abrir menú' : 'Cerrar menú');
    });
    $$('.mobile-nav a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
    document.addEventListener('click', event => { if (!menu.hidden && !$('#site-header').contains(event.target)) closeMenu(); });
    const progress = $('#scroll-progress');
    const back = $('#back-to-top');
    let ticking = false;
    function scrollTick() {
      const maximum = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progress.style.width = Math.min(100, (window.scrollY / maximum) * 100) + '%';
      back.classList.toggle('visible', window.scrollY > 700);
      ticking = false;
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; window.requestAnimationFrame(scrollTick); } }, { passive: true });
    back.addEventListener('click', () => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }));
    scrollTick();
    if ('IntersectionObserver' in window) {
      const navObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) $$('.desktop-nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
        });
      }, { rootMargin: '-25% 0px -55% 0px' });
      $$('.hero, .intro-section, .live-section, .dj-section, .gallery-section, .agenda-section').forEach(section => navObserver.observe(section));
    }
  }

  function initReveal() {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      $$('.reveal').forEach(el => el.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px 15px 0px' });
    $$('.reveal').forEach(el => observer.observe(el));
  }

  $('#current-year').textContent = String(new Date().getFullYear());
  if (typeof config.name === 'string' && config.name.trim()) document.title = `${config.name} — ¡Que suene la máquina!`;
  $('#share-stream').addEventListener('click', sharePage);
  $('#share-site').addEventListener('click', sharePage);
  initStream(); window.RALL_LIVE?.init(); initSocial(); initEvents(); initBooking(); initGallery(); initNavigation(); initReveal();
})();
