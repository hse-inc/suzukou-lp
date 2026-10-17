/* 案件だけの動き：株式会社鈴興建設（骨格の swipe.js は直さない）
 * 1. 写真の帯（.reel）：1周ぶんを複製して継ぎ目なく流す。距離は写真の読み込み後に px で測り、速さは --reel-pxs（templates/parts/parts.js と同じ作り）
 * 2. 流れる巨大な英字（.bigline）：文の半分の長さ ÷ --bigline-pxs で秒数を決める（参考：約38px/秒）
 * 3. PC の右の帯：今のページ番号
 */
(() => {
  document.querySelectorAll('.reel__track').forEach((track) => {
    const items = [...track.querySelectorAll('.reel__img')];
    if (!items.length) return;
    items.forEach((img) => { const c = img.cloneNode(true); c.alt = ''; track.appendChild(c); });
    const first = track.querySelectorAll('.reel__img')[items.length];
    const fit = () => {
      const dist = Math.round(first.offsetLeft - items[0].offsetLeft);
      if (dist < 50) return;
      const pxs = parseFloat(getComputedStyle(track).getPropertyValue('--reel-pxs')) || 30;
      track.style.setProperty('--reel-dist', `-${dist}px`);
      track.style.setProperty('--reel-speed', `${(dist / pxs).toFixed(1)}s`);
      track.classList.add('is-ready');
    };
    const all = [...track.querySelectorAll('.reel__img')];
    Promise.all(all.map((im) => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()))).then(fit);
    let rt = 0;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(fit, 300); });
  });

  const fitLines = () => {
    document.querySelectorAll('.bigline span').forEach((el) => {
      const half = el.offsetWidth / 2;
      const pxs = parseFloat(getComputedStyle(el).getPropertyValue('--bigline-pxs')) || 38;
      if (half > 0) el.style.setProperty('--bigline-speed', `${(half / pxs).toFixed(1)}s`);
    });
  };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(fitLines);

  const now = document.querySelector('.rail-side__now');
  document.addEventListener('pagechange', (e) => {
    if (now) now.textContent = String(e.detail.index).padStart(2, '0');
  });
})();
