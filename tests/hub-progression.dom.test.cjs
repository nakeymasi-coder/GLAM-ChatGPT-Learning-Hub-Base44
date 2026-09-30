const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const { parseHTML } = require("linkedom");
const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "public/hub.html"), "utf8");
const turn = () => new Promise(resolve => setImmediate(resolve));

function fixture(t, { saved = new Map(), complete = [] } = {}) {
  saved.set("base44_access_token", "mock-session");
  const { window } = parseHTML(html), document = window.document;
  document.querySelectorAll("select").forEach(select => {
    if (!select.querySelector("option[selected]")) select.querySelector("option")?.setAttribute("selected", "");
  });
  let focused = null;
  Object.defineProperty(document, "activeElement", { get: () => focused });
  window.HTMLElement.prototype.focus = function () { focused = this; };
  window.HTMLElement.prototype.scrollIntoView = function () {};
  window.HTMLElement.prototype.getClientRects = function () { return [{}]; };
  const timers = [], requests = [];
  const localStorage = {
    getItem: key => saved.get(key) || null,
    setItem: (key, value) => saved.set(key, String(value)),
    removeItem: key => saved.delete(key),
  };
  const location = { hash: "", href: "https://fixture.invalid/hub.html", replace() { throw Error("Unexpected authentication call"); } };
  const c = vm.createContext({
    document, localStorage, location, console, URL, URLSearchParams, Blob, Date, Math, JSON, Set, Map, Intl, Promise, Array,
    navigator: { clipboard: { writeText: async () => {} } },
    innerWidth: 1200, innerHeight: 900, scrollY: 0,
    Node: window.Node, MutationObserver: window.MutationObserver, Event: window.Event, CustomEvent: window.CustomEvent,
    setTimeout: (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); id.unref(); return id; },
    clearTimeout, setInterval: () => 0, clearInterval,
    requestAnimationFrame: fn => { const id = setTimeout(fn, 0); timers.push(id); id.unref(); return id; }, cancelAnimationFrame: clearTimeout,
    addEventListener: window.addEventListener.bind(window), removeEventListener: window.removeEventListener.bind(window),
    dispatchEvent: window.dispatchEvent.bind(window), scrollTo() {}, confirm: () => false,
    fetch: async (url, options) => { requests.push({ url, options }); return { ok: true, status: 200, json: async () => [] }; },
  });
  c.window = c; c.globalThis = c;
  for (const script of document.querySelectorAll("script")) {
    if (script.textContent.includes("async function protectHub()")) continue;
    const src = script.getAttribute("src");
    vm.runInContext(src ? fs.readFileSync(path.join(root, "public", src.slice(1)), "utf8") : script.textContent, c);
    if (src === "/hub-storage.js") {
      c.HubStorage.activate("progress-test-user", "mock-session");
      if (!c.HubStorage.getItem("glamHubCompleted")) c.HubStorage.setItem("glamHubCompleted", JSON.stringify(complete));
    }
  }
  t.after(() => timers.forEach(clearTimeout));
  const evaluate = source => vm.runInContext(source, c);
  const activate = element => {
    assert.ok(element, "Expected an existing control");
    if (element.getAttribute("onclick")) evaluate(element.getAttribute("onclick"));
    else element.click();
  };
  return { c, document, saved, requests, evaluate, activate, window };
}

test("recommended lesson is actionable without expanding the full library", t => {
  const f = fixture(t);
  assert.equal(f.document.getElementById("nextTitle").textContent, "ChatGPT Basics");
  f.activate(f.document.getElementById("nextLessonBtn"));
  assert.equal(f.document.getElementById("lessonModal").dataset.lessonId, "basics");
  assert.equal(f.document.getElementById("lessonModal").classList.contains("open"), true);
  assert.equal(f.document.getElementById("toolboxDetails").open, false);
  assert.equal(f.document.querySelectorAll("#startHere .start-card").length, 3);
});

test("each roadmap stage opens its next incomplete lesson and keeps its tool entry", t => {
  const f = fixture(t, { complete: ["basics"] });
  f.evaluate("startBeginnerStage(0)");
  assert.equal(f.document.getElementById("lessonModal").dataset.lessonId, "models");
  f.evaluate("startBeginnerStage(1)");
  assert.equal(f.document.getElementById("lessonModal").dataset.lessonId, "voice");
  f.evaluate("completed = ['basics','models','temporarychat2026']; updateProgress(); startBeginnerStage(0)");
  assert.equal(f.document.getElementById("lessonModal").dataset.lessonId, "basics", "A completed stage remains reviewable");
  f.evaluate("startBeginnerStage(4)");
  assert.equal(f.document.getElementById("lessonModal").dataset.lessonId, "search");
  const stage = f.document.querySelectorAll(".roadmap-card")[4];
  assert.match(stage.textContent, /Next:.*Search/);
  assert.match(stage.querySelector(".roadmap-tool").getAttribute("onclick"), /finder/);
  f.evaluate("startBeginnerStage(7)");
  assert.equal(f.document.querySelector(".panel.active").id, "panel-business");
  assert.equal(f.document.getElementById("lessonModal").classList.contains("open"), false);
});

