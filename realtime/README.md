# Live whiteboard sync (Deno Deploy relay)

The Monday Club whiteboard can sync in real time between two browsers (e.g. tutor
+ student) using a tiny WebSocket relay running on [Deno Deploy](https://deno.com/deploy)
(free tier). It's **opt-in**: with no relay URL set, the board behaves exactly as
before — fully offline, no network calls.

## Deploy the relay (one-time, ~2 minutes)

1. Create a free Deno Deploy account at <https://dash.deno.com>.
2. Click **New Playground** (or **New Project → Playground**).
3. Delete the sample code and paste the entire contents of [`wb-relay.ts`](./wb-relay.ts).
4. Click **Save & Deploy**.
5. Copy the public URL it gives you, e.g. `https://my-relay-123.deno.dev`
   (visiting it in a browser should show `wb-relay ok`).

## Enable it in the site

Open `whiteboard.js` and set the global constant near the top to the **`wss://`**
form of your deploy URL:

```js
var WB_RELAY_URL = "wss://my-relay-123.deno.dev";
```

That single constant turns on live sync for every board on the site — no page
files need editing. To disable again, set it back to `""`.

Per-board overrides are also supported via options:

```js
MondayWhiteboard("board", { key: "chloe-6-7", relayUrl: "wss://...", room: "custom" });
```

## How rooms work

- Each board joins a **room** named after its board `key` (e.g. `mc_wb_chloe-6-7`).
- The relay just rebroadcasts every message to the *other* sockets in the same
  room. It keeps no drawing state.
- **Two browsers open on the same board (same key) draw live to each other** —
  you see the remote pen forming the line in real time, and the board border
  glows while the other person is drawing.

## Protocol (client ↔ relay ↔ client)

Plain JSON strings, relayed verbatim:

- `{t:"seg", color, width, pts:[[x,y],...], end:bool}` — a streamed stroke
  segment. `pts` are in canvas backing-store space (1200×700 by default), so they
  map correctly regardless of each side's CSS display size. `end:true` marks the
  end of a stroke (triggers a save on the receiver).
- `{t:"clear"}` — the board was cleared.

## Notes

- If the relay is unreachable, the client retries with exponential backoff and
  the board keeps working offline. No errors are shown to the user.
- Remote strokes render for the session and are saved to `localStorage` on the
  receiving side when a stroke ends, so the combined drawing persists locally.
