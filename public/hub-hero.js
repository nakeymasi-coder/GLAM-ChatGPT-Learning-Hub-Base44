/* Homepage hero media only. No account, learning, or saved-work changes. */
(function () {
  'use strict';
  const video = document.getElementById('hubHeroVideo');
  const controls = document.getElementById('hubHeroControls');
  const toggle = document.getElementById('hubHeroToggle');
  const sound = document.getElementById('hubHeroSound');
  const status = document.getElementById('hubHeroStatus');
  if (!video || !controls || !toggle || !sound || typeof video.play !== 'function' || typeof video.pause !== 'function') return;

  const reducedMotion = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  let wantsPlayback = !reducedMotion.matches;
  let failed = false;
  video.muted = true;
  video.defaultMuted = true;
  video.controls = false;
  controls.hidden = false;

  function updateControls() {
    toggle.textContent = video.paused ? 'Play video' : 'Pause video';
    toggle.setAttribute('aria-label', video.paused ? 'Play hero video' : 'Pause hero video');
    sound.textContent = video.muted ? 'Sound on' : 'Mute';
    sound.setAttribute('aria-label', video.muted ? 'Turn video sound on' : 'Mute video sound');
    sound.setAttribute('aria-pressed', String(!video.muted));
  }

  function playSafely() {
    if (failed) return;
    try {
      const playing = video.play();
      if (playing && typeof playing.catch === 'function') playing.catch(updateControls);
    } catch (_) { updateControls(); }
  }

  function syncVisibility() {
    const hidden = document.visibilityState === 'hidden' || document.documentElement.classList.contains('view-open');
    if (hidden) video.pause();
    else if (wantsPlayback && !reducedMotion.matches) playSafely();
  }

  toggle.addEventListener('click', function () {
    if (video.paused) { wantsPlayback = true; playSafely(); }
    else { wantsPlayback = false; video.pause(); }
    updateControls();
  });
  sound.addEventListener('click', function () { video.muted = !video.muted; updateControls(); });
  ['play', 'pause', 'volumechange', 'loadedmetadata'].forEach(function (event) { video.addEventListener(event, updateControls); });
  video.addEventListener('error', function () {
    failed = true;
    wantsPlayback = false;
    controls.hidden = true;
    if (status) { status.hidden = false; status.textContent = 'The video could not load. You can still explore the Hub below.'; }
  });
  document.addEventListener('visibilitychange', syncVisibility);
  if (typeof MutationObserver === 'function') {
    new MutationObserver(syncVisibility).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
  const motionChanged = function () {
    if (reducedMotion.matches) { wantsPlayback = false; video.autoplay = false; video.pause(); }
  };
  if (typeof reducedMotion.addEventListener === 'function') reducedMotion.addEventListener('change', motionChanged);
  else if (typeof reducedMotion.addListener === 'function') reducedMotion.addListener(motionChanged);
  video.autoplay = !reducedMotion.matches;
  updateControls();
  syncVisibility();
})();