test("lesson completion preserves practice text and builder drafts", t => {
  const f = fixture(t);
  const builderFields = [...f.document.querySelectorAll("#panel-characterlab input,#panel-characterlab textarea,#panel-environmentlab input,#panel-environmentlab textarea,#panel-typographylab input,#panel-typographylab textarea")];
  assert.ok(builderFields.length > 5);
  builderFields.forEach((field, index) => { field.value = "Keep my draft " + index; });
  const before = builderFields.map(field => [field.id, field.value]);
  f.evaluate("openLesson('basics'); renderLessonMode('basics','try')");
  const attempt = f.document.getElementById("tryInput-basics");
  attempt.value = "My unfinished practice attempt";
  f.activate(f.document.getElementById("lessonCompleteBtn"));
  assert.equal(f.document.getElementById("tryInput-basics"), attempt, "Completion must not rebuild the lesson body");
  assert.equal(attempt.value, "My unfinished practice attempt");
  assert.deepEqual(builderFields.map(field => [field.id, field.value]), before);
  assert.match(f.document.getElementById("lessonNextBtn").textContent, /Instant, Thinking & Pro/);
  assert.equal(f.document.activeElement.id, "lessonNextBtn");
  assert.deepEqual(JSON.parse(f.c.HubStorage.getItem("glamHubCompleted")), ["basics"]);
  f.activate(f.document.getElementById("lessonNextBtn"));
  assert.equal(f.document.getElementById("lessonModal").dataset.lessonId, "models");
  assert.ok(f.document.getElementById("activeLessonTitle"), "Dialog label survives lesson replacement");
});

test("undo completion restores recommendation and persists across account-scoped reload", t => {
  const f = fixture(t);
  f.evaluate("openLesson('basics'); toggleComplete('basics'); toggleComplete('basics')");
  assert.equal(f.document.getElementById("lessonNextBtn"), null);
  assert.equal(f.document.getElementById("lessonCompleteBtn").textContent, "Mark Lesson Complete");
  assert.equal(f.document.getElementById("nextTitle").textContent, "ChatGPT Basics");
  f.evaluate("toggleComplete('basics')");
  const reopened = fixture(t, { saved: f.saved });
  assert.equal(reopened.evaluate("getNextBeginnerLesson().id"), "models");
  assert.equal(reopened.document.getElementById("doneCount").textContent, "1");
});

test("completing all 29 lessons stops recommending Basics and opens assessment", t => {
  const f = fixture(t);
  f.evaluate("completed = lessons.map(lesson => lesson.id); updateProgress(); openLesson('basics')");
  assert.equal(f.evaluate("getNextBeginnerLesson()"), null);
  assert.equal(f.document.getElementById("pctCount").textContent, "100%");
  assert.equal(f.document.getElementById("nextTitle").textContent, "All 29 lessons complete");
  assert.equal(f.document.getElementById("continueLessonTitle").textContent, "All 29 lessons complete");
  assert.equal(f.document.getElementById("lessonNextBtn").textContent, "Open final assessment");
  f.activate(f.document.getElementById("lessonNextBtn"));
  assert.equal(f.document.querySelector(".panel.active").id, "panel-assessment");
  assert.equal(f.document.getElementById("lessonModal").classList.contains("open"), false);
  f.evaluate("startBeginnerStage(0)");
  assert.equal(f.document.getElementById("lessonModal").dataset.lessonId, "basics", "Review stays available");
});

test("recommendations include lessons outside the roadmap before reaching all-complete", t => {
  const f = fixture(t);
  f.evaluate("completed = [...new Set(beginnerStages.flatMap(stage => stage.lessonIds))]; updateProgress()");
  const next = f.evaluate("getNextBeginnerLesson().id");
  assert.equal(next, "deepresearch");
  assert.notEqual(f.document.getElementById("nextTitle").textContent, "All 29 lessons complete");
});

test("recent-work lesson label and action advance together without requesting AI", async t => {
  const f = fixture(t);
  await turn();
  // The current layout has no recent-work host; exercise this retained helper in isolation.
  const list = f.document.createElement("div");
  list.id = "recentWorkList";
  f.document.body.appendChild(list);
  f.evaluate("renderRecentWork()");
  await turn();
  let chip = f.document.querySelector("#recentWorkList [data-next-lesson]");
  assert.ok(chip);
  f.evaluate("toggleComplete('basics')");
  assert.match(chip.textContent, /Instant, Thinking & Pro/);
  f.activate(chip);
  assert.equal(f.document.getElementById("lessonModal").dataset.lessonId, "models");
  f.evaluate("completed = lessons.map(lesson => lesson.id); updateProgress()");
  assert.equal(f.document.querySelector("#recentWorkList [data-next-lesson]"), null);
  assert.equal(f.requests.some(({url}) => /hubAi|invoke|agent.*conversation|netlify.*(?:coach|ask)/i.test(url)), false);
});

