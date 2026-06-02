/* Monday Club — math notes editor with live LaTeX preview (KaTeX).
   Type plain text plus $inline$ or $$display$$ math; the preview renders live.
   Auto-saves the source to localStorage so notes persist across sessions.
   Requires KaTeX + its auto-render extension to be loaded on the page. */
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
      ".mc-notes-in{width:100%;box-sizing:border-box;background:#0e1330;border:1px solid var(--line);" +
        "color:var(--ink);border-radius:10px;padding:10px 12px;font:inherit;font-size:14px;" +
        "min-height:84px;resize:vertical;outline:none}" +
      ".mc-notes-in:focus{border-color:var(--accent)}" +
      ".mc-notes-prev{margin-top:10px;background:#fff;color:#101418;border-radius:10px;padding:10px 12px;" +
        "min-height:60px;overflow:auto;flex:1;line-height:1.5;font-size:15px}" +
      ".mc-notes-prev:empty::before{content:'preview appears here';color:#9aa3b2;font-size:13px}";
    document.head.appendChild(st);
  }

  root.innerHTML =
    '<div class="mc-notes">' +
      '<div class="mc-notes-head"><span>📝 Math notes</span>' +
        '<span class="mc-notes-hint" id="mc-notes-status">$a^2+b^2$ for math</span></div>' +
      '<textarea class="mc-notes-in" placeholder="Leave math notes… use $...$ or $$...$$ for LaTeX"></textarea>' +
      '<div class="mc-notes-prev"></div>' +
    '</div>';

  var ta = root.querySelector(".mc-notes-in");
  var prev = root.querySelector(".mc-notes-prev");
  var status = root.querySelector("#mc-notes-status");

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function render() {
    prev.innerHTML = esc(ta.value).replace(/\n/g, "<br>");
    if (window.renderMathInElement) {
      try {
        renderMathInElement(prev, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false }
          ],
          throwOnError: false
        });
      } catch (e) {}
    }
  }

  try { ta.value = localStorage.getItem(KEY) || ""; } catch (e) {}
  render();
  // KaTeX may finish loading after first render — re-render once it's ready
  if (!window.renderMathInElement) window.addEventListener("load", render);

  var t = null;
  ta.addEventListener("input", function () {
    render();
    if (t) clearTimeout(t);
    t = setTimeout(function () {
      try { localStorage.setItem(KEY, ta.value); status.textContent = "saved ✓"; }
      catch (e) { status.textContent = "couldn't save"; }
      setTimeout(function () { status.textContent = "$a^2+b^2$ for math"; }, 1200);
    }, 300);
  });
};
