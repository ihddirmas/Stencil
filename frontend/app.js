(() => {
  const STORAGE_KEY = "stencil.library.v1";
  const journal = document.getElementById("journal");
  const analyzeBtn = document.getElementById("analyze-btn");
  const statusEl = document.getElementById("status");
  const crisisPanel = document.getElementById("crisis-panel");
  const crisisMessage = document.getElementById("crisis-message");
  const crisisResources = document.getElementById("crisis-resources");
  const workspace = document.getElementById("workspace");
  const libraryList = document.getElementById("library-list");
  const resultTitle = document.getElementById("result-title");
  const citationEl = document.getElementById("citation");
  const summaryEl = document.getElementById("summary");
  const diagramEl = document.getElementById("diagram");
  const annotationsEl = document.getElementById("annotations");
  const worksheetEl = document.getElementById("worksheet");

  const API_BASE = window.STENCIL_API || "";
  let library = loadLibrary();
  let activeId = library[0]?.id || null;

  analyzeBtn.addEventListener("click", onAnalyze);
  journal.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onAnalyze();
  });

  if (library.length) {
    show(workspace);
    renderLibrary();
    renderStencil(library[0]);
  }

  async function onAnalyze() {
    const text = journal.value.trim();
    if (!text) {
      setStatus("Paste at least one diary entry first.");
      journal.focus();
      return;
    }
    hide(crisisPanel);
    analyzeBtn.disabled = true;
    setStatus("Finding your template…", true);

    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);

      if (data.crisis_flag) {
        hide(workspace);
        renderCrisis(data);
        setStatus("");
      } else {
        const item = toLibraryItem(data, text);
        library = [item, ...library];
        saveLibrary(library);
        activeId = item.id;
        show(workspace);
        renderLibrary();
        renderStencil(item);
        setStatus("Stencil added to your library.");
        workspace.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (err) {
      setStatus(err.message || "Something went wrong.");
    } finally {
      analyzeBtn.disabled = false;
    }
  }

  function toLibraryItem(data, rawText) {
    return {
      id: `st_${Date.now().toString(36)}`,
      createdAt: Date.now(),
      excerpt: rawText.replace(/\s+/g, " ").slice(0, 140),
      ...data,
    };
  }

  function renderCrisis(data) {
    crisisMessage.textContent =
      data.message ||
      "We paused analysis. Please use the resources below if you need support.";
    crisisResources.innerHTML = "";
    (data.resources || []).forEach((r) => {
      const li = document.createElement("li");
      if (r.url) {
        const a = document.createElement("a");
        a.href = r.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = r.name;
        li.appendChild(a);
        if (r.detail) li.appendChild(document.createTextNode(` — ${r.detail}`));
      } else {
        li.innerHTML = `<strong>${esc(r.name)}</strong>${r.detail ? ` — ${esc(r.detail)}` : ""}`;
      }
      crisisResources.appendChild(li);
    });
    show(crisisPanel);
    crisisPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderLibrary() {
    libraryList.innerHTML = "";
    if (!library.length) {
      libraryList.innerHTML = `<li class="lib-hint">No stencils yet — paste an entry above.</li>`;
      return;
    }
    library.forEach((item) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lib-item" + (item.id === activeId ? " active" : "");
      btn.innerHTML = `<strong>${esc(item.title || item.template_type)}</strong>
        <span>${esc(item.template_type)} · ${new Date(item.createdAt).toLocaleString()}</span>
        <span>${esc(item.excerpt || "")}</span>`;
      btn.addEventListener("click", () => {
        activeId = item.id;
        renderLibrary();
        renderStencil(item);
      });
      li.appendChild(btn);
      libraryList.appendChild(li);
    });
  }

  function renderStencil(item) {
    resultTitle.textContent = item.title || "Your stencil";
    citationEl.textContent = item.source_citation || "";
    summaryEl.textContent =
      item.exercise?.rationale ||
      "Applied to patterns found in your own wording.";

    const anns = item.annotations || item.framework?.annotations || [];
    annotationsEl.innerHTML = "";
    anns.forEach((a) => {
      const div = document.createElement("div");
      div.className = "annotation";
      div.innerHTML = `<blockquote>“${esc(a.quote)}”</blockquote><p>${esc(a.note)}</p>`;
      annotationsEl.appendChild(div);
    });

    diagramEl.innerHTML = "";
    worksheetEl.innerHTML = "";

    const type = item.template_type;
    if (type === "quadrant" && item.framework) {
      diagramEl.innerHTML = renderAgencyQuadrant(item.framework);
    } else if (type === "triangle" && item.framework) {
      diagramEl.innerHTML = renderTriangleSvg(item.framework);
    } else if (type === "identity_shift") {
      worksheetEl.innerHTML = renderIdentityWS(item.worksheet || item.exercise?.fields || {});
    } else if (type === "forgiveness") {
      worksheetEl.innerHTML = renderForgivenessWS(item.worksheet || item.exercise?.fields || {});
    } else if (type === "cognitive_distortions") {
      worksheetEl.innerHTML = renderDistortionsWS(item.worksheet || item.exercise?.fields || {});
    }

    // Also show exercise HTML when present for quadrant/triangle
    if ((type === "quadrant" || type === "triangle") && item.exercise?.html_template) {
      worksheetEl.innerHTML =
        `<h3>${esc(item.exercise.title || "Recommended exercise")}</h3>` +
        item.exercise.html_template;
    }
  }

  /** Consciousness × Agency style quadrant matching the Limberg reference */
  function renderAgencyQuadrant(fw) {
    const L = fw.labels || {};
    const x = clamp01(fw.position?.x ?? 0.5);
    const y = clamp01(fw.position?.y ?? 0.5);
    const px = 80 + x * 440;
    const py = 80 + (1 - y) * 440;

    return `
<svg viewBox="0 0 600 620" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0 0 L8 4 L0 8 z" fill="#d45a9a"/>
    </marker>
  </defs>
  <!-- quadrant fills -->
  <rect x="80" y="80" width="220" height="220" rx="10" fill="#9fc49a" opacity="0.45"/>
  <rect x="300" y="80" width="220" height="220" rx="10" fill="#7eb8b0" opacity="0.5"/>
  <rect x="80" y="300" width="220" height="220" rx="10" fill="#e8c97a" opacity="0.45"/>
  <rect x="300" y="300" width="220" height="220" rx="10" fill="#e0a066" opacity="0.5"/>

  <text class="diagram-label" x="100" y="108">GREEN</text>
  <text class="diagram-title" x="100" y="132">${esc(L.top_left || "Spiritual Bypassers")}</text>
  <text class="diagram-label" x="320" y="108">TEAL</text>
  <text class="diagram-title" x="320" y="132">${esc(L.top_right || "Agentic Sages")}</text>
  <text class="diagram-label" x="100" y="328">AMBER</text>
  <text class="diagram-title" x="100" y="352">${esc(L.bottom_left || "NPCs")}</text>
  <text class="diagram-label" x="320" y="328">ORANGE</text>
  <text class="diagram-title" x="320" y="352">${esc(L.bottom_right || "Agentic Fools")}</text>

  <!-- pathway arrows -->
  <path d="M200 410 L380 410" stroke="#d45a9a" stroke-width="3.5" fill="none" opacity="0.55" marker-end="url(#arr)"/>
  <path d="M400 380 L200 220" stroke="#d45a9a" stroke-width="3.5" fill="none" opacity="0.45" marker-end="url(#arr)"/>
  <path d="M200 180 L380 180" stroke="#d45a9a" stroke-width="3.5" fill="none" opacity="0.55" marker-end="url(#arr)"/>

  <line x1="300" y1="80" x2="300" y2="520" stroke="#1a2a24" stroke-opacity="0.25" stroke-width="2"/>
  <line x1="80" y1="300" x2="520" y2="300" stroke="#1a2a24" stroke-opacity="0.25" stroke-width="2"/>

  <text class="diagram-label" x="300" y="55" text-anchor="middle">${esc(L.y_high || "High Consciousness")}</text>
  <text class="diagram-label" x="300" y="555" text-anchor="middle">${esc(L.y_low || "Low Consciousness")}</text>
  <text class="diagram-label" x="48" y="305" text-anchor="middle" transform="rotate(-90 48 305)">${esc(L.x_low || "Low Agency")}</text>
  <text class="diagram-label" x="552" y="305" text-anchor="middle" transform="rotate(90 552 305)">${esc(L.x_high || "High Agency")}</text>

  <circle class="marker-pulse" cx="${px}" cy="${py}" r="18" fill="#1e4a36" fill-opacity="0.25"/>
  <circle cx="${px}" cy="${py}" r="10" fill="#1e4a36"/>
  <circle cx="${px}" cy="${py}" r="3.5" fill="#fff"/>
</svg>`;
  }

  function renderTriangleSvg(fw) {
    const L = fw.labels || {};
    const wa = clamp01(fw.position?.vertex_a ?? 0.34);
    const wb = clamp01(fw.position?.vertex_b ?? 0.33);
    const wc = clamp01(fw.position?.vertex_c ?? 0.33);
    const sum = wa + wb + wc || 1;
    const a = wa / sum, b = wb / sum, c = wc / sum;
    const A = { x: 300, y: 90 }, B = { x: 90, y: 480 }, C = { x: 510, y: 480 };
    const px = a * A.x + b * B.x + c * C.x;
    const py = a * A.y + b * B.y + c * C.y;
    return `
<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <polygon points="${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}" fill="#fbfefc" stroke="#1a2a24" stroke-opacity="0.22" stroke-width="2"/>
  <text class="diagram-title" x="${A.x}" y="58" text-anchor="middle">${esc(L.vertex_a || "A")}</text>
  <text class="diagram-title" x="${B.x}" y="530" text-anchor="middle">${esc(L.vertex_b || "B")}</text>
  <text class="diagram-title" x="${C.x}" y="530" text-anchor="middle">${esc(L.vertex_c || "C")}</text>
  <circle class="marker-pulse" cx="${px}" cy="${py}" r="18" fill="#c45c26" fill-opacity="0.2"/>
  <circle cx="${px}" cy="${py}" r="9" fill="#c45c26"/>
  <circle cx="${px}" cy="${py}" r="3.5" fill="#fff"/>
</svg>`;
  }

  function renderIdentityWS(ws) {
    const had = (ws.had_to_be || []).map((r) =>
      typeof r === "string" ? r : r.label
    );
    const becoming = (ws.becoming || []).map((r) =>
      typeof r === "string" ? r : r.label
    );
    const hadChecks = had.map((label) =>
      `<li><label><input type="checkbox" checked> ${esc(label)}</label></li>`
    ).join("");
    const becChecks = becoming.map((label) =>
      `<li><label><input type="checkbox" checked> ${esc(label)}</label></li>`
    ).join("");
    return `
<h3>Who I Had to Be vs Who I'm Becoming</h3>
<div class="grid-2">
  <div class="ws-block sand">
    <strong>Who I Had to Be</strong>
    <ul class="check-list">${hadChecks || "<li><label><input type='checkbox'> The Overthinker</label></li>"}</ul>
    <label>I had to
      <input type="text" value="${escAttr(ws.had_to_line_a || "")}">
    </label>
    <label>so I wouldn't feel
      <input type="text" value="${escAttr(ws.had_to_line_b || "")}">
    </label>
  </div>
  <div class="ws-block mint">
    <strong>Who I'm Becoming</strong>
    <ul class="check-list">${becChecks || "<li><label><input type='checkbox'> The Boundary-Setter</label></li>"}</ul>
    <label>Now I choose to
      <input type="text" value="${escAttr(ws.becoming_line_a || "")}">
    </label>
    <label>because I deserve
      <input type="text" value="${escAttr(ws.becoming_line_b || "")}">
    </label>
  </div>
</div>
<label>What I'm letting go of
  <textarea rows="3">${esc(ws.letting_go || "")}</textarea>
</label>
<label>What I'm reclaiming
  <textarea rows="3">${esc(ws.reclaiming || "")}</textarea>
</label>
<label>Anchor statement
  <textarea rows="2">${esc(ws.anchor || "")}</textarea>
</label>`;
  }

  function renderForgivenessWS(ws) {
    return `
<h3>Forgiving Yourself</h3>
<div class="grid-2">
  <div class="ws-block sage">
    <label>The mistake
      <textarea rows="4">${esc(ws.mistake || "")}</textarea>
    </label>
  </div>
  <div class="ws-block mint">
    <label>Emotions that come up
      <textarea rows="4">${esc(ws.emotions || "")}</textarea>
    </label>
  </div>
  <div class="ws-block sand" style="grid-column: 1 / -1">
    <label>What I'd say to a friend — said to myself
      <textarea rows="3">${esc(ws.compassion || "")}</textarea>
    </label>
  </div>
  <div class="ws-block peach">
    <label>Three affirmations
      <textarea rows="4">${esc(ws.affirmations || "")}</textarea>
    </label>
  </div>
  <div class="ws-block sage">
    <label>Visualization — letting go
      <textarea rows="4">${esc(ws.visualization || "")}</textarea>
    </label>
  </div>
</div>`;
  }

  function renderDistortionsWS(ws) {
    const rows = ws.distortions || [];
    if (!rows.length) return `<h3>Cognitive Distortions</h3><p>No rows returned.</p>`;
    return `
<h3>Cognitive Distortions</h3>
<p class="dist-meta">Spot the trap in your own wording, then challenge it. All fields editable.</p>
${rows.map((r) => `
  <article class="dist-row">
    <div class="dist-head">${esc(r.name || r.id)}</div>
    <div class="dist-body">
      <p class="dist-meta"><strong>Description:</strong> ${esc(r.description || "")}</p>
      <p class="dist-meta"><strong>Classic example:</strong> ${esc(r.example || "")}</p>
      <p class="dist-meta"><strong>Challenge:</strong> ${esc(r.challenge || "")}</p>
      <label>My example
        <textarea rows="2">${esc(r.my_example || "")}</textarea>
      </label>
      <label>My challenge
        <textarea rows="2">${esc(r.my_challenge || r.challenge || "")}</textarea>
      </label>
    </div>
  </article>`).join("")}`;
  }

  function loadLibrary() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }
  function saveLibrary(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 40)));
    } catch { /* ignore */ }
  }

  function setStatus(msg, loading = false) {
    statusEl.textContent = msg;
    statusEl.classList.toggle("loading", loading);
  }
  function show(el) { el.hidden = false; }
  function hide(el) { el.hidden = true; }
  function clamp01(n) {
    const v = Number(n);
    if (Number.isNaN(v)) return 0.5;
    return Math.max(0, Math.min(1, v));
  }
  function esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escAttr(str) { return esc(str).replace(/'/g, "&#39;"); }
})();
