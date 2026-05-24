# WebSocket Layer

The WebSocket layer is the collector's **event streaming transport**. It pushes metrics snapshots to every connected dashboard client in real time.

---

## Files

| File | Role |
|------|------|
| `server.ts` | WebSocket server and `broadcast()` helper |
| `broadcaster.ts` | *(planned)* abstraction over fan-out logic |
| `events.ts` | *(planned)* typed event envelopes and schemas |

---

## `server.ts`

### Server

```typescript
const wss = new WebSocketServer({ port: 4000 });
```

Listens on **port 4000** by default. No authentication — intended for localhost-only use during development.

### `broadcast(data: unknown)`

Serializes `data` to JSON and sends it to every client whose connection is `OPEN`:

```typescript
export function broadcast(data: unknown) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
}
```

Called once per second from `src/index.ts` with the output of `buildSnapshot()`.

---

## Event protocol

### Transport

| Property | Value |
|----------|-------|
| URL | `ws://localhost:4000` |
| Format | JSON text frames |
| Direction | Server → client (push only) |
| Frequency | ~1 message per second |

### Message shape

Each message is a **MetricsSnapshot** — see [Collector README](../../README.md#metricssnapshot-streamed-to-clients).

There is no handshake, subscription message, or heartbeat. Clients connect and immediately begin receiving snapshots.

---

## Client integration (dashboard)

Minimal browser client:

```typescript
const ws = new WebSocket("ws://localhost:4000");

ws.onopen = () => console.log("connected");
ws.onmessage = (event) => {
  const snapshot = JSON.parse(event.data);
  // update UI state
};
ws.onclose = () => console.log("disconnected");
ws.onerror = (err) => console.error(err);
```

In the Electron dashboard, this runs inside the Next.js renderer (browser context).

---

## Connection lifecycle

```
Dashboard                Collector
    │                        │
    │──── WebSocket connect ─►│
    │                        │
    │◄─── snapshot (1/s) ────│
    │◄─── snapshot (1/s) ────│
    │                        │
    │──── close / crash ─────►│
```

- Multiple clients are supported — useful for debugging alongside the Electron app
- Disconnected clients are skipped during broadcast (no queue / replay)
- Reconnect logic is the client's responsibility

---

## Planned improvements

Documented in `events.ts` and `broadcaster.ts` stubs:

- **Typed event envelopes** — `{ type: "snapshot", payload: ... }` for future event kinds
- **Zod validation** — validate snapshot shape before broadcast
- **Connection events** — log client connect/disconnect via Pino
- **Configurable port** — via environment variable

---

## Security note

The WebSocket server binds to all interfaces by default (`ws` default). For production, restrict to `127.0.0.1` and avoid exposing port 4000 on untrusted networks.
