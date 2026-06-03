/* Monday Club — persistent whiteboard.
   Draws on a canvas and auto-saves to localStorage, so the board survives page
   reloads and comes back in future sessions (per board key). */
window.MondayWhiteboard = function (root, opts) {
  opts = opts || {};
  root = typeof root === "string" ? document.getElementById(root) : root;
  if (!root) return;
  var KEY = "mc_wb_" + (opts.key || location.pathname);
  var W = opts.w || 1200, H = opts.h || 700; // backing-store resolution (display scales to fit)

  if (!document.getElementById("mc-wb-style")) {
    var st = document.createElement("style");
    st.id = "mc-wb-style";
    st.textContent =
      ".mc-wb{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px}" +
      ".mc-wb-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}" +
      ".mc-wb-sw{width:26px;height:26px;border-radius:50%;border:2px solid #0006;cursor:pointer;padding:0}" +
      ".mc-wb-sw.on{outline:2px solid var(--ink);outline-offset:2px}" +
      ".mc-wb-btn{background:#0e1330;border:1px solid var(--line);color:var(--ink);border-radius:10px;" +
        "padding:8px 12px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}" +
      ".mc-wb-btn.on{background:var(--accent);color:#0b0f24;border-color:var(--accent)}" +
      ".mc-wb-canvas{width:100%;height:auto;display:block;background:#fff;border-radius:10px;" +
        "border:1px solid var(--line);touch-action:none;cursor:crosshair}" +
      ".mc-wb-note{margin-left:auto;color:var(--soft);font-size:12px}" +
      ".mc-wb.mc-wb-big{position:fixed;inset:3vh 3vw;z-index:99990;margin:0;overflow:auto;box-shadow:0 0 0 100vmax rgba(5,7,20,.72)}";
    document.head.appendChild(st);
  }

  var COLORS = ["#101418", "#2563eb", "#dc2626", "#16a34a", "#d97706"];
  root.innerHTML =
    '<div class="mc-wb">' +
      '<div class="mc-wb-tools">' +
        COLORS.map(function (c, n) {
          return '<button class="mc-wb-sw' + (n === 0 ? ' on' : '') + '" data-c="' + c +
                 '" style="background:' + c + '" title="pen colour"></button>';
        }).join("") +
        '<button class="mc-wb-btn" data-tool="erase">Eraser</button>' +
        '<button class="mc-wb-btn" data-tool="clear">Clear</button>' +
        '<button class="mc-wb-btn" data-tool="expand">⤢ Expand</button>' +
        '<span class="mc-wb-note" id="mc-wb-note">saved automatically</span>' +
      '</div>' +
      '<canvas class="mc-wb-canvas" width="' + W + '" height="' + H + '"></canvas>' +
    '</div>';

  var canvas = root.querySelector(".mc-wb-canvas");
  var ctx = canvas.getContext("2d");
  var note = root.querySelector("#mc-wb-note");
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  var color = COLORS[0], erasing = false, drawing = false, lastX = 0, lastY = 0;

  function fillWhite() { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); }

  // restore any saved board
  (function load() {
    var data = null;
    try { data = localStorage.getItem(KEY); } catch (e) {}
    if (data) {
      var img = new Image();
      img.onload = function () { ctx.drawImage(img, 0, 0, W, H); };
      img.src = data;
    } else {
      fillWhite();
      // No saved board yet: draw an optional crude "solution-looking" sketch.
      // It is NOT saved to localStorage, so the first real stroke (which triggers
      // save()) overwrites it and the student's own work is never clobbered.
      if (typeof opts.sketch === "function") {
        try {
          ctx.save();
          opts.sketch(ctx, W, H);
          ctx.restore();
        } catch (e) {}
      }
    }
  })();

  var saveTimer = null;
  function save() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(KEY, canvas.toDataURL("image/png"));
        note.textContent = "saved ✓";
        setTimeout(function () { note.textContent = "saved automatically"; }, 1200);
      } catch (e) { note.textContent = "couldn't save (storage full)"; }
    }, 300);
  }

  function pos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }
  function start(e) { drawing = true; var p = pos(e); lastX = p.x; lastY = p.y; e.preventDefault(); }
  function move(e) {
    if (!drawing) return;
    var p = pos(e);
    ctx.strokeStyle = erasing ? "#fff" : color;
    ctx.lineWidth = erasing ? 34 : 3.5;
    ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke();
    lastX = p.x; lastY = p.y; e.preventDefault();
  }
  function end() { if (!drawing) return; drawing = false; save(); }

  canvas.addEventListener("pointerdown", start);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointerleave", end);

  // tools
  root.querySelectorAll(".mc-wb-sw").forEach(function (b) {
    b.onclick = function () {
      color = b.dataset.c; erasing = false;
      root.querySelectorAll(".mc-wb-sw").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      root.querySelector('[data-tool="erase"]').classList.remove("on");
    };
  });
  root.querySelector('[data-tool="erase"]').onclick = function () {
    erasing = !erasing; this.classList.toggle("on", erasing);
  };
  root.querySelector('[data-tool="clear"]').onclick = function () {
    if (!confirm("Clear the whiteboard? This can't be undone.")) return;
    fillWhite();
    try { localStorage.removeItem(KEY); } catch (e) {}
    note.textContent = "cleared";
    setTimeout(function () { note.textContent = "saved automatically"; }, 1200);
  };

  var wbEl = root.querySelector(".mc-wb");
  var expandBtn = root.querySelector('[data-tool="expand"]');
  expandBtn.onclick = function () {
    var big = wbEl.classList.toggle("mc-wb-big");
    expandBtn.textContent = big ? "✕ Close" : "⤢ Expand";
  };
};
