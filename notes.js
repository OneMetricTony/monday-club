/* Monday Club — in-place math notes editor (MathLive).
   Each note line is an editable <math-field>: type/edit the equation directly
   with the math keyboard (no source box). Lines auto-save as LaTeX to
   localStorage per question. Requires MathLive to be loaded on the page. */
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
      ".mc-notes-lines{display:flex;flex-direction:column;gap:8px;flex:1}" +
      ".mc-note-row{display:flex;gap:6px;align-items:stretch}" +
      ".mc-note-row math-field{flex:1;min-width:0;background:#fff;color:#101418;" +
        "border:1px solid var(--line);border-radius:10px;padding:6px 8px;font-size:18px}" +
      ".mc-note-del{flex:0 0 auto;background:#0e1330;border:1px solid var(--line);color:var(--soft);" +
        "border-radius:8px;width:30px;cursor:pointer;font:inherit}" +
      ".mc-note-del:hover{color:var(--bad);border-color:var(--bad)}" +
      ".mc-notes-add{margin-top:10px;align-self:flex-start;background:#0e1330;border:1px solid var(--line);" +
        "color:var(--ink);border-radius:10px;padding:8px 12px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}" +
      ".mc-notes-add:hover{border-color:var(--accent)}";
    document.head.appendChild(st);
  }

  root.innerHTML =
    '<div class="mc-notes">' +
      '<div class="mc-notes-head"><span>📝 Math notes</span>' +
        '<span class="mc-notes-hint mc-status">edit in place</span></div>' +
      '<div class="mc-notes-lines"></div>' +
      '<button class="mc-notes-add" type="button">+ line</button>' +
    '</div>';

  var linesEl = root.querySelector(".mc-notes-lines");
  var addBtn  = root.querySelector(".mc-notes-add");
  var status  = root.querySelector(".mc-status");
  var saveTimer = null;

  function save() {
    var vals = [];
    linesEl.querySelectorAll("math-field").forEach(function (mf) { vals.push(mf.value || ""); });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify(vals)); status.textContent = "saved ✓"; }
      catch (e) { status.textContent = "couldn't save"; }
      setTimeout(function () { status.textContent = "type words + math"; }, 1000);
    }, 300);
  }

  function addLine(latex) {
    var row = document.createElement("div");
    row.className = "mc-note-row";
    var mf = document.createElement("math-field");
    // smart mode lets you mix plain words and math in the same line
    try { mf.smartMode = true; } catch (e) { mf.setAttribute("smart-mode", "true"); }
    if (latex) { try { mf.value = latex; } catch (e) { mf.setAttribute("value", latex); } }
    mf.addEventListener("input", save);
    var del = document.createElement("button");
    del.className = "mc-note-del"; del.type = "button"; del.textContent = "×"; del.title = "remove line";
    del.onclick = function () { row.remove(); if (!linesEl.children.length) addLine(""); save(); };
    row.appendChild(mf);
    row.appendChild(del);
    linesEl.appendChild(row);
    return mf;
  }

  var saved = [];
  try { saved = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { saved = []; }
  if (!Array.isArray(saved) || !saved.length) saved = [""];
  saved.forEach(addLine);

  addBtn.onclick = function () { var mf = addLine(""); save(); if (mf && mf.focus) mf.focus(); };
};