test("dismissal and Back/Forward navigation cannot reopen a delayed lesson", async t => {
  const f = fixture(t);
  f.evaluate("startBeginnerStage(0)");
  f.document.getElementById("lessonModal").classList.remove("open");
  f.evaluate("goTab('create')");
  await new Promise(resolve => setTimeout(resolve, 460));
  assert.equal(f.document.getElementById("lessonModal").classList.contains("open"), false);
  assert.equal(f.document.querySelector(".panel.active").id, "panel-create");
  f.evaluate("continueLearning()");
  f.c.location.hash = "#/learn";
  f.evaluate("routeFromHash()");
  assert.equal(f.document.getElementById("lessonModal").classList.contains("open"), false);
  assert.equal(f.document.querySelector(".panel.active").id, "panel-learn");
  f.c.location.hash = "#/academy";
  f.evaluate("routeFromHash()");
  assert.equal(f.document.querySelector(".panel.active").id, "panel-academy");
  f.evaluate("continueLearning(); continueLearning()");
  assert.equal(f.document.querySelectorAll("#lessonModal.open").length, 1);
  assert.equal(f.document.getElementById("lessonModal").dataset.lessonId, "basics");
  f.evaluate("scrollHubHome()");
  assert.equal(f.document.getElementById("lessonModal").classList.contains("open"), false);
  assert.equal(f.document.querySelectorAll(".panel.active").length, 0);
});

test("invalid or duplicate saved lesson IDs cannot inflate displayed progress", t => {
  const f = fixture(t);
  f.evaluate("completed = ['basics','basics','retired-lesson']; updateProgress()");
  assert.equal(f.document.getElementById("doneCount").textContent, "1");
  assert.equal(f.document.getElementById("pctCount").textContent, "3%");
  f.evaluate("toggleComplete('not-a-lesson')");
  assert.equal(f.evaluate("completed.includes('not-a-lesson')"), false);
});

test("opening a different lesson starts at its title instead of the previous footer", t => {
  const f = fixture(t);
  f.evaluate("openLesson('basics')");
  const dialog = f.document.querySelector("#lessonModal .modal");
  dialog.scrollTop = 850;
  f.evaluate("openLesson('prompting')");
  assert.equal(dialog.scrollTop, 0);
  dialog.scrollTop = 600;
  f.evaluate("toggleComplete('prompting')");
  assert.equal(dialog.scrollTop, 600, "Marking complete must not reset the current lesson");
  f.evaluate("continueLearning()");
  assert.equal(dialog.scrollTop, 0);
});

test("lesson footer overlay stays above mobile navigation with viewport clearance", () => {
  const css = fs.readFileSync(path.join(root, "public/hub-navigation.css"), "utf8");
  const dialogLayer = Number(css.match(/#lessonModal\s*\{[^}]*z-index:\s*(\d+)/)[1]);
  const navigationLayer = Number(html.match(/\.mobile-bottom-nav\s*\{[^}]*z-index:\s*(\d+)/)[1]);
  const toastLayer = Number(css.match(/#toast\s*\{[^}]*z-index:\s*(\d+)/)[1]);
  assert.match(css, /\.roadmap-num\s*\{[^}]*background:#086bb5; color:#fff;/);
  assert.ok(dialogLayer > navigationLayer);
  assert.ok(toastLayer > dialogLayer);
  assert.match(css, /#lessonModal\s*\{[^}]*safe-area-inset-bottom/);
  assert.match(css, /#lessonModal \.modal\s*\{[^}]*max-height:calc\(100dvh - 36px\)/);
});

test("all content and level groups remain accessible after progression changes", t => {
  const f = fixture(t);
  assert.equal(f.evaluate("lessons.length"), 29);
  assert.equal(f.evaluate("beginnerStages.length"), 10);
  assert.deepEqual(JSON.parse(f.evaluate("JSON.stringify(lessons.reduce((counts, lesson) => { counts[lesson.level] = (counts[lesson.level] || 0) + 1; return counts; }, {}))")), { Beginner: 15, Intermediate: 13, Advanced: 1 });
  assert.equal(f.document.querySelectorAll("#hub > .panel").length, 24);
  assert.equal(f.document.querySelectorAll("#beginnerRoadmap .roadmap-action").length, 10);
  for (const level of ["Beginner", "Intermediate", "Advanced"]) {
    f.document.querySelector('[data-track="' + level + '"]').click();
    assert.equal(f.document.querySelectorAll(".lesson-card").length, { Beginner: 15, Intermediate: 13, Advanced: 1 }[level]);
  }
});
