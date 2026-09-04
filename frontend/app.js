(() => {
  const journal = document.getElementById("journal");
  const analyzeBtn = document.getElementById("analyze-btn");
  const statusEl = document.getElementById("status");
  const crisisPanel = document.getElementById("crisis-panel");
  const crisisMessage = document.getElementById("crisis-message");
  const crisisResources = document.getElementById("crisis-resources");
  const resultPanel = document.getElementById("result-panel");
  const diagramEl = document.getElementById("diagram");
  const annotationsEl = document.getElementById("annotations");
  const citationEl = document.getElementById("citation");
  const frameworkTitle = document.getElementById("framework-title");
  const exerciseTitle = document.getElementById("exercise-title");
  const exerciseRationale = document.getElementById("exercise-rationale");
  const exerciseForm = document.getElementById("exercise-form");

  const API_BASE = window.PATTERN_MIRROR_API || "";

  analyzeBtn.addEventListener("click", onAnalyze);
  journal.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      onAnalyze();
    }
  });

  async function onAnalyze() {
    const text = journal.value.trim();
    if (!text) {
      setStatus("Paste at least one journal entry first.");
      journal.focus();
      return;
    }

    hide(crisisPanel);
    hide(resultPanel);
    analyzeBtn.disabled = true;
    setStatus("Mapping your patterns…", true);

    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || `Request failed (${res.status})`);
      }

      if (data.crisis_flag) {
        renderCrisis(data);
        setStatus("");
      } else {
        renderResult(data);
        setStatus("Done — scroll to see your map.");
        resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (err) {
      setStatus(err.message || "Something went wrong.");
    } finally {
      analyzeBtn.disabled = false;
    }
  }

  function renderCrisis(data) {
    crisisMessage.textContent =
      data.message ||
      "We paused the pattern analysis. Please use the resources below if you need support.";
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
        if (r.detail) {
          li.appendChild(document.createTextNode(` — ${r.detail}`));
        }
      } else {
        li.innerHTML = `<strong>${escapeHtml(r.name)}</strong>${
          r.detail ? ` — ${escapeHtml(r.detail)}` : ""
        }`;
      }
      crisisResources.appendChild(li);
    });
    show(crisisPanel);
    crisisPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderResult(data) {
    const fw = data.framework;
    frameworkTitle.textContent =
      fw.framework_type === "quadrant"
        ? "Your quadrant map"
        : "Your triangle map";
    citationEl.textContent = fw.source_citation || "";

    diagramEl.innerHTML =
      fw.framework_type === "quadrant"
        ? renderQuadrantSvg(fw)
        : renderTriangleSvg(fw);

    annotationsEl.innerHTML = "";
    (fw.annotations || []).forEach((a) => {
      const div = document.createElement("div");
      div.className = "annotation";
      div.innerHTML = `<blockquote>“${escapeHtml(a.quote)}”</blockquote><p>${escapeHtml(
        a.note
      )}</p>`;
      annotationsEl.appendChild(div);
    });

    const ex = data.exercise || {};
    exerciseTitle.textContent = ex.title || "Recommended exercise";
    exerciseRationale.textContent = ex.rationale || "";
    exerciseForm.innerHTML = ex.html_template || "<p>No exercise returned.</p>";

    show(resultPanel);
  }

  function renderQuadrantSvg(fw) {
    const L = fw.labels || {};
    const x = clamp01(fw.position?.x ?? 0.5);
    const y = clamp01(fw.position?.y ?? 0.5);
    // SVG: y increases downward; framework y=1 is top
    const px = 80 + x * 440;
    const py = 80 + (1 - y) * 440;

    return `
<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.12"/>
    </filter>
  </defs>
  <rect x="80" y="80" width="440" height="440" rx="8" fill="#fbfefc" stroke="#1a2a24" stroke-opacity="0.18"/>
  <line x1="300" y1="80" x2="300" y2="520" stroke="#1a2a24" stroke-opacity="0.18"/>
  <line x1="80" y1="300" x2="520" y2="300" stroke="#1a2a24" stroke-opacity="0.18"/>

  <text class="diagram-title" x="120" y="130" text-anchor="start">${esc(L.top_left || "")}</text>
  <text class="diagram-title" x="480" y="130" text-anchor="end">${esc(L.top_right || "")}</text>
  <text class="diagram-title" x="120" y="490" text-anchor="start">${esc(L.bottom_left || "")}</text>
  <text class="diagram-title" x="480" y="490" text-anchor="end">${esc(L.bottom_right || "")}</text>

  <text class="diagram-label" x="300" y="48" text-anchor="middle">${esc(L.y_high || "")}</text>
  <text class="diagram-label" x="300" y="560" text-anchor="middle">${esc(L.y_low || "")}</text>
  <text class="diagram-label" x="48" y="305" text-anchor="middle" transform="rotate(-90 48 305)">${esc(L.x_low || "")}</text>
  <text class="diagram-label" x="552" y="305" text-anchor="middle" transform="rotate(90 552 305)">${esc(L.x_high || "")}</text>

  <circle class="marker-pulse" cx="${px}" cy="${py}" r="18" fill="#c45c26" fill-opacity="0.2"/>
  <circle cx="${px}" cy="${py}" r="9" fill="#c45c26" filter="url(#soft)"/>
  <circle cx="${px}" cy="${py}" r="3.5" fill="#fff"/>
</svg>`;
  }

  function renderTriangleSvg(fw) {
    const L = fw.labels || {};
    const wa = clamp01(fw.position?.vertex_a ?? 0.34);
    const wb = clamp01(fw.position?.vertex_b ?? 0.33);
    const wc = clamp01(fw.position?.vertex_c ?? 0.33);
    const sum = wa + wb + wc || 1;
    const a = wa / sum;
    const b = wb / sum;
    const c = wc / sum;

    // Equilateral-ish triangle vertices
    const A = { x: 300, y: 90 }; // top = vertex_a
    const B = { x: 90, y: 480 }; // bottom-left = vertex_b
    const C = { x: 510, y: 480 }; // bottom-right = vertex_c
    // Barycentric: P = a*A + b*B + c*C
    const px = a * A.x + b * B.x + c * C.x;
    const py = a * A.y + b * B.y + c * C.y;

    return `
<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <filter id="soft2" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.12"/>
    </filter>
  </defs>
  <polygon points="${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}" fill="#fbfefc" stroke="#1a2a24" stroke-opacity="0.22" stroke-width="2"/>
  <line x1="${A.x}" y1="${A.y}" x2="${(B.x + C.x) / 2}" y2="${(B.y + C.y) / 2}" stroke="#1a2a24" stroke-opacity="0.08"/>
  <line x1="${B.x}" y1="${B.y}" x2="${(A.x + C.x) / 2}" y2="${(A.y + C.y) / 2}" stroke="#1a2a24" stroke-opacity="0.08"/>
  <line x1="${C.x}" y1="${C.y}" x2="${(A.x + B.x) / 2}" y2="${(A.y + B.y) / 2}" stroke="#1a2a24" stroke-opacity="0.08"/>

  <text class="diagram-title" x="${A.x}" y="58" text-anchor="middle">${esc(L.vertex_a || "A")}</text>
  <text class="diagram-title" x="${B.x}" y="530" text-anchor="middle">${esc(L.vertex_b || "B")}</text>
  <text class="diagram-title" x="${C.x}" y="530" text-anchor="middle">${esc(L.vertex_c || "C")}</text>

  <circle class="marker-pulse" cx="${px}" cy="${py}" r="18" fill="#c45c26" fill-opacity="0.2"/>
  <circle cx="${px}" cy="${py}" r="9" fill="#c45c26" filter="url(#soft2)"/>
  <circle cx="${px}" cy="${py}" r="3.5" fill="#fff"/>
</svg>`;
  }

  function setStatus(msg, loading = false) {
    statusEl.textContent = msg;
    statusEl.classList.toggle("loading", loading);
  }

  function show(el) {
    el.hidden = false;
  }
  function hide(el) {
    el.hidden = true;
  }

  function clamp01(n) {
    const v = Number(n);
    if (Number.isNaN(v)) return 0.5;
    return Math.max(0, Math.min(1, v));
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function esc(str) {
    return escapeHtml(str);
  }
})();
