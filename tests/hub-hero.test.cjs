const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/hub-hero.js'), 'utf8');

function fixture({ reduced = false, blocked = false } = {}) {
  const listeners = new Map();
  const element = () => ({ hidden: false, textContent: '', attrs: {}, events: {},
    setAttribute(k,v) { this.attrs[k] = v; },
    addEventListener(k,v) { this.events[k] = v; } });
  const video = element();
  Object.assign(video, { paused: true, muted: false, playCalls: 0, pauseCalls: 0,
    play() { this.playCalls++; if (blocked) return Promise.reject(Error('Autoplay blocked')); this.paused=false; this.events.play?.(); return Promise.resolve(); },
    pause() { this.pauseCalls++; this.paused=true; this.events.pause?.(); } });
  const ids = { hubHeroVideo: video, hubHeroControls: element(), hubHeroToggle: element(), hubHeroSound: element(), hubHeroStatus: element() };
  ids.hubHeroControls.hidden = true;
  ids.hubHeroStatus.hidden = true;
  const classes = new Set();
  const document = { getElementById: id => ids[id], visibilityState: 'visible', documentElement: { classList: { contains: n => classes.has(n) } }, addEventListener: (k,v) => listeners.set(k,v) };
  const motion = { matches: reduced, addEventListener(k,v) { this.listener = v; } };
  let observer;
  const context = { document, window: { matchMedia: () => motion }, MutationObserver: class { constructor(fn) { observer=fn; } observe() {} } };
  vm.runInNewContext(source, context);
  return { ...ids, video, classes, document, motion, visibility: () => listeners.get('visibilitychange')(), navigate: () => observer() };
}

test('hero starts silently and makes its controls available', () => {
  const f=fixture();
  assert.equal(f.video.muted,true);
  assert.equal(f.video.defaultMuted,true);
  assert.equal(f.video.autoplay,true);
  assert.equal(f.video.playCalls,1);
  assert.equal(f.hubHeroControls.hidden,false);
  assert.equal(f.hubHeroToggle.textContent,'Pause video');
  assert.equal(f.hubHeroSound.textContent,'Sound on');
});
test('pause and play controls reflect the actual media state', () => {
  const f=fixture();
  f.hubHeroToggle.events.click();
  assert.equal(f.video.paused,true);
  assert.equal(f.hubHeroToggle.textContent,'Play video');
  f.hubHeroToggle.events.click();
  assert.equal(f.video.paused,false);
  assert.equal(f.hubHeroToggle.textContent,'Pause video');
});
test('sound is enabled only through an intentional sound-button click', () => {
  const f=fixture();
  assert.equal(f.video.muted,true);
  f.hubHeroSound.events.click();
  assert.equal(f.video.muted,false);
  assert.equal(f.hubHeroSound.attrs['aria-pressed'],'true');
  assert.equal(f.hubHeroSound.textContent,'Mute');
  f.hubHeroSound.events.click();
  assert.equal(f.video.muted,true);
});
test('reduced motion starts static but allows deliberate playback', () => {
  const f=fixture({reduced:true});
  assert.equal(f.video.autoplay,false);
  assert.equal(f.video.playCalls,0);
  assert.equal(f.hubHeroToggle.textContent,'Play video');
  f.hubHeroToggle.events.click();
  assert.equal(f.video.paused,false);
});
test('enabling reduced motion pauses running media', () => {
  const f=fixture();
  f.motion.matches=true;
  f.motion.listener();
  assert.equal(f.video.paused,true);
  assert.equal(f.video.autoplay,false);
});
test('leaving Home pauses playback and returning respects manual pause', () => {
  const f=fixture();
  f.classes.add('view-open'); f.navigate();
  assert.equal(f.video.paused,true);
  f.classes.delete('view-open'); f.navigate();
  assert.equal(f.video.paused,false);
  f.hubHeroToggle.events.click();
  f.classes.add('view-open'); f.navigate();
  f.classes.delete('view-open'); f.navigate();
  assert.equal(f.video.paused,true);
});
test('backgrounding the page pauses playback', () => {
  const f=fixture();
  f.document.visibilityState='hidden'; f.visibility();
  assert.equal(f.video.paused,true);
});
test('blocked autoplay leaves a usable play control', async () => {
  const f=fixture({blocked:true});
  await Promise.resolve();
  assert.equal(f.hubHeroToggle.textContent,'Play video');
  assert.equal(f.hubHeroControls.hidden,false);
});
test('unavailable video leaves a clear fallback and the homepage intact', () => {
  const f=fixture();
  f.video.events.error();
  assert.equal(f.hubHeroControls.hidden,true);
  assert.equal(f.hubHeroStatus.hidden,false);
  assert.match(f.hubHeroStatus.textContent,/explore the Hub below/);
});
