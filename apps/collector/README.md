# Collector

The collector is Local Watch's backend service. It captures live network traffic from your machine, aggregates metrics in one-second windows, and **streams snapshot events** to connected clients over WebSocket.

All processing stays local — nothing is sent to the cloud.

---

## Responsibilities

| Concern | Module | Description |
|---------|--------|-------------|
| Packet capture | `src/capture/` | Spawns `tshark` and reads stdout line-by-line |
| Parsing | `src/capture/parser.ts` | Converts CSV lines into typed `PacketEvent` objects |
| Aggregation | `src/aggregation/` | Rolls up per-second counters and top-N rankings |
| Streaming | `src/websocket/` | Broadcasts JSON snapshots to all WebSocket clients |
| Orchestration | `src/index.ts` | Wires capture → parse → aggregate → broadcast |

See module docs for detail:

- [Capture layer](./src/capture/capture.md)
- [Aggregation layer](./src/aggregation/aggregation.md)
- [WebSocket layer](./src/websocket/websocket.md)
- [Services layer](./src/services/services.md)

---

## Quick start

From the repo root:

```bash
pnpm dev:collector
```

Or from this directory:

```bash
pnpm dev
```

The collector starts:

1. A WebSocket server on **`ws://localhost:4000`**
2. A `tshark` subprocess listening on interface **`en0`** (macOS Wi-Fi default)

### Verify the stream

Open a browser console or Node REPL:

```javascript
const ws = new WebSocket("ws://localhost:4000");
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

You should receive a JSON snapshot every second.

### Permissions

Packet capture requires elevated privileges on most systems:

```bash
# macOS / Linux — run with sudo if capture fails
sudo pnpm dev:collector
```

Install [Wireshark](https://www.wireshark.org/download.html) so `tshark` is available on your `PATH`.

---

## Architecture

```
network interface (en0)
        │
        ▼
   ┌─────────┐     ┌─────────┐     ┌──────────────┐     ┌─────────────┐
   │ tshark  │ ──► │ parser  │ ──► │ metrics eng. │ ──► │  WebSocket  │
   │ (spawn) │     │         │     │  (1s window) │     │  broadcast  │
   └─────────┘     └─────────┘     └──────────────┘     └─────────────┘
                                           │
                                    reset every 1s
```

### Entry point

`src/index.ts` runs two concurrent loops:

1. **Packet loop** — each `tshark` line is parsed and fed into `processPacket()`
2. **Snapshot loop** — every 1000 ms, `buildSnapshot()` is broadcast and counters reset

---

## Event types

### `PacketEvent` (internal)

Parsed from each `tshark` CSV line before aggregation:

```typescript
interface PacketEvent {
  timestamp: number;   // epoch ms
  srcIp: string;
  dstIp: string;
  protocol: string;
  length: number;      // frame length in bytes
  srcPort?: number;
  dstPort?: number;
}
```

### `MetricsSnapshot` (streamed to clients)

Emitted once per second over WebSocket:

```typescript
interface MetricsSnapshot {
  timestamp: number;
  packetsPerSecond: number;
  bytesPerSecond: number;
  topProtocols: Array<{ key: string; value: number }>;
  topIps:       Array<{ key: string; value: number }>;
  topPorts:     Array<{ key: number; value: number }>;
}
```

Top-N lists are sorted by traffic volume and capped at 10 entries.

Example payload:

```json
{
  "timestamp": 1716585600123,
  "packetsPerSecond": 142,
  "bytesPerSecond": 98304,
  "topProtocols": [{ "key": "TCP", "value": 51200 }],
  "topIps": [{ "key": "192.168.1.42", "value": 40960 }],
  "topPorts": [{ "key": 443, "value": 87 }]
}
```

---

## Configuration

| Setting | Location | Default |
|---------|----------|---------|
| Network interface | `src/capture/tshark.ts` → `-i` flag | `en0` |
| WebSocket port | `src/websocket/server.ts` | `4000` |
| Snapshot interval | `src/index.ts` → `setInterval` | `1000` ms |
| Top-N limit | `src/aggregation/metricsEngine.ts` | `10` |

### Change the network interface

```bash
# macOS — list interfaces
networksetup -listallhardwareports

# Linux
ip link show
```

Update the `-i` argument in `src/capture/tshark.ts`.

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `ws` | WebSocket server |
| `pino` | Structured logging (reserved for production logging) |
| `zod` | Runtime schema validation (reserved for event validation) |
| `tsx` | TypeScript execution in dev |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `tshark: command not found` | Wireshark not installed | Install Wireshark |
| No snapshots / zero packets | Wrong interface or no permissions | Change `-i` flag; run with `sudo` |
| WebSocket connects but no data | `tshark` not capturing | Check stderr output in terminal |
| Clients disconnect | Collector restarted | Reconnect WebSocket client |

---

## Development notes

- The collector is intentionally **decoupled** from the dashboard — it only speaks WebSocket JSON.
- Multiple dashboard clients can connect simultaneously; all receive the same snapshots.
- Aggregation uses in-memory state reset each second. There is no historical buffer yet.
