# Aggregation Layer

The aggregation layer maintains rolling counters for the current one-second window and produces **metrics snapshots** for streaming to clients.

---

## Files

| File | Role |
|------|------|
| `state.ts` | In-memory metrics store |
| `metricsEngine.ts` | Packet processing, snapshot building, reset |

---

## `state.ts`

A single shared `metricsState` object holds all counters for the current window:

```typescript
{
  packetsThisSecond: number;
  bytesThisSecond: number;
  protocolTraffic: Map<string, number>;  // protocol → bytes
  ipTraffic:       Map<string, number>;  // src IP → bytes
  portTraffic:     Map<number, number>;  // dst port → packet count
}
```

State is **ephemeral** — cleared every second after a snapshot is broadcast.

---

## `metricsEngine.ts`

### `processPacket(packet)`

Called for every parsed `PacketEvent`:

1. Increment `packetsThisSecond`
2. Add `packet.length` to `bytesThisSecond`
3. Accumulate bytes by **protocol** (`protocolTraffic`)
4. Accumulate bytes by **source IP** (`ipTraffic`)
5. Increment count by **destination port** when present (`portTraffic`)

### `buildSnapshot()`

Produces the JSON object streamed to WebSocket clients:

| Field | Source |
|-------|--------|
| `timestamp` | `Date.now()` at snapshot time |
| `packetsPerSecond` | `metricsState.packetsThisSecond` |
| `bytesPerSecond` | `metricsState.bytesThisSecond` |
| `topProtocols` | Top 10 from `protocolTraffic` by bytes |
| `topIps` | Top 10 from `ipTraffic` by bytes |
| `topPorts` | Top 10 from `portTraffic` by count |

Top-N entries are returned as `{ key, value }` pairs sorted descending by `value`.

### `resetMetrics()`

Clears all counters and maps after each snapshot so the next window starts fresh.

---

## Windowing model

```
  t=0s          t=1s          t=2s
   │─────────────│─────────────│
   │  accumulate │  broadcast  │
   │   packets   │  + reset    │
   └─────────────┘─────────────┘
```

The 1-second interval is driven by `setInterval` in `src/index.ts`, not by packet timestamps. This keeps snapshot timing predictable for the dashboard regardless of capture latency.

---

## Design tradeoffs

**Why per-second windows?**  
Human-readable dashboard updates without overwhelming the WebSocket with per-packet messages.

**Why in-memory only?**  
Simplicity and privacy — no disk writes. Historical charts would require a ring buffer or time-series store.

**Why rank by bytes for IPs/protocols but count for ports?**  
Bytes reflect bandwidth share; port counts reflect connection activity. Both are useful for different views in the dashboard.

---

## Extending aggregation

Future modules in this layer:

- `throughput.ts` — rolling averages and rate-of-change
- `topTalkers.ts` — bidirectional IP pair rankings
- `protocols.ts` / `ports.ts` — dedicated ranking helpers
- Time-series ring buffer for sparkline charts
