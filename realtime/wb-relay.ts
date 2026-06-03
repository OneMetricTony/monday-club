// wb-relay.ts — Monday Club whiteboard WebSocket relay (room-based broadcast).
//
// Deno Deploy Playground deploy steps:
//   1. Go to https://dash.deno.com and sign in (free account).
//   2. Click "New Playground" (or "New Project" -> Playground).
//   3. Delete the sample code and paste this whole file in.
//   4. Click "Save & Deploy". Deno Deploy runs `Deno.serve` automatically.
//   5. Copy the public URL it shows, e.g. https://your-name-123.deno.dev
//   6. In whiteboard.js set WB_RELAY_URL to the wss:// form, e.g.
//        var WB_RELAY_URL = "wss://your-name-123.deno.dev";
//
// No external dependencies. Each board = one "room"; the relay simply rebroadcasts
// every message to the OTHER open sockets in the same room. It stores no state.

const rooms = new Map<string, Set<WebSocket>>();

function join(room: string, ws: WebSocket) {
  let set = rooms.get(room);
  if (!set) { set = new Set(); rooms.set(room, set); }
  set.add(ws);
}

function leave(room: string, ws: WebSocket) {
  const set = rooms.get(room);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) rooms.delete(room);
}

function broadcast(room: string, sender: WebSocket, data: string) {
  const set = rooms.get(room);
  if (!set) return;
  for (const peer of set) {
    if (peer === sender) continue;
    if (peer.readyState !== WebSocket.OPEN) continue;
    try { peer.send(data); } catch (_e) { /* ignore a dead socket */ }
  }
}

Deno.serve((req: Request) => {
  if (req.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return new Response("wb-relay ok", {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  }

  const room = new URL(req.url).searchParams.get("room") || "default";
  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = () => join(room, socket);
  socket.onmessage = (e) => {
    if (typeof e.data === "string") broadcast(room, socket, e.data);
  };
  socket.onclose = () => leave(room, socket);
  socket.onerror = () => { try { socket.close(); } catch (_e) {} leave(room, socket); };

  return response;
});
