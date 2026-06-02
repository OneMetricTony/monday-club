/* Monday Club — session blocks.
   Renders a list of collapsible, highlighted "session" boxes that look like a
   past class. Each box may contain: a question prompt, a code/terminal window,
   a whiteboard, and a math-notes editor. Collapsed by default except the first;
   each fades in on scroll.
   Requires whiteboard.js. Boxes that use notes also need notes.js + MathLive. */
window.MondaySessions = function (root, items, opts) {
  opts = opts || {};
  root = typeof root === "string" ? document.getElementById(root) : root;
  if (!root || !items) return;
  var PREFIX = opts.keyPrefix || (location.pathname + "::");

  if (!document.getElementById("mc-sesh-style")) {
    var st = document.createElement("style");
    st.id = "mc-sesh-style";
    st.textContent =
      ".wb-reveal{opacity:0;transform:translateY(14px);transition:opacity .55s ease, transform .55s ease;margin:2px 0 22px}" +
      ".wb-reveal.wb-in{opacity:1;transform:none}" +
      ".sesh{background:linear-gradient(180deg, rgba(108,140,255,.12), rgba(55,224,200,.05));" +
        "border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:14px;padding:4px 14px 14px}" +
      ".sesh>summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:8px;padding:11px 2px;font-weight:700}" +
      ".sesh>summary::-webkit-details-marker{display:none}" +
      ".sesh>summary .chev{transition:transform .2s;color:var(--soft);font-size:12px}" +
      ".sesh[open]>summary .chev{transform:rotate(90deg)}" +
      ".sesh>summary .when{margin-left:auto;font-weight:600;color:var(--soft);font-size:12.5px}" +
      ".sesh-q{background:#0e1330;border:1px solid var(--line);border-left:3px solid var(--accent2);" +
        "border-radius:0 10px 10px 0;padding:10px 14px;margin:8px 0;font-size:1rem}" +
      ".wb-row{display:flex;gap:14px;align-items:stretch}" +
      ".wb-row .wb-cell{flex:1 1 58%;min-width:0}" +
      ".wb-row .wb-cell.solo{flex:1 1 100%}" +
      ".wb-row .notes-cell{flex:1 1 42%;min-width:0;display:flex}" +
      "@media(max-width:760px){.wb-row{flex-direction:column}}" +
      ".sesh-term{background:#0a0d1f;border:1px solid var(--line);border-radius:12px;overflow:hidden;margin:10px 0}" +
      ".sesh-term-bar{display:flex;gap:8px;align-items:center;padding:8px 12px;background:#11152e;border-bottom:1px solid var(--line)}" +
      ".sesh-term-bar .d{width:11px;height:11px;border-radius:50%}" +
      ".sesh-term-bar .r{background:#ff5f57}.sesh-term-bar .y{background:#febc2e}.sesh-term-bar .g{background:#28c840}" +
      ".sesh-term-bar .t{margin-left:6px;color:var(--soft);font-size:12px;font-family:ui-monospace,monospace}" +
      ".sesh-term-code{margin:0;padding:12px 14px;color:#d7e0ff;font-family:ui-monospace,Menlo,Consolas,monospace;" +
        "font-size:13px;line-height:1.5;white-space:pre;overflow-x:auto}" +
      ".sesh-term-out{padding:8px 14px 12px;color:#8fed9f;font-family:ui-monospace,monospace;font-size:13px;" +
        "white-space:pre-wrap;border-top:1px dashed var(--line)}" +
      ".sesh-term-out b{color:var(--soft);font-weight:600}";
    document.head.appendChild(st);
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function codeWindow(c) {
    return '<div class="sesh-term">' +
      '<div class="sesh-term-bar"><span class="d r"></span><span class="d y"></span><span class="d g"></span>' +
        '<span class="t">' + esc(c.ttl || "python3 — session") + '</span></div>' +
      '<pre class="sesh-term-code">' + esc(c.src || "") + '</pre>' +
      (c.out ? '<div class="sesh-term-out"><b>output:</b>\n' + esc(c.out) + '</div>' : '') +
    '</div>';
  }

  var io = ("IntersectionObserver" in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("wb-in"); io.unobserve(e.target); } });
  }, { threshold: 0.10 }) : null;

  items.forEach(function (item, i) {
    var uid = "mcs" + (window.__mcsCount = (window.__mcsCount || 0) + 1);
    var hasNotes = !!item.notes;
    var d = document.createElement("details");
    d.className = "sesh wb-reveal";
    d.open = (i === 0);
    var html =
      '<summary><span class="chev">▶</span> ' + (item.title || ("Item " + (i + 1))) +
        ((i === 0 && opts.firstTime) ? '<span class="when">🕗 Saved yesterday · ' + esc(opts.firstTime) + '</span>' : '') +
      '</summary>';
    if (item.q) html += '<p class="sesh-q">' + item.q + '</p>';
    if (item.code) html += codeWindow(item.code);
    html += '<div class="wb-row">' +
      '<div class="wb-cell' + (hasNotes ? '' : ' solo') + '" id="' + uid + '-wb"></div>' +
      (hasNotes ? '<div class="notes-cell" id="' + uid + '-nt"></div>' : '') +
    '</div>';
    d.innerHTML = html;
    root.appendChild(d);

    MondayWhiteboard(uid + "-wb", { key: PREFIX + "wb" + i, h: 430 });
    if (hasNotes && window.MondayNotes) MondayNotes(uid + "-nt", { key: PREFIX + "notes" + i, preload: item.notes });
    if (io) io.observe(d); else d.classList.add("wb-in");
  });
};
