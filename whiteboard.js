/* Monday Club — persistent whiteboard.
   Draws on a canvas and auto-saves to localStorage, so the board survives page
   reloads and comes back in future sessions (per board key). */

/* LIVE SYNC (optional, opt-in):
   Paste your Deno Deploy wss:// URL below to enable real-time 2-user sync.
   Leave it as "" to disable — the board then behaves exactly as before, fully
   offline, no network calls, no console errors. See realtime/README.md. */
var WB_RELAY_URL = "wss://balmy-grasshopper-65.7humingqian.deno.net/";

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
      ".mc-wb.mc-wb-big{position:fixed;inset:3vh 3vw;z-index:99990;margin:0;overflow:auto;box-shadow:0 0 0 100vmax rgba(5,7,20,.72)}" +
      ".mc-wb.mc-wb-live{border-color:var(--accent,#6ea8fe);box-shadow:0 0 0 2px var(--accent,#6ea8fe),0 0 18px 2px rgba(110,168,254,.55);transition:box-shadow .25s ease,border-color .25s ease}" +
      ".mc-wb-livedot{display:none;width:8px;height:8px;border-radius:50%;background:#22c55e;margin-left:8px;box-shadow:0 0 6px #22c55e;animation:mc-wb-pulse 1s infinite}" +
      ".mc-wb.mc-wb-live .mc-wb-livedot{display:inline-block}" +
      "@keyframes mc-wb-pulse{0%,100%{opacity:1}50%{opacity:.35}}";
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
        '<span class="mc-wb-livedot" title="live: drawing now"></span>' +
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

  // ---- live-sync outgoing stroke buffer ----
  // Buffer points in canvas-space (W x H backing store) so they map correctly on
  // the remote side regardless of CSS display size. Flush throttled while drawing.
  var segPts = [], segColor = color, segWidth = 3.5, lastFlush = 0;
  function curWidth() { return erasing ? 34 : 3.5; }
  function curColor() { return erasing ? "#fff" : color; }
  function flushSeg(end) {
    if (!net.on()) { segPts = []; return; }
    if (!end && segPts.length < 2) return;
    if (segPts.length) {
      net.send({ t: "seg", color: segColor, width: segWidth, pts: segPts, end: !!end });
      // keep the last point so the next batch joins up seamlessly
      segPts = end ? [] : [segPts[segPts.length - 1]];
    } else if (end) {
      segPts = [];
    }
    lastFlush = Date.now();
  }

  function start(e) {
    drawing = true; var p = pos(e); lastX = p.x; lastY = p.y; e.preventDefault();
    segColor = curColor(); segWidth = curWidth(); segPts = [[p.x, p.y]]; lastFlush = Date.now();
  }
  function move(e) {
    if (!drawing) return;
    var p = pos(e);
    ctx.strokeStyle = curColor();
    ctx.lineWidth = curWidth();
    ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke();
    lastX = p.x; lastY = p.y; e.preventDefault();
    segPts.push([p.x, p.y]);
    // flush every few points or ~40ms so the remote sees the line forming live
    if (segPts.length >= 4 || (Date.now() - lastFlush) >= 40) flushSeg(false);
  }
  function end() { if (!drawing) return; drawing = false; flushSeg(true); save(); }

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
    net.send({ t: "clear" });
    note.textContent = "cleared";
    setTimeout(function () { note.textContent = "saved automatically"; }, 1200);
  };

  var wbEl = root.querySelector(".mc-wb");
  var expandBtn = root.querySelector('[data-tool="expand"]');
  expandBtn.onclick = function () {
    var big = wbEl.classList.toggle("mc-wb-big");
    expandBtn.textContent = big ? "✕ Close" : "⤢ Expand";
  };

  // ---------------------------------------------------------------------------
  // LIVE SYNC — WebSocket relay client (opt-in, graceful offline degrade).
  // Each board's `room` defaults to its localStorage KEY, so the tutor and the
  // student on the SAME board (same key) join the same room and draw live to
  // each other. If the relay URL is empty or unreachable, everything still works
  // offline; no errors surface to the user.
  // ---------------------------------------------------------------------------
  var net = (function () {
    var url = (opts.relayUrl != null ? opts.relayUrl : WB_RELAY_URL) || "";
    var room = opts.room || KEY;
    var ws = null, closed = false, backoff = 800, liveTimer = null;

    function open() { return ws && ws.readyState === 1; }

    function setLive() {
      wbEl.classList.add("mc-wb-live");
      if (liveTimer) clearTimeout(liveTimer);
      liveTimer = setTimeout(function () { wbEl.classList.remove("mc-wb-live"); }, 600);
    }

    // draw an incoming remote polyline using the SENDER's colour/width.
    function drawSeg(m) {
      var pts = m.pts;
      if (!pts || pts.length < 1) return;
      ctx.save();
      ctx.strokeStyle = m.color || "#101418";
      ctx.lineWidth = m.width || 3.5;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      if (pts.length === 1) { ctx.lineTo(pts[0][0] + 0.01, pts[0][1] + 0.01); }
      ctx.stroke();
      ctx.restore();
    }

    function onMsg(ev) {
      var m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (!m || !m.t) return;
      setLive();
      if (m.t === "seg") { drawSeg(m); if (m.end) save(); }
      else if (m.t === "clear") { fillWhite(); try { localStorage.removeItem(KEY); } catch (e) {} }
    }

    function connect() {
      if (closed || !url) return;
      var full = url + (url.indexOf("?") >= 0 ? "&" : "?") + "room=" + encodeURIComponent(room);
      try { ws = new WebSocket(full); } catch (e) { schedule(); return; }
      ws.onopen = function () { backoff = 800; };
      ws.onmessage = onMsg;
      ws.onerror = function () { /* swallow; onclose handles reconnect */ };
      ws.onclose = function () { ws = null; schedule(); };
    }

    function schedule() {
      if (closed || !url) return;
      setTimeout(connect, backoff);
      backoff = Math.min(backoff * 2, 15000); // simple exponential backoff, capped
    }

    if (url) { try { connect(); } catch (e) {} }

    return {
      on: open,
      send: function (obj) {
        if (!open()) return;
        try { ws.send(JSON.stringify(obj)); } catch (e) {}
      }
    };
  })();
};
