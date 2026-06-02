/* Monday Club — shared engine: multiple-choice quiz, fake terminal, notes download. */
(function () {
  var KEYS = ["A", "B", "C", "D", "E"];
  function stripTags(h){ return String(h).replace(/<[^>]*>/g, ""); }

  /* ---------------- multiple-choice quiz ----------------
     Each question silently allows up to 3 wrong tries; every wrong try shows a
     hint. A correct pick (within those tries) scores. After 3 misses the answer
     is revealed. The results page shows a performance graph + full answer key. */
  var MAX_TRIES = 3;
  var HINTS = [
    "🤔 Not that one — read the question again, slowly. What is it actually asking?",
    "🔎 Closer. Cross out the options you're sure are wrong, then choose from what's left."
  ];
  window.MondayQuiz = function (root, questions, opts) {
    opts = opts || {};
    root = typeof root === "string" ? document.getElementById(root) : root;
    var i = 0, score = 0, locked = false, wrong = 0;
    var results = questions.map(function(){ return null; }); // 'correct' | 'missed'

    function render(){
      var q = questions[i];
      locked = false; wrong = 0;
      var optsHtml = q.options.map(function (o, n) {
        return '<button class="opt" data-n="' + n + '"><span class="key">' + KEYS[n] + '</span><span>' + o + '</span></button>';
      }).join("");
      root.innerHTML =
        '<div class="qhud">' +
          '<span>Question <b>' + (i + 1) + '</b> / ' + questions.length + '</span>' +
          '<span class="bar"><div style="width:' + Math.round(i / questions.length * 100) + '%"></div></span>' +
          '<span class="score">Score <b>' + score + '</b></span>' +
        '</div>' +
        '<div class="qcard">' +
          '<div class="qtopic">' + (q.topic || "") + '</div>' +
          '<div class="qtext">' + q.q + '</div>' +
          (q.code ? '<pre>' + q.code + '</pre>' : '') +
          '<div class="opts">' + optsHtml + '</div>' +
          (opts.claudeHelp ? '<div class="qclaude"><a class="btn ghost claude-btn" target="_blank" rel="noopener" href="https://claude.ai/new?q=' +
            encodeURIComponent("I'm working on a physics question and want a HINT, not the full answer. Question: " + stripTags(q.q) + "  Options: " + q.options.join(" | ")) +
            '">🤖 Claude help</a></div>' : '') +
          '<div class="explain"></div>' +
          '<div class="qnav"><button class="btn next" disabled>' + (i === questions.length - 1 ? "See results" : "Next question") + '</button></div>' +
        '</div>';

      var explain = root.querySelector(".explain");
      var nextBtn = root.querySelector(".next");

      function reveal(outcome){
        locked = true;
        results[i] = outcome;
        root.querySelectorAll(".opt").forEach(function (x, xn) {
          x.setAttribute("disabled", "");
          if (xn === q.answer) x.classList.add("correct");
        });
        explain.className = "explain show";
        explain.innerHTML = (outcome === "correct" ? "✅ " : "❌ Answer revealed. ") + (q.explain || "");
        root.querySelector(".score b").textContent = score;
        nextBtn.removeAttribute("disabled");
      }

      root.querySelectorAll(".opt").forEach(function (b) {
        b.onclick = function () {
          if (locked || b.hasAttribute("disabled")) return;
          var n = +b.dataset.n;
          if (n === q.answer) { score++; b.classList.add("correct"); reveal("correct"); return; }
          // wrong
          b.classList.add("wrong"); b.setAttribute("disabled", "");
          wrong++;
          if (wrong >= MAX_TRIES) { reveal("missed"); }
          else {
            explain.className = "explain show hint";
            explain.innerHTML = HINTS[wrong - 1] || HINTS[HINTS.length - 1];
          }
        };
      });
      nextBtn.onclick = function () {
        if (!locked) return;
        if (i < questions.length - 1) { i++; render(); window.scrollTo({top:0,behavior:"smooth"}); }
        else { results_page(); }
      };
    }

    function results_page(){
      var pct = Math.round(score / questions.length * 100);
      var msg = pct >= 85 ? "Outstanding. You actually know this." :
                pct >= 65 ? "Solid work — review the misses and you've got it." :
                pct >= 40 ? "Good start. Worth another lap." :
                            "No worries — run it again, it sticks fast.";
      var missed = questions.length - score;
      var gpct = questions.length ? (score / questions.length * 100) : 0;
      // performance graph: stacked bar
      var graph =
        '<svg viewBox="0 0 100 12" preserveAspectRatio="none" style="width:100%;height:26px;margin:14px 0;border-radius:8px;overflow:hidden">' +
          '<rect x="0" y="0" width="100" height="12" fill="#fb7185"></rect>' +
          '<rect x="0" y="0" width="' + gpct.toFixed(1) + '" height="12" fill="#34d399"></rect>' +
        '</svg>' +
        '<p class="muted" style="margin:-4px 0 0">✅ ' + score + ' correct &nbsp;·&nbsp; ❌ ' + missed + ' missed</p>';

      // full answer key
      var key = questions.map(function (q, n) {
        var badge = results[n] === "correct" ? '<span class="badge ok">✓</span>'
                  : results[n] === "missed"  ? '<span class="badge no">✗</span>'
                  : '<span class="badge sk">–</span>';
        var correctText = q.options[q.answer];
        return '<div class="akitem">' +
            '<div class="akhead">' + badge + '<span class="aktopic">' + (q.topic || ("Q" + (n + 1))) + '</span></div>' +
            '<div class="akq">' + q.q + '</div>' +
            '<div class="akans"><b>' + KEYS[q.answer] + '.</b> ' + correctText + '</div>' +
            (q.explain ? '<div class="akwhy">' + q.explain + '</div>' : '') +
          '</div>';
      }).join("");

      root.innerHTML =
        '<div class="result">' +
          '<div class="big">' + score + ' / ' + questions.length + '</div>' +
          '<p>' + pct + '% &middot; ' + msg + '</p>' +
          graph +
          '<div class="qnav" style="justify-content:center">' +
            '<button class="btn restart">Try again</button>' +
            (opts.doneHtml ? opts.doneHtml : '') +
          '</div>' +
        '</div>' +
        '<h2 style="margin-top:26px">📋 Answer key</h2>' +
        '<div class="akey">' + key + '</div>';

      var r = root.querySelector(".restart");
      if (r) r.onclick = function () { i = 0; score = 0; results = questions.map(function(){ return null; }); render(); window.scrollTo({top:0,behavior:"smooth"}); };
      if (window.MathJax && window.MathJax.typesetPromise) window.MathJax.typesetPromise([root]).catch(function(){});
      if (opts.onDone) opts.onDone(score, questions.length, root);
    }

    render();
  };

  /* ---------------- fake terminal ---------------- */
  window.MondayTerminal = function (root, cfg) {
    cfg = cfg || {};
    root = typeof root === "string" ? document.getElementById(root) : root;
    var lang = cfg.lang || "java";
    var prompt = (lang === "python" ? "py" : "java") + " $";
    root.innerHTML =
      '<div class="term">' +
        '<div class="term-bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>' +
          '<span class="ttl">' + (lang === "python" ? "python3 — playground" : "java — playground") + '</span></div>' +
        '<div class="term-body" id="termBody"></div>' +
        '<div class="term-input-row"><span class="prompt">' + prompt + '</span>' +
          '<input class="term-input" id="termIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="type a command… (try: help)"></div>' +
      '</div>';
    var body = root.querySelector("#termBody");
    var input = root.querySelector("#termIn");

    function print(txt, cls){
      var d = document.createElement("div");
      d.className = "term-line" + (cls ? " " + cls : "");
      d.textContent = txt;
      body.appendChild(d); body.scrollTop = body.scrollHeight;
    }
    function printEcho(cmd){ print(prompt + " " + cmd, "in"); }

    var sample = cfg.sample || {
      code: "// nothing loaded — finish a quiz first!",
      out: ""
    };

    var COMMANDS = {
      help: function(){
        print("commands:");
        print("  help            show this");
        print("  run             run today's sample program");
        print("  code            show the sample source");
        print("  hint            a little nudge");
        print("  joke            programmer joke");
        print("  clear           clear the screen");
        print("  whoami          who's the legend at the keyboard");
      },
      run: function(){
        if (!sample.out){ print("(no program loaded yet)"); return; }
        print(sample.out);
      },
      code: function(){ print(sample.code); },
      clear: function(){ body.innerHTML = ""; },
      whoami: function(){ print(cfg.who || "a future software engineer 😎"); },
      hint: function(){ print(cfg.hint || "read the question twice. the answer is usually hiding in the wording."); },
      joke: function(){
        var jokes = [
          "Why do Java devs wear glasses? Because they don't C#.",
          "There are 10 kinds of people: those who know binary and those who don't.",
          "A SQL query walks into a bar, goes up to two tables and asks: 'mind if I join you?'",
          "I'd tell you a UDP joke but you might not get it.",
          "!false — it's funny because it's true."
        ];
        print(jokes[Math.floor(Math.random() * jokes.length)]);
      }
    };

    print(lang === "python" ? "Python 3 playground. Type 'help'." : "Java playground. Type 'help'.");

    input.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      var raw = input.value.trim();
      input.value = "";
      if (!raw) return;
      printEcho(raw);
      var cmd = raw.split(/\s+/)[0].toLowerCase();
      if (COMMANDS[cmd]) COMMANDS[cmd]();
      else if (cmd === "ls") print("today.txt  notes.html  victory.lap");
      else if (cmd === "exit") print("nice try — class isn't over yet 🙂");
      else print("command not found: " + cmd + "   (try 'help')");
    });
    root.querySelector(".term").addEventListener("click", function(){ input.focus(); });
  };

  /* ---------------- challenge problems (answer + tiered hints) ----------------
     Up to 10 attempts per problem; each wrong try (or a tap of "Need a hint?")
     reveals the next, MORE detailed hint. After 10 misses (or hints run out) the
     full worked solution + answer is shown. */
  window.MondayChallenge = function (root, problems, opts) {
    opts = opts || {};
    root = typeof root === "string" ? document.getElementById(root) : root;
    function norm(s){ return String(s).trim().toLowerCase().replace(/[\s,]/g, ""); }
    function tex(el){ if (window.MathJax && window.MathJax.typesetPromise) window.MathJax.typesetPromise([el]).catch(function(){}); }

    root.innerHTML = problems.map(function (p, idx) {
      return '<div class="chal" data-i="' + idx + '">' +
        '<div class="qtopic">' + (p.topic || "") + '</div>' +
        '<h3 class="title">' + (p.title || ("Problem " + (idx + 1))) + '</h3>' +
        '<div class="stem">' + p.statement + '</div>' +
        '<div class="chal-row">' +
          '<input class="chal-in" inputmode="text" placeholder="your answer">' +
          '<button class="btn chal-check">Check</button>' +
          '<button class="btn ghost chal-hint">Need a hint?</button>' +
        '</div>' +
        '<div class="chal-msg"></div>' +
        '<div class="hints"></div>' +
        '<div class="chal-sol"></div>' +
      '</div>';
    }).join("");
    tex(root);

    root.querySelectorAll(".chal").forEach(function (card) {
      var p = problems[+card.dataset.i];
      var hints = p.hints || [];
      var hintLevel = 0, mistakes = 0, done = false;
      var hintsEl = card.querySelector(".hints");
      var msg = card.querySelector(".chal-msg");
      var solEl = card.querySelector(".chal-sol");
      var input = card.querySelector(".chal-in");
      var checkBtn = card.querySelector(".chal-check");
      var hintBtn = card.querySelector(".chal-hint");

      function showHint(){
        if (hintLevel >= hints.length) return false;
        var h = document.createElement("div");
        h.className = "hint-item";
        h.innerHTML = "<b>Hint " + (hintLevel + 1) + ":</b> " + hints[hintLevel];
        hintsEl.appendChild(h); hintLevel++; tex(h);
        return true;
      }
      function revealSolution(){
        done = true;
        solEl.className = "chal-sol show";
        solEl.innerHTML = '<div class="lbl">Worked solution</div>' + (p.solution || "") +
          '<div class="ans">Answer: <b>' + p.answer + '</b></div>';
        tex(solEl);
        checkBtn.disabled = true; hintBtn.disabled = true; input.disabled = true;
      }
      checkBtn.onclick = function () {
        if (done) return;
        if (norm(input.value) === norm(p.answer)) {
          msg.className = "chal-msg ok"; msg.textContent = "✅ Correct! Nice."; card.classList.add("solved"); revealSolution();
        } else {
          mistakes++;
          msg.className = "chal-msg no";
          msg.textContent = "❌ Not yet (" + mistakes + "/10) — here's a more detailed hint.";
          var more = showHint();
          if (!more || mistakes >= 10) revealSolution();
        }
      };
      hintBtn.onclick = function () { if (done) return; if (!showHint()) revealSolution(); };
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") checkBtn.click(); });
    });
  };

  /* ---------------- light guidance chat ----------------
     In-page tutor gives escalating nudges (never the full answer). The two
     buttons open ChatGPT / Claude pre-filled with the typed question — no API
     key needed (a public static site can't safely hold one). */
  window.MondayChat = function (root, cfg) {
    cfg = cfg || {};
    root = typeof root === "string" ? document.getElementById(root) : root;
    root.innerHTML =
      '<div class="chat">' +
        '<div class="chat-log" id="chatLog"></div>' +
        '<div class="chat-row"><input class="chat-in" id="chatIn" placeholder="Where are you stuck?"><button class="btn chat-send">Send</button></div>' +
      '</div>';
    var log = root.querySelector("#chatLog");
    var input = root.querySelector("#chatIn");
    function add(who, txt, cls){ var d = document.createElement("div"); d.className = "chat-msg " + (cls || ""); d.innerHTML = "<b>" + who + ":</b> " + txt; log.appendChild(d); log.scrollTop = log.scrollHeight; }
    var tips = [
      "First name what you're counting: arrangements (order matters) or selections (order doesn't)?",
      "Order matters → permutations. Order doesn't → combinations C(n, k).",
      "Seeing 'at least one'? Count the total, then subtract the 'none' case.",
      "Repeated identical items? Divide by the factorial of each repeated group.",
      "Distributing identical items into groups? Stars & bars: C(n + k − 1, k − 1).",
      "Overlapping conditions (divisible by… or…)? Inclusion–exclusion: + singles − pairs + triples.",
      "Counting paths on a grid? It's just arranging the R and U moves.",
      "Try a tiny version of the problem first, then look for the pattern."
    ];
    var ti = 0;
    add("Tutor", "Hi " + (cfg.name || "there") + "! Tell me where you're stuck and I'll nudge you — I won't just hand over the answer.");
    function reply(q){ add("You", q, "me"); add("Tutor", tips[ti % tips.length]); ti++; }
    root.querySelector(".chat-send").onclick = function () { var v = input.value.trim(); if (!v) return; reply(v); input.value = ""; };
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") root.querySelector(".chat-send").click(); });
  };

  /* ---------------- notes download ---------------- */
  window.downloadNotes = function (filename, title, sections) {
    var body = sections.map(function (s) {
      return '<section><h2>' + s.h + '</h2>' + s.body + '</section>';
    }).join("\n");
    var html =
      '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + title + '</title><style>' +
      'body{font-family:-apple-system,Segoe UI,Roboto,system-ui,sans-serif;max-width:760px;margin:30px auto;padding:0 18px;line-height:1.55;color:#16203a}' +
      'h1{border-bottom:3px solid #6c8cff;padding-bottom:8px}h2{color:#3257d6;margin-top:1.6em}' +
      'code,pre{font-family:ui-monospace,Menlo,Consolas,monospace}' +
      'pre{background:#0f1226;color:#d7e0ff;padding:12px 14px;border-radius:10px;overflow-x:auto;font-size:13px}' +
      'code{background:#eef1ff;padding:1px 5px;border-radius:5px}ul{padding-left:20px}' +
      '.tip{background:#eef4ff;border-left:4px solid #6c8cff;padding:10px 14px;border-radius:0 8px 8px 0;margin:12px 0}' +
      'footer{margin-top:40px;color:#7d87a8;font-size:13px;border-top:1px solid #dde3f5;padding-top:12px}</style></head><body>' +
      '<h1>' + title + '</h1>' + body +
      '<footer>Monday Club &middot; keep this for review. You got this.</footer></body></html>';
    var blob = new Blob([html], {type: "text/html"});
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  };
})();
