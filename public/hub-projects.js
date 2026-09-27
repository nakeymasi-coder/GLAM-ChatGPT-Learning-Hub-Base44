/* =========================================================================
   Prompt Concierge — project system
   ONE ongoing project with ONE master prompt that grows over the
   conversation. SAVED projects persist to the HubProject entity via the
   hubProjects backend function (entity = source of truth). The active
   in-progress draft lives in localStorage so it survives reloads before
   the member names and saves it. A localStorage mirror of saved projects
   is kept as a fallback so the Playbook still renders if the entity call
   fails. Loaded after hub.html inline scripts so it can reuse
   askHubHistory, playbook, renderPlaybook, toast, copyText, openLesson, lessons.
   ========================================================================= */
(function () {
  "use strict";

  var APP_ID = "6a9aedd33cd938f0f47b9ff7";
  var HUB_PROJECTS_ENDPOINT = "/api/apps/" + APP_ID + "/functions/hubProjects";

  var PROJECT_CATEGORIES = [
    "App / Generator", "Business", "Content Creation", "Course / Workshop",
    "Images / Graphics", "Marketing", "Mockups", "Product Listing",
    "Prompts", "Research", "Website", "Other"
  ];
  var ACTIVE_KEY = "glamConciergeProject";   // in-progress draft (localStorage)
  var SAVED_KEY = "glamSavedProjects";       // fallback mirror of saved projects

  var project = null;       // active in-progress project (draft)
  var savedProjects = [];   // cached list from the HubProject entity
  var loadingProjects = false;

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
    catch (e) { return iso; }
  }

  function statusClass(s) {
    s = (s || "").toLowerCase();
    if (s.indexOf("ready") > -1) return "ready";
    if (s.indexOf("need") > -1) return "needs";
    return "building";
  }

  function statusMessage(s) {
    s = (s || "").toLowerCase();
    if (s.indexOf("ready") > -1) return "Your master prompt is ready to use, but we can still improve it if you want.";
    if (s.indexOf("need") > -1) return "Tell me a little more so I can finish your master prompt.";
    return "Your master prompt is taking shape. Ask a follow-up to keep building.";
  }

  function pickCategory(s) {
    if (!s) return "Other";
    var match = PROJECT_CATEGORIES.find(function (c) { return c.toLowerCase() === String(s).toLowerCase(); });
    if (match) return match;
    match = PROJECT_CATEGORIES.find(function (c) { return c.toLowerCase().indexOf(String(s).toLowerCase()) > -1; });
    return match || "Other";
  }

  /* ---- auth + entity API ---- */
  function hubAuthHeaders() {
    var token = localStorage.getItem("base44_access_token") || localStorage.getItem("token");
    if (!token) throw new Error("Your Hub session expired. Please sign in again.");
    return { "Content-Type": "application/json", Authorization: "Bearer " + token };
  }

  async function callHubProjects(op, payload) {
    var res = await fetch(HUB_PROJECTS_ENDPOINT, {
      method: "POST",
      headers: hubAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(Object.assign({ op: op }, payload || {}))
    });
    var data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error((data && data.error) || "The saved project request failed.");
    return data;
  }

  function normalizeProject(p) {
    p = p || {};
    var hist = [];
    try { hist = JSON.parse(p.conversation_history || "[]") || []; } catch (e) { hist = []; }
    return {
      id: p.id || "",
      name: String(p.name || "Untitled project"),
      category: p.category || "Other",
      status: p.status || "Building",
      masterPrompt: p.master_prompt || "",
      summary: p.summary || "",
      recommendedWorkspace: p.recommended_workspace || "ChatGPT chat",
      workspaceReason: p.workspace_reason || "",
      history: Array.isArray(hist) ? hist : [],
      createdAt: p.created_date || "",
      updatedAt: p.updated_date || "",
      source: p.source || "Prompt Concierge"
    };
  }

  function toEntityFields(p) {
    return {
      name: (p.name || "Untitled project").slice(0, 200),
      category: p.category || "Other",
      status: p.status || "Building",
      master_prompt: p.masterPrompt || "",
      summary: p.summary || "",
      recommended_workspace: p.recommended_workspace || "ChatGPT chat",
      workspace_reason: p.workspaceReason || "",
      conversation_history: JSON.stringify(Array.isArray(p.history) ? p.history : []),
      source: p.source || "Prompt Concierge"
    };
  }

  /* ---- localStorage draft + fallback mirror ---- */
  function loadDraft() { try { project = JSON.parse(localStorage.getItem(ACTIVE_KEY) || "null"); } catch (e) { project = null; } }
  function persistDraft() {
    try {
      if (project) localStorage.setItem(ACTIVE_KEY, JSON.stringify(project));
      else localStorage.removeItem(ACTIVE_KEY);
    } catch (e) {}
  }
  function loadMirror() { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]") || []; } catch (e) { return []; } }
  function persistMirror() { try { localStorage.setItem(SAVED_KEY, JSON.stringify(savedProjects)); } catch (e) {} }

  function current() { return project; }

  /* ---- load saved projects from the entity (fallback to mirror) ---- */
  async function loadProjects() {
    if (loadingProjects) return;
    loadingProjects = true;
    try {
      var data = await callHubProjects("list");
      var items = (data && (data.data || data.items || data)) || [];
      if (!Array.isArray(items)) items = [];
      savedProjects = items.map(normalizeProject);
      persistMirror();
      // one-time migration of pre-entity localStorage projects
      if (!savedProjects.length) {
        var legacy = loadMirror();
        if (legacy && legacy.length) {
          for (var i = 0; i < legacy.length; i++) {
            try { await callHubProjects("create", { fields: toEntityFields(legacy[i]) }); } catch (e) {}
          }
          var fresh = await callHubProjects("list");
          savedProjects = ((fresh && (fresh.data || fresh.items || fresh)) || []).map(normalizeProject);
          persistMirror();
        }
      }
    } catch (e) {
      // entity unavailable — fall back to the localStorage mirror so the Playbook still renders
      savedProjects = loadMirror();
    } finally {
      loadingProjects = false;
    }
  }

  async function refreshProjects() {
    try {
      var data = await callHubProjects("list");
      var items = (data && (data.data || data.items || data)) || [];
      if (Array.isArray(items)) { savedProjects = items.map(normalizeProject); persistMirror(); }
    } catch (e) { /* keep cache */ }
    renderProjects();
  }

  /* ---- beginner walkthrough ---- */
  function walkthrough(ws, reason) {
    var isWork = String(ws || "").toLowerCase().indexOf("work") > -1;
    var place = isWork ? "Work" : "ChatGPT chat";
    return [
      '<div class="walkthrough">',
      '<div class="kicker">How to use it</div>',
      '<div class="walk-row"><strong>Where to paste it:</strong> Paste your Master Prompt into a new ChatGPT chat.</div>',
      '<div class="walk-row"><strong>Which one to use:</strong> ' + esc(ws || "ChatGPT chat") + '.</div>',
      '<div class="walk-row"><strong>Normal chat vs ChatGPT Work:</strong> Normal chat is one conversation for quick, one-off tasks. ChatGPT Work is a workspace that keeps a project together — its own chats, files, images, and tools in one place so you can come back to it anytime.</div>',
      '<div class="walk-row"><strong>Why this fits:</strong> ' + esc(reason || "It keeps everything for this project organized in one place.") + '</div>',
      '<div class="walk-steps"><strong>Next steps:</strong><ol>',
      '<li>Open ChatGPT.</li>',
      '<li>Choose ' + esc(ws || "ChatGPT chat") + (isWork ? ' and open your Work space.' : '.') + '</li>',
      (isWork ? '<li>Start a new project in Work.</li>' : '<li>Start a new chat.</li>'),
      '<li>Paste your Master Prompt.</li>',
      '<li>Add any files or images the project needs.</li>',
      '<li>Review the first result.</li>',
      '<li>Come back here if you want to improve the prompt.</li>',
      '</ol></div>',
      '<div class="you-are-here"><span class="yah-label">You are here:</span> Your project is ready → Best place to use it: ' + place + ' → Next step: Open ' + place + ' and paste your master prompt.</div>',
      '</div>'
    ].join("");
  }

  /* ---- main render: called from askLearningHub after each AI response ---- */
  function render(data, question) {
    if (!data) return;
    var answer = document.getElementById("askChatgptAnswer");
    var status = document.getElementById("askChatgptStatus");
    if (!answer) return;

    var masterPrompt = data.masterPrompt || data.copyPrompt || "";
    var isNew = !project;

    if (isNew) {
      project = {
        name: (data.projectNameSuggestion || "Untitled project").slice(0, 80),
        category: pickCategory(data.categorySuggestion),
        masterPrompt: masterPrompt,
        summary: data.projectSummary || "",
        recommendedWorkspace: data.recommendedWorkspace || "ChatGPT chat",
        workspaceReason: data.workspaceReason || "",
        status: data.projectStatus || "Building",
        history: [{ role: "user", content: question }, { role: "assistant", content: data.answer || "" }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        savedProjectId: null
      };
    } else {
      project.masterPrompt = masterPrompt || project.masterPrompt;
      project.summary = data.projectSummary || project.summary;
      project.recommendedWorkspace = data.recommendedWorkspace || project.recommendedWorkspace;
      project.workspaceReason = data.workspaceReason || project.workspaceReason;
      project.status = data.projectStatus || project.status;
      if (data.projectNameSuggestion && !project.userNamed) project.name = data.projectNameSuggestion.slice(0, 80);
      if (data.categorySuggestion && !project.userCategorized) project.category = pickCategory(data.categorySuggestion);
      project.history.push({ role: "user", content: question }, { role: "assistant", content: data.answer || "" });
      if (project.history.length > 40) project.history.splice(0, project.history.length - 40);
      project.updatedAt = new Date().toISOString();
    }
    persistDraft();

    // if already saved, keep the saved record in sync as the master prompt grows
    if (project.savedProjectId) {
      syncSavedQuietly();
    }

    paint(answer, data);
    if (status) status.textContent = statusMessage(project.status);
    answer.classList.add("show");
  }

  async function syncSavedQuietly() {
    if (!project || !project.savedProjectId) return;
    try {
      await callHubProjects("update", { id: project.savedProjectId, fields: toEntityFields(project) });
      var sp = savedProjects.find(function (p) { return p.id === project.savedProjectId; });
      if (sp) {
        Object.assign(sp, {
          masterPrompt: project.masterPrompt, summary: project.summary,
          recommendedWorkspace: project.recommendedWorkspace, status: project.status,
          history: project.history, updatedAt: project.updatedAt
        });
        persistMirror();
      }
    } catch (e) { /* silent — the next manual save will retry */ }
  }

  function paint(answer, data) {
    var p = project;
    var steps = Array.isArray(data.nextSteps) ? data.nextSteps : [];
    var lessonExists = data.lessonId && Array.isArray(window.lessons) && lessons.some(function (l) { return l.id === data.lessonId; });
    var saved = !!(p && p.savedProjectId);

    answer.innerHTML =
      '<div class="kicker">Your AI guide</div>' +
      '<h3 style="margin:5px 0 7px;font-size:25px;letter-spacing:-.035em;">' + esc(data.answer || "Here's where I'd start.") + '</h3>' +
      '<div class="ask-answer-grid">' +
        '<div class="ask-answer-card"><small>What you\'re trying to do</small><p>' + esc(data.whatYouNeed || "") + '</p></div>' +
        '<div class="ask-answer-card"><small>Best ChatGPT feature</small><p>' + esc(data.bestFeature || "") + '</p></div>' +
        '<div class="ask-answer-card"><small>Your next steps</small><ol>' + steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join("") + '</ol></div>' +
        '<div class="ask-answer-card"><small>Ask me next</small><p>' + esc(data.followUp || "Tell me what part you want help with next.") + '</p></div>' +
      '</div>' +
      '<div class="project-status-line"><span class="project-status-badge ' + statusClass(p && p.status) + '">' + esc((p && p.status) || "Building") + '</span><span class="project-status-note">' + esc(statusMessage(p && p.status)) + '</span></div>' +
      '<div class="master-prompt-section">' +
        '<div class="master-prompt-head"><small>Master Prompt</small><span class="mp-name">' + esc((p && p.name) || "Untitled project") + '</span><span class="mp-cat">' + esc((p && p.category) || "Other") + '</span></div>' +
        '<div class="ask-copy-box" id="masterPromptBox">' + esc((p && p.masterPrompt) || "") + '</div>' +
        '<div class="ask-recommend">' +
          '<button class="btn secondary" type="button" onclick="ConciergeProjects.copyMaster()">Copy Master Prompt</button>' +
          '<button class="btn primary" type="button" id="saveProjectBtn" onclick="ConciergeProjects.toggleSave()">' + (saved ? "Update Saved Project" : "Save Project") + '</button>' +
          '<button class="btn secondary" type="button" onclick="ConciergeProjects.confirmReset()">Start New Project</button>' +
        '</div>' +
        '<div class="project-save-fields" id="projectSaveFields" style="display:none">' +
          '<input type="text" id="projectNameInput" placeholder="Project name" maxlength="80">' +
          '<select id="projectCategorySelect">' + PROJECT_CATEGORIES.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join("") + '</select>' +
          '<button class="btn primary" type="button" onclick="ConciergeProjects.confirmSave()">Save</button>' +
          '<button class="btn secondary" type="button" onclick="ConciergeProjects.toggleSave()">Cancel</button>' +
        '</div>' +
      '</div>' +
      walkthrough(p && p.recommendedWorkspace, p && p.workspaceReason) +
      (lessonExists ? '<div class="ask-recommend" style="margin-top:10px"><button class="btn primary" type="button" onclick="openLesson(\'' + esc(data.lessonId) + '\')">Open lesson: ' + esc(data.lessonTitle) + '</button></div>' : "");

    var nameInput = document.getElementById("projectNameInput");
    var catSelect = document.getElementById("projectCategorySelect");
    if (nameInput && p) nameInput.value = p.name || "";
    if (catSelect && p) catSelect.value = p.category || "Other";
  }

  function copyMaster() { var box = document.getElementById("masterPromptBox"); if (box) copyText(box.innerText); }

  function toggleSave() {
    if (project && project.savedProjectId) { updateSaved(); return; }
    var fields = document.getElementById("projectSaveFields");
    if (!fields) return;
    fields.style.display = (fields.style.display === "none" || !fields.style.display) ? "flex" : "none";
    if (fields.style.display === "flex") { var n = document.getElementById("projectNameInput"); if (n) n.focus(); }
  }

  async function confirmSave() {
    var nameInput = document.getElementById("projectNameInput");
    var catSelect = document.getElementById("projectCategorySelect");
    if (!nameInput || !nameInput.value.trim()) { if (nameInput) nameInput.focus(); toast("Give your project a name first."); return; }
    if (!project) return;
    project.name = nameInput.value.trim();
    project.category = catSelect ? catSelect.value : "Other";
    project.userNamed = true;
    project.userCategorized = true;
    project.updatedAt = new Date().toISOString();
    var btn = document.getElementById("saveProjectBtn");
    if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }
    try {
      if (project.savedProjectId) {
        await callHubProjects("update", { id: project.savedProjectId, fields: toEntityFields(project) });
      } else {
        var created = await callHubProjects("create", { fields: toEntityFields(project) });
        var rec = created && (created.data || created);
        if (rec && rec.id) project.savedProjectId = rec.id;
      }
      toast("Project saved to your Playbook.");
      var fields = document.getElementById("projectSaveFields"); if (fields) fields.style.display = "none";
      if (btn) { btn.disabled = false; btn.textContent = "Update Saved Project"; }
      refreshProjects();
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = "Save Project"; }
      toast(String(e && e.message || "Could not save the project. Please try again."));
    }
  }

  async function updateSaved() {
    if (!project || !project.savedProjectId) { toggleSave(); return; }
    project.updatedAt = new Date().toISOString();
    var btn = document.getElementById("saveProjectBtn");
    if (btn) { btn.disabled = true; btn.textContent = "Updating…"; }
    try {
      await callHubProjects("update", { id: project.savedProjectId, fields: toEntityFields(project) });
      toast("Saved project updated.");
      if (btn) { btn.disabled = false; btn.textContent = "Update Saved Project"; }
      refreshProjects();
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = "Update Saved Project"; }
      toast(String(e && e.message || "Could not update the project. Please try again."));
    }
  }

  function reset() {
    project = null;
    persistDraft();
    var answer = document.getElementById("askChatgptAnswer");
    var status = document.getElementById("askChatgptStatus");
    var input = document.getElementById("askChatgptInput");
    if (input) input.value = "";
    if (answer) { answer.classList.remove("show"); answer.innerHTML = ""; }
    if (status) status.textContent = "New project started. Tell me what you're trying to do.";
    try { askHubHistory.splice(0); } catch (e) {}
    if (input) input.focus();
  }

  function confirmReset() {
    if (!project) { reset(); return; }
    if (project.savedProjectId) {
      reset();
      toast("Started a new project. Your saved project is still in your Playbook.");
    } else if (project.masterPrompt) {
      if (confirm("Start a new project? This clears the current master prompt (not yet saved).")) reset();
    } else {
      reset();
    }
  }

  /* ---- Playbook rendering (saved projects + saved prompts) ---- */
  function renderPlaybook() {
    var list = document.getElementById("playbookList");
    if (list) {
      var playbook = window.playbook || [];
      if (!playbook.length) {
        list.innerHTML = '<div class="empty-state">No saved prompts yet. Open a tool and tap <strong>Save to Playbook</strong>.</div>';
      } else {
        list.innerHTML = playbook.map(function (x) {
          return '<div class="saved-item"><strong>' + esc(x.title) + '</strong><pre></pre><div class="saved-actions">' +
            '<button class="tiny-btn" data-copy="' + esc(x.id) + '">Copy</button>' +
            '<button class="tiny-btn" onclick="removePlaybook(\'' + esc(x.id) + '\')">Remove</button></div></div>';
        }).join("");
        Array.prototype.forEach.call(list.querySelectorAll(".saved-item"), function (el, i) { el.querySelector("pre").textContent = playbook[i].content; });
        list.querySelectorAll("[data-copy]").forEach(function (btn) {
          btn.onclick = function () { var item = playbook.find(function (x) { return x.id === btn.dataset.copy; }); if (item) copyText(item.content); };
        });
      }
    }
    var notes = document.getElementById("playbookNotes");
    if (notes) notes.value = localStorage.getItem("glamPlaybookNotes") || "";
    renderProjects();
  }

  function renderProjects() {
    var container = document.getElementById("projectList");
    if (!container) return;
    var searchEl = document.getElementById("projectSearch");
    var catEl = document.getElementById("projectCategoryFilter");
    var sortEl = document.getElementById("projectSort");
    var search = (searchEl ? searchEl.value : "").trim().toLowerCase();
    var cat = catEl ? catEl.value : "all";
    var sort = sortEl ? sortEl.value : "newest";

    var items = savedProjects.slice();
    if (search) {
      items = items.filter(function (p) {
        return (p.name || "").toLowerCase().indexOf(search) > -1 ||
               (p.summary || "").toLowerCase().indexOf(search) > -1 ||
               (p.masterPrompt || "").toLowerCase().indexOf(search) > -1 ||
               (p.category || "").toLowerCase().indexOf(search) > -1;
      });
    }
    if (cat && cat !== "all") items = items.filter(function (p) { return (p.category || "Other") === cat; });
    items.sort(function (a, b) {
      switch (sort) {
        case "oldest": return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        case "name-az": return (a.name || "").localeCompare(b.name || "");
        case "name-za": return (b.name || "").localeCompare(a.name || "");
        case "updated": return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
        case "newest":
        default: return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });

    if (!items.length) {
      container.innerHTML = '<div class="empty-state">No saved projects yet. Build one in the Prompt Concierge and tap <strong>Save Project</strong>.</div>';
      return;
    }
    container.innerHTML = items.map(function (p) {
      return '<div class="project-card">' +
        '<div class="pc-top"><strong class="pc-name">' + esc(p.name) + '</strong><span class="project-status-badge ' + statusClass(p.status) + '">' + esc(p.status || "Building") + '</span></div>' +
        '<div class="pc-meta"><span class="pc-cat">' + esc(p.category || "Other") + '</span><span class="pc-date">Created ' + fmtDate(p.createdAt) + '</span><span class="pc-date">Updated ' + fmtDate(p.updatedAt) + '</span></div>' +
        (p.summary ? '<div class="pc-summary">' + esc(p.summary) + '</div>' : '') +
        '<div class="pc-actions">' +
          '<button class="tiny-btn" onclick="ConciergeProjects.open(\'' + esc(p.id) + '\')">Open Project</button>' +
          '<a class="tiny-btn" href="/projects/' + encodeURIComponent(p.id) + '">View project</a>' +
          '<button class="tiny-btn" onclick="ConciergeProjects.copyMasterById(\'' + esc(p.id) + '\')">Copy Master Prompt</button>' +
          '<button class="tiny-btn" onclick="ConciergeProjects.remove(\'' + esc(p.id) + '\')">Delete</button>' +
        '</div>' +
      '</div>';
    }).join("");
  }

  function open(id) {
    var p = savedProjects.find(function (x) { return x.id === id; });
    if (!p) { toast("That project could not be found."); return; }
    project = {
      name: p.name, category: p.category || "Other",
      masterPrompt: p.masterPrompt || "", summary: p.summary || "",
      recommendedWorkspace: p.recommendedWorkspace || "ChatGPT chat", workspaceReason: p.workspaceReason || "",
      status: p.status || "Ready to Use", history: Array.isArray(p.history) ? p.history.slice() : [],
      createdAt: p.createdAt || new Date().toISOString(), updatedAt: p.updatedAt || new Date().toISOString(),
      savedProjectId: p.id, userNamed: true, userCategorized: true
    };
    persistDraft();
    try { askHubHistory.splice(0); (p.history || []).forEach(function (h) { askHubHistory.push({ role: h.role, content: h.content }); }); } catch (e) {}

    var answer = document.getElementById("askChatgptAnswer");
    var status = document.getElementById("askChatgptStatus");
    if (answer) {
      answer.classList.add("show");
      answer.innerHTML =
        '<div class="kicker">Continuing your project</div>' +
        '<h3 style="margin:5px 0 7px;font-size:25px;letter-spacing:-.035em;">' + esc(p.name) + '</h3>' +
        '<div class="project-status-line"><span class="project-status-badge ' + statusClass(p.status) + '">' + esc(p.status || "Ready to Use") + '</span><span class="project-status-note">' + esc(statusMessage(p.status)) + '</span></div>' +
        '<div class="master-prompt-section">' +
          '<div class="master-prompt-head"><small>Master Prompt</small><span class="mp-name">' + esc(p.name) + '</span><span class="mp-cat">' + esc(p.category || "Other") + '</span></div>' +
          '<div class="ask-copy-box" id="masterPromptBox">' + esc(p.masterPrompt || "") + '</div>' +
          '<div class="ask-recommend">' +
            '<button class="btn secondary" type="button" onclick="ConciergeProjects.copyMaster()">Copy Master Prompt</button>' +
            '<button class="btn primary" type="button" onclick="ConciergeProjects.update()">Update Saved Project</button>' +
            '<button class="btn secondary" type="button" onclick="ConciergeProjects.confirmReset()">Start New Project</button>' +
          '</div>' +
        '</div>' +
        walkthrough(p.recommendedWorkspace, p.workspaceReason);
    }
    if (status) status.textContent = "Continuing " + (p.name || "project") + ". Add details below and the master prompt will update.";
    var hub = document.getElementById("askChatgptHub");
    if (hub) hub.scrollIntoView({ behavior: "smooth", block: "start" });
    var input = document.getElementById("askChatgptInput"); if (input) input.focus();
  }

  function update() { updateSaved(); }
  function copyMasterById(id) { var p = savedProjects.find(function (x) { return x.id === id; }); if (p) copyText(p.masterPrompt || ""); }
  async function remove(id) {
    if (!confirm("Delete this saved project? This cannot be undone.")) return;
    try { await callHubProjects("delete", { id: id }); }
    catch (e) { toast(String(e && e.message || "Could not delete the project.")); return; }
    savedProjects = savedProjects.filter(function (p) { return p.id !== id; });
    persistMirror();
    if (project && project.savedProjectId === id) { project.savedProjectId = null; persistDraft(); }
    renderProjects();
    toast("Project deleted.");
  }

  /* ---- styles ---- */
  function injectStyles() {
    var css = [
      ".project-status-line{display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap}",
      ".project-status-badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}",
      ".project-status-badge.building{background:#fff3cd;color:#7a5900}",
      ".project-status-badge.ready{background:#d8f5e6;color:#0a7a3f}",
      ".project-status-badge.needs{background:#eef0f3;color:#555}",
      ".project-status-note{color:var(--muted);font-size:13px}",
      ".master-prompt-section{margin-top:12px;border:var(--border);border-radius:18px;padding:14px;background:linear-gradient(180deg,#fbfdff,#f4f8fc)}",
      ".master-prompt-head{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:8px}",
      ".master-prompt-head small{color:var(--sapphire);font-weight:900;text-transform:uppercase;letter-spacing:.08em;font-size:11px}",
      ".mp-name{font-weight:800;color:var(--ink)}",
      ".mp-cat{color:var(--ink);font-size:12px;background:#eef3f8;padding:2px 8px;border-radius:999px}",
      ".project-save-fields{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center}",
      ".project-save-fields input,.project-save-fields select{padding:8px 10px;border:var(--border);border-radius:10px;font:inherit;color:var(--ink);background:#fff}",
      ".project-save-fields input{flex:1;min-width:180px}",
      ".project-save-fields select{min-width:160px}",
      ".walkthrough{margin-top:14px;border:var(--border);border-radius:18px;padding:14px;background:#fbfdff}",
      ".walkthrough .kicker{margin-bottom:8px}",
      ".walk-row{margin:6px 0;color:var(--ink);line-height:1.6;font-size:14px}",
      ".walk-row strong{color:var(--sapphire)}",
      ".walk-steps{margin-top:10px;color:var(--ink);font-size:14px;line-height:1.6}",
      ".walk-steps ol{padding-left:20px;margin:6px 0}",
      ".you-are-here{margin-top:12px;padding:10px 12px;border-radius:12px;background:linear-gradient(90deg,#eaf4ff,#f4f8fc);border:1px solid rgba(16,59,99,.12);color:var(--ink);font-size:13px;font-weight:600}",
      ".you-are-here .yah-label{color:var(--sapphire);font-weight:900;text-transform:uppercase;font-size:11px;letter-spacing:.08em;margin-right:6px}",
      ".playbook-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 12px}",
      ".playbook-toolbar input,.playbook-toolbar select{padding:8px 10px;border:var(--border);border-radius:10px;font:inherit;color:var(--ink);background:#fff}",
      ".playbook-toolbar input{flex:1;min-width:160px}",
      ".project-list{display:flex;flex-direction:column;gap:10px;margin-bottom:18px}",
      ".project-card{border:var(--border);border-radius:14px;padding:12px 14px;background:#fff}",
      ".pc-top{display:flex;justify-content:space-between;align-items:center;gap:8px}",
      ".pc-name{color:var(--ink);font-size:15px}",
      ".pc-meta{display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin:4px 0}",
      ".pc-cat{background:#eef3f8;color:var(--ink);padding:2px 8px;border-radius:999px}",
      ".pc-summary{font-size:13px;color:var(--muted);margin:2px 0 8px;line-height:1.5}"
    ].join("\n");
    var style = document.createElement("style");
    style.id = "concierge-projects-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ---- init ---- */
  async function init() {
    injectStyles();
    loadDraft();

    var cf = document.getElementById("projectCategoryFilter");
    if (cf) {
      cf.innerHTML = '<option value="all">All categories</option>' + PROJECT_CATEGORIES.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join("");
    }
    var s = document.getElementById("projectSearch"); if (s) s.addEventListener("input", renderProjects);
    if (cf) cf.addEventListener("change", renderProjects);
    var so = document.getElementById("projectSort"); if (so) so.addEventListener("change", renderProjects);

    renderPlaybook();           // render prompts + draft immediately
    await loadProjects();       // then load saved projects from the entity
    renderProjects();           // re-render project list once loaded

    // restore an in-progress project into the Concierge
    if (project && project.masterPrompt) {
      var answer = document.getElementById("askChatgptAnswer");
      var status = document.getElementById("askChatgptStatus");
      if (answer) {
        answer.classList.add("show");
        answer.innerHTML =
          '<div class="kicker">Your project so far</div>' +
          '<h3 style="margin:5px 0 7px;font-size:25px;letter-spacing:-.035em;">' + esc(project.name) + '</h3>' +
          '<div class="project-status-line"><span class="project-status-badge ' + statusClass(project.status) + '">' + esc(project.status || "Building") + '</span><span class="project-status-note">' + esc(statusMessage(project.status)) + '</span></div>' +
          '<div class="master-prompt-section">' +
            '<div class="master-prompt-head"><small>Master Prompt</small><span class="mp-name">' + esc(project.name) + '</span><span class="mp-cat">' + esc(project.category || "Other") + '</span></div>' +
            '<div class="ask-copy-box" id="masterPromptBox">' + esc(project.masterPrompt) + '</div>' +
            '<div class="ask-recommend">' +
              '<button class="btn secondary" type="button" onclick="ConciergeProjects.copyMaster()">Copy Master Prompt</button>' +
              '<button class="btn primary" type="button" id="saveProjectBtn" onclick="ConciergeProjects.toggleSave()">' + (project.savedProjectId ? "Update Saved Project" : "Save Project") + '</button>' +
              '<button class="btn secondary" type="button" onclick="ConciergeProjects.confirmReset()">Start New Project</button>' +
            '</div>' +
          '</div>' +
          walkthrough(project.recommendedWorkspace, project.workspaceReason);
      }
      if (status) status.textContent = "Pick up where you left off. Add details below to keep building your master prompt.";
    }
  }

  window.ConciergeProjects = {
    current: current,
    render: render,
    reset: reset,
    confirmReset: confirmReset,
    copyMaster: copyMaster,
    copyMasterById: copyMasterById,
    toggleSave: toggleSave,
    confirmSave: confirmSave,
    update: update,
    open: open,
    remove: remove,
    renderPlaybook: renderPlaybook,
    refreshProjects: refreshProjects
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
