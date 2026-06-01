/* Canvas wave animations for the physics textbook page. */
(function () {
  function loop(c, draw) {
    function size(){ if (c.width !== c.clientWidth) c.width = c.clientWidth; if (c.height !== c.clientHeight) c.height = c.clientHeight; }
    size();
    var ctx = c.getContext("2d");
    function f(ts){ size(); draw(ctx, c, ts / 1000); requestAnimationFrame(f); }
    requestAnimationFrame(f);
  }
  window.WAVES = {
    traveling: function (id) {
      var c = document.getElementById(id); if (!c) return;
      loop(c, function (ctx, c, t) {
        var W = c.width, H = c.height, mid = H / 2, A = H * 0.3, k = 2 * Math.PI / (W / 2), w = 3;
        ctx.clearRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(255,255,255,.08)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();
        ctx.strokeStyle = "#37e0c8"; ctx.lineWidth = 2.5; ctx.beginPath();
        for (var x = 0; x <= W; x++) { var y = mid + A * Math.sin(k * x - w * t); if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.stroke();
        // a marker dot riding the wave to show propagation
        var dx = (t * w / k) % W;
        ctx.fillStyle = "#fb7185"; ctx.beginPath(); ctx.arc(dx, mid + A * Math.sin(k * dx - w * t), 5, 0, 7); ctx.fill();
      });
    },
    standing: function (id) {
      var c = document.getElementById(id); if (!c) return;
      loop(c, function (ctx, c, t) {
        var W = c.width, H = c.height, mid = H / 2, A = H * 0.32, k = 2 * Math.PI / (W / 2), w = 3.2;
        ctx.clearRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(255,255,255,.08)"; ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();
        ctx.strokeStyle = "#6c8cff"; ctx.lineWidth = 2.5; ctx.beginPath();
        for (var x = 0; x <= W; x++) { var y = mid + 2 * A * Math.sin(k * x) * Math.cos(w * t); if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.stroke();
        // nodes (sin kx = 0) marked
        ctx.fillStyle = "#fbbf24";
        for (var n = 0; n * (Math.PI / k) <= W; n++) { var nx = n * Math.PI / k; ctx.beginPath(); ctx.arc(nx, mid, 4, 0, 7); ctx.fill(); }
      });
    },
    doppler: function (id) {
      var c = document.getElementById(id); if (!c) return;
      var fronts = [], last = -1;
      loop(c, function (ctx, c, t) {
        var W = c.width, H = c.height, mid = H / 2, vs = W * 0.085, cw = W * 0.20, period = 0.55;
        var sx = (t * vs) % (W * 1.4) - W * 0.2;
        if (Math.floor(t / period) !== last) { last = Math.floor(t / period); fronts.push({ x: sx, t: t }); }
        ctx.clearRect(0, 0, W, H);
        ctx.lineWidth = 1.6;
        fronts.forEach(function (fr) {
          var r = cw * (t - fr.t);
          ctx.strokeStyle = "#6c8cff"; ctx.globalAlpha = Math.max(0, 1 - r / (W * 0.85));
          ctx.beginPath(); ctx.arc(fr.x, mid, r, 0, 7); ctx.stroke();
        });
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#fb7185"; ctx.beginPath(); ctx.arc(sx, mid, 6, 0, 7); ctx.fill();
        fronts = fronts.filter(function (fr) { return cw * (t - fr.t) < W * 1.05; });
      });
    }
  };
})();
