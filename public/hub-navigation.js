/* Plain-language routing uses local keyword matches, not an AI call. */
(function () {
  function suggest(raw) {
    const q = String(raw || "").trim().toLowerCase();
    if (!q) return null;
    if (/\b(saved?|history|find my|my work|my projects?|notes|playbook|vault)\b/.test(q))
      return { title:"Find your saved Hub work", description:"Your Hub projects, prompt history, and notes are together here. Work stored only in ChatGPT stays there unless you import it.", tab:"mystuff", action:"Open my saved work" };
    if (/\b(glossy|gloss|shiny|shine|sparkly|metallic|matte|texture|realistic|soft|cinematic|power words?)\b/.test(q)) {
      const word = /glossy|gloss|shiny|shine/.test(q) ? "glossy" : (q.match(/sparkly|metallic|matte|texture|realistic|soft|cinematic/) || [""])[0];
      return { title:"Find words for the look you want", description:"Power Words explains visual words in plain language and lets you add them to an image prompt.", tab:"powerwords", search:word, action:"Explore Power Words", example:word==="glossy" ? "Give it an extra-glossy finish, with bright reflections and a smooth, shiny surface." : "" };
    }
    if (/\b(new|beginner|basics|start|learn chatgpt|what is chatgpt|overwhelmed|confused)\b/.test(q))
      return { title:"Start with one simple conversation", description:"The basics lesson walks through what to type and how to ask a follow-up. You don't need to learn every feature first.", lesson:"basics", action:"Open the basics lesson" };
    if (/\b(pdf|files?|upload|documents?|spreadsheet)\b/.test(q))
      return { title:"Learn to use your files", description:"See how to bring a file into ChatGPT and ask questions about it.", lesson:"files", action:"Open the files lesson" };
    if (/\b(voice|talk|speak|out loud)\b/.test(q))
      return { title:"Talk to ChatGPT", description:"Learn how to start a voice conversation and follow up out loud.", lesson:"voice", action:"Open the voice lesson" };
    if (/\b(search|research|web|online|latest)\b/.test(q))
      return { title:"Find information with ChatGPT", description:"Start with the search lesson to learn when to look things up and check the sources.", lesson:"search", action:"Open the search lesson" };
    if (/\b(images?|pictures?|photos?|graphics?|flyers?|logos?|covers?)\b/.test(q))
      return { title:"Describe the image you want", description:"The image lesson shows how to describe a subject, style, and changes in everyday words.", lesson:"images", action:"Open the image lesson" };
    if (/\b(prompt|write|writing|caption|email|post|idea|make|create|build)\b/.test(q))
      return { title:"Turn your idea into a prompt", description:"The existing prompt builder gives you a place to describe the result you want. Your words will be carried over so you don't have to type them again.", tab:"asklibrary", prefill:String(raw).trim(), action:"Open the prompt builder" };
    return { title:"Let's start with your own words", description:"I couldn't find a specific match. The prompt builder is a useful next step when you know what you want but don't know what to call it.", tab:"asklibrary", prefill:String(raw).trim(), action:"Try the prompt builder" };
  }
  globalThis.HubGuide = { suggest };
  if (typeof document === "undefined") return;

  function openSuggestion(result) {
    if (result.lesson) {
      goTab("learn");
      openLesson(result.lesson);
      return;
    }
    goTab(result.tab);
    if (result.search) {
      const input = document.getElementById("powerWordSearch");
      if (input) input.value = result.search;
      searchPowerWords(result.search);
    }
    if (result.prefill) {
      const input = document.getElementById("askLibDescribe");
      if (input) input.value = result.prefill;
      const goal = document.getElementById("askLibGoal");
      if (goal) goal.value = "unsure";
    }
  }
  function renderSuggestion() {
    const result = suggest(document.getElementById("plainHelpInput").value);
    const box = document.getElementById("plainHelpResult");
    box.replaceChildren();
    if (!result) { box.hidden = true; return; }
    const title = document.createElement("h3");
    title.textContent = result.title;
    const description = document.createElement("p");
    description.textContent = result.description;
    box.append(title, description);
    if (result.example) {
      const example = document.createElement("p");
      example.className = "sample-words";
      example.textContent = "Words you can try: “" + result.example + "”";
      box.append(example);
    }
    const actions = document.createElement("div");
    actions.className = "result-actions";
    const open = document.createElement("button");
    open.type = "button"; open.className = "btn primary";
    open.textContent = result.action;
    open.addEventListener("click", () => openSuggestion(result));
    actions.append(open);
    if (result.example) {
      const copy = document.createElement("button");
      copy.type = "button"; copy.className = "btn secondary";
      copy.textContent = "Copy these words";
      copy.addEventListener("click", () => copyText(result.example));
      actions.append(copy);
    }
    box.append(actions);
    box.hidden = false;
  }
  document.getElementById("plainHelpForm").addEventListener("submit", event => {
    event.preventDefault(); renderSuggestion();
  });
  document.querySelectorAll("[data-help-example]").forEach(button => {
    button.addEventListener("click", () => {
      document.getElementById("plainHelpInput").value = button.dataset.helpExample;
      renderSuggestion();
    });
  });

  const learnTabs = ["learn","academy","practice","scenarios","simulator","quiz","assessment","certificate","glossary"];
  const savedTabs = ["mystuff","history","playbook"];
  function currentPath() {
    const active = document.querySelector(".panel.active")?.id?.replace("panel-", "");
    if (!active) return "home";
    return learnTabs.includes(active) ? "learn" : savedTabs.includes(active) ? "mystuff" : "create";
  }
  function syncPath(focusHeading) {
    const path = currentPath();
    document.querySelectorAll("[data-hub-path]").forEach(item => {
      if (item.dataset.hubPath === path) item.setAttribute("aria-current","page");
      else item.removeAttribute("aria-current");
    });
    const active = document.querySelector(".panel.active");
    const breadcrumb = document.getElementById("hubBreadcrumb");
    if (breadcrumb && active) {
      const id = active.id.replace("panel-","");
      const pathNames = {learn:"Learn ChatGPT",create:"Make something",mystuff:"Saved work"};
      const title = TAB_LOCATION[id]?.[1] || pathNames[path];
      breadcrumb.replaceChildren();
      if (id !== path) {
        const back = document.createElement("button");
        back.type = "button"; back.className = "path-back"; back.textContent = pathNames[path];
        back.addEventListener("click",()=>goTab(path));
        breadcrumb.append(back, document.createTextNode(" › "));
      }
      const strong = document.createElement("strong"); strong.textContent = title;
      breadcrumb.append(strong);
    }
    if (focusHeading && !document.getElementById("lessonModal")?.classList.contains("open")) {
      const heading = active?.querySelector("h2,h3") || document.getElementById("startHereTitle");
      if (heading) { heading.setAttribute("tabindex","-1"); heading.focus({preventScroll:true}); }
    }
  }
  globalThis.openAllHubTools = function () {
    goTab("learn");
    const details = document.getElementById("toolboxDetails");
    details.open = true;
    details.querySelector("summary").focus();
  };
  window.addEventListener("hashchange", () => syncPath(true));
  syncPath(false);

  // A closed off-canvas menu must not receive keyboard focus.
  const sidebar = document.getElementById("hubSidebar");
  const trigger = document.getElementById("hubHamburger");
  let wasOpen = false;
  function syncMenu() {
    const open = sidebar.classList.contains("open");
    sidebar.inert = !open;
    sidebar.setAttribute("aria-hidden",String(!open));
    trigger.setAttribute("aria-expanded",String(open));
    document.body.style.overflow = open ? "hidden" : "";
    if (open && !wasOpen) sidebar.querySelector("button").focus();
    if (!open && wasOpen) trigger.focus({preventScroll:true});
    wasOpen = open;
  }
  trigger.setAttribute("aria-controls","hubSidebar");
  new MutationObserver(syncMenu).observe(sidebar,{attributes:true,attributeFilter:["class"]});
  syncMenu();

  // Keep lesson dialogs usable from the new beginner entry points.
  const lessonModal = document.getElementById("lessonModal");
  const lessonDialog = lessonModal.querySelector(".modal");
  const lessonClose = document.getElementById("closeModal");
  lessonDialog.setAttribute("role","dialog");
  lessonDialog.setAttribute("aria-modal","true");
  lessonDialog.setAttribute("aria-label","ChatGPT lesson");
  lessonClose.setAttribute("aria-label","Close lesson");
  let lessonWasOpen = false;
  let lessonReturnFocus = null;
  function syncLessonDialog() {
    const open = lessonModal.classList.contains("open");
    if (open && !lessonWasOpen) {
      lessonReturnFocus = document.activeElement;
      const title = lessonDialog.querySelector(".lesson-title");
      if (title) { title.id = "activeLessonTitle"; lessonDialog.setAttribute("aria-labelledby",title.id); }
      lessonClose.focus({preventScroll:true});
    }
    if (!open && lessonWasOpen) {
      const returnTarget = lessonReturnFocus?.getClientRects().length ? lessonReturnFocus : document.querySelector(".panel.active h2");
      if (returnTarget) { returnTarget.setAttribute("tabindex","-1"); returnTarget.focus({preventScroll:true}); }
    }
    lessonWasOpen = open;
  }
  new MutationObserver(syncLessonDialog).observe(lessonModal,{attributes:true,attributeFilter:["class"]});
  document.addEventListener("keydown", event => {
    if (!lessonModal.classList.contains("open")) return;
    if (event.key === "Escape") { event.preventDefault(); lessonModal.classList.remove("open"); return; }
    if (event.key !== "Tab") return;
    const focusable = [...lessonDialog.querySelectorAll('button,a[href],input,textarea,select,[tabindex="0"]')].filter(el=>el.getClientRects().length && !el.disabled);
    const first=focusable[0], last=focusable[focusable.length-1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  document.addEventListener("keydown", event => {
    if (!sidebar.classList.contains("open")) return;
    if (event.key === "Escape") { event.preventDefault(); closeHubSidebar(); return; }
    if (event.key !== "Tab") return;
    const focusable = [...sidebar.querySelectorAll('button,a[href],input,summary')].filter(el=>el.getClientRects().length && !el.disabled);
    const first = focusable[0], last = focusable[focusable.length-1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
})();
