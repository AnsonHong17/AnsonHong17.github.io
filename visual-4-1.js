/* Kawan CBT 4.1 — lightweight purely decorative parallax on toy islands.
 * Does NOT read student answers or identifiers and does NOT access Supabase.
 */
(() => {
  'use strict';
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.adventure-map .island').forEach(island => {
    island.addEventListener('focus', () => island.classList.add('is-focused'));
    island.addEventListener('blur', () => island.classList.remove('is-focused'));
    if (reduced) return;
    island.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      const r = island.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      island.style.setProperty('--ww-tx', `${(dx * 12).toFixed(1)}px`);
      island.style.setProperty('--ww-ty', `${(dy * 8).toFixed(1)}px`);
    });
    island.addEventListener('pointerleave', () => {
      island.style.removeProperty('--ww-tx');
      island.style.removeProperty('--ww-ty');
    });
  });
})();
