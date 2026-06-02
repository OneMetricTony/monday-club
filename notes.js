/* Monday Club — math notes editor (MathLive), single box.
   One editable <math-field> holding all the notes (multiple lines via \\),
   edited in place with the math keyboard. Smart mode lets words and math mix.
   Auto-saves the LaTeX to localStorage per key. Requires MathLive on the page. */
(function () {
  if (window.MathfieldElement) {
    try {
      MathfieldElement.fontsDirectory = "https://cdn.jsdelivr.net/npm/mathlive/dist/fonts";
      MathfieldElement.soundsDirectory = null;
    } catch (e) {}
  }
})();

window.MondayNotes = function (root, opts) {
  opts = opts || {};
  root = typeof root === "string" ? document.getElementById(root) : root;
  if (!root) return;
  var KEY = "mc_notes_" + (opts.key || location.pathname);

  if (!document.getElementById("mc-notes-style")) {
    var st = document.createElement("style");
    st.id = "mc-notes-style";
    st.textContent =
      ".mc-notes{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px;" +
        "height:100%;display:flex;flex-direction:column;min-width:0}" +
      ".mc-notes-head{font-size:12px;letter-spacing:.04em;color:var(--soft);font-weight:700;" +
        "margin-bottom:8px;display:flex;justify-content:space-between;gap:8px;align-items:baseline}" +
      ".mc-notes-hint{font-weight:400;opacity:.8}" +
      ".mc-notes-field{flex:1;display:block;width:100%;min-height:130px;background:#fff;color:#101418;" +
        "border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:18px}";
    document.head.appendChild(st);
  }

  root.innerHTML =
    '<div class="mc-notes">' +
      '<div class="mc-notes-head"><span>📝 Math notes</span>' +
        '<span class="mc-notes-hint mc-status">type words + math</span></div>' +
      '<math-field class="mc-notes-field"></math-field>' +
    '</div>';

  var mf = root.querySelector("math-field");
  var status = root.querySelector(".mc-status");
  try { mf.smartMode = true; } catch (e) { mf.setAttribute("smart-mode", "true"); }

  // load existing value (handles both the old per-line JSON-array format and a plain string)
  var initial = "";
  try {
    var raw = localStorage.getItem(KEY);
    if (raw != null && raw !== "") {
      if (raw.charAt(0) === "[") {
        try { var arr = JSON.parse(raw); initial = (Array.isArray(arr) ? arr : []).filter(Boolean).join(" \\\\ "); }
        catch (e) { initial = raw; }
      } else { initial = raw; }
    } else if (opts.preload && opts.preload.length) {
      initial = opts.preload.join(" \\\\ ");
    }
  } catch (e) {
    if (opts.preload && opts.preload.length) initial = opts.preload.join(" \\\\ ");
  }
  if (initial) { try { mf.value = initial; } catch (e) { mf.setAttribute("value", initial); } }

  var t = null;
  mf.addEventListener("input", function () {
    if (t) clearTimeout(t);
    t = setTimeout(function () {
      try { localStorage.setItem(KEY, mf.value); status.textContent = "saved ✓"; }
      catch (e) { status.textContent = "couldn't save"; }
      setTimeout(function () { status.textContent = "type words + math"; }, 1000);
    }, 300);
  });
};
