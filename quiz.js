/* Monday Club — shared engine: multiple-choice quiz, fake terminal, notes download. */
(function () {
  var KEYS = ["A", "B", "C", "D", "E"];

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
