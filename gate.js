/* Monday Club — simple client-side password gate.
   NOTE: this is a soft gate only. Static sites can't do real auth; the
   password lives in this file, so anyone who reads the source can see it.
   Good enough to keep casual visitors out, not real security. */
(function(){
  var KEY = "mc_gate_ok_v1";
  var PASS = "apples";

  // Already unlocked (persists across pages + visits on this browser)
  try { if (localStorage.getItem(KEY) === "1") return; } catch(e){}

  // Hide the page until unlocked (no content flash)
  var hideStyle = document.createElement("style");
  hideStyle.id = "mc-gate-hide";
  hideStyle.textContent =
    "body{visibility:hidden!important}" +
    "#mc-gate{visibility:visible!important}";
  (document.head || document.documentElement).appendChild(hideStyle);

  function build(){
    var o = document.createElement("div");
    o.id = "mc-gate";
    o.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;" +
      "justify-content:center;padding:24px;" +
      "background:radial-gradient(1200px 600px at 50% -10%,#21285a 0%,#0f1226 60%);" +
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,system-ui,sans-serif;color:#eef1ff";
    o.innerHTML =
      "<form id='mc-gate-form' style=\"width:100%;max-width:340px;text-align:center\">" +
        "<div style='font-size:42px;margin-bottom:6px'>🔒</div>" +
        "<h1 style='font-size:1.4rem;margin:.2em 0 .1em'>Monday Club</h1>" +
        "<p style='color:#9aa3d0;margin:0 0 18px'>Enter the password to continue.</p>" +
        "<input id='mc-gate-in' type='password' autocomplete='off' autofocus placeholder='Password' " +
          "style=\"width:100%;background:#0e1330;border:1.5px solid #2c3463;color:#eef1ff;" +
          "border-radius:12px;padding:13px 15px;font:inherit;font-size:1rem;outline:none\">" +
        "<div id='mc-gate-msg' style='color:#fb7185;font-size:.9rem;min-height:1.2em;margin:10px 0 4px'></div>" +
        "<button type='submit' style=\"width:100%;background:#6c8cff;color:#0b0f24;border:0;" +
          "border-radius:12px;padding:13px 20px;font:inherit;font-weight:700;cursor:pointer\">Enter →</button>" +
      "</form>";
    document.body.appendChild(o);

    var input = o.querySelector("#mc-gate-in");
    var msg   = o.querySelector("#mc-gate-msg");
    o.querySelector("#mc-gate-form").addEventListener("submit", function(ev){
      ev.preventDefault();
      if (input.value === PASS){
        try { localStorage.setItem(KEY, "1"); } catch(e){}
        o.remove();
        var hs = document.getElementById("mc-gate-hide");
        if (hs) hs.remove();
      } else {
        msg.textContent = "Wrong password — try again.";
        input.value = "";
        input.focus();
      }
    });
    input.focus();
  }

  if (document.body) build();
  else document.addEventListener("DOMContentLoaded", build);
})();
