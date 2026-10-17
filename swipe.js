(() => {
  const SCROLL = document.documentElement.dataset.layout === 'scroll';
  const slider = document.getElementById('slider');
  const column = document.querySelector('.column');
  const pages = [...slider.querySelectorAll('.page')];
  const pad = (n) => String(n).padStart(2, '0');
  const railNow = document.querySelector('.rail-side__now');
  const railName = document.querySelector('.rail-side__name');
  const next = document.querySelector('.nextbtn');
  const nextName = document.querySelector('.nextbtn__name');

  let current = -1;
  const activate = (index) => {
    if (index === current || index < 0) return;
    current = index;
    const page = pages[index];
    pages.forEach((p) => p.classList.toggle('is-active', p === page));
    column.dataset.tone = page.dataset.tone || 'light';
    column.dataset.page = index === 0 ? 'top' : 'p';
    column.classList.toggle('is-last', index === pages.length - 1);
    column.classList.toggle('is-long', page.classList.contains('page--long'));
    if (nextName) nextName.textContent = page.dataset.next || '';
    if (railNow) railNow.textContent = pad(index);
    if (railName) railName.textContent = page.dataset.label || '';
    document.dispatchEvent(new CustomEvent('pagechange', { detail: { index, page, total: pages.length } }));
  };
  const indexFromScroll = () => {
    const mid = slider.scrollTop + slider.clientHeight / 2;
    let i = 0;
    pages.forEach((p, k) => { if (p.offsetTop <= mid) i = k; });
    return i;
  };
  let ticking = false;
  slider.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; activate(indexFromScroll()); });
  }, { passive: true });
  window.addEventListener('load', () => activate(indexFromScroll()));
  activate(indexFromScroll());

  let arriving = false;
  const go = (index) => {
    const i = Math.max(0, Math.min(pages.length - 1, index));
    if (i === current) return;
    arriving = pages[i].classList.contains('page--long');
    pages[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const GAP_MS = 250, LOCK_MS = 600, HOLD_MS = 450, QUIET_MS = 3000;
  let locked = false, lastT = 0, lastDy = 0, vel = 0, sentAt = -1e9, fresh = true, longAt = 0;
  const insideLong = (dy) => {
    const page = pages[current];
    if (!page || !page.classList.contains('page--long')) return null;
    const top = page.offsetTop, bottom = top + page.offsetHeight;
    const viewTop = slider.scrollTop, viewBottom = viewTop + slider.clientHeight;
    const now = performance.now();
    const can = dy > 0 ? viewBottom < bottom - 1 : viewTop > top + 1;
    if (can) { longAt = now; return 'scroll'; }
    if (now - longAt < HOLD_MS) return 'hold';
    return null;
  };
  window.addEventListener('wheel', (e) => {
    if (SCROLL || e.ctrlKey) return;
    const t = e.timeStamp || performance.now();
    const dt = Math.max(8, t - lastT);
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : 1), ad = Math.abs(dy);
    const v = ad / dt;
    const gap = t - lastT > GAP_MS && (Math.abs(lastDy) < 10 || t - sentAt > QUIET_MS);
    const flip = ad >= 4 && lastDy !== 0 && Math.sign(dy) !== Math.sign(lastDy);
    const surge = ad >= 15 && ad > Math.abs(lastDy) * 1.6 + 4 && v > vel * 1.8 + 0.25;
    const isNew = gap || flip || surge || t - lastT > 1000;
    vel = t - lastT > GAP_MS ? v : vel * 0.6 + v * 0.4;
    lastT = t;
    lastDy = dy;
    if (isNew) fresh = true;
    if (locked) { e.preventDefault(); fresh = false; return; }
    if (arriving) {
      if (isNew) arriving = false;
      else { e.preventDefault(); return; }
    }
    const inside = insideLong(dy);
    if (inside === 'scroll') return;
    e.preventDefault();
    if (inside === 'hold' || !fresh || ad < 4) return;
    fresh = false;
    locked = true;
    sentAt = t;
    go(current + (dy > 0 ? 1 : -1));
    setTimeout(() => { locked = false; }, LOCK_MS);
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (SCROLL) return;
    if (e.target.closest('input, textarea, select, button')) return;
    const down = ['ArrowDown', 'PageDown'].includes(e.key) || (e.key === ' ' && !e.shiftKey);
    const up = ['ArrowUp', 'PageUp'].includes(e.key) || (e.key === ' ' && e.shiftKey);
    if (!down && !up) return;
    if (insideLong(down ? 1 : -1) === 'scroll') return;
    e.preventDefault();
    if (e.repeat) return;
    go(current + (down ? 1 : -1));
  });
  if (next) next.addEventListener('click', (e) => { e.preventDefault(); go(current + 1); });
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    if (a === next) return;
    a.addEventListener('click', (e) => {
      const target = document.getElementById(a.getAttribute('href').slice(1));
      if (!target || !pages.includes(target)) return;
      e.preventDefault();
      go(pages.indexOf(target));
    });
  });

  const STEP_MS = 120, START_MS = 200, RESET_MS = 700;
  let timers = [], resetTimer = null;
  const play = (page) => {
    timers.forEach(clearTimeout);
    timers = [...page.querySelectorAll('.rv')].map((el, k) => setTimeout(() => el.classList.add('is-on'), START_MS + STEP_MS * k));
  };
  const reset = (except) => pages.forEach((p) => {
    if (p !== except) p.querySelectorAll('.rv.is-on').forEach((el) => el.classList.remove('is-on'));
  });
  if (SCROLL) {
    let queue = 0, queueAt = 0;
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      const now = performance.now();
      if (now - queueAt > STEP_MS) queue = 0;
      queueAt = now;
      setTimeout(() => en.target.classList.add('is-on'), STEP_MS * queue++);
    }), { root: slider, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.rv').forEach((el) => io.observe(el));
  } else {
    document.addEventListener('pagechange', (e) => {
      play(e.detail.page);
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => reset(e.detail.page), RESET_MS);
    });
    if (pages[current]) play(pages[current]);
  }

  document.querySelectorAll('form[data-static]').forEach((f) => f.addEventListener('submit', (e) => e.preventDefault()));
})();
