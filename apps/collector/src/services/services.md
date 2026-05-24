# Services Layer

The services layer orchestrates the collector pipeline — connecting capture, aggregation, and streaming into a cohesive runtime.

---

## Current state

Today, orchestration lives directly in `src/index.ts`:

```typescript
startTshark((line) => {
  const packet = parsePacket(line);
  if (!packet) return;
  processPacket(packet);
});

setInterval(() => {
  const snapshot = buildSnapshot();
  broadcast(snapshot);
  resetMetrics();
}, 1000);
```

The service module files below are **planned extractions** of this logic:

| File | Planned responsibility |
|------|------------------------|
| `packetProcessor.ts` | Wire capture callback → parse → aggregate |
| `metricsService.ts` | Own aggregation lifecycle and snapshot access |
| `snapshotScheduler.ts` | Manage the 1-second broadcast interval |

---

## Target architecture

```
index.ts
   │
   ├── packetProcessor.start()
   │        └── tshark → parser → processPacket()
   │
   └── snapshotScheduler.start()
            └── every 1s: buildSnapshot() → broadcast() → resetMetrics()
```

### `packetProcessor.ts`

- Start `tshark` with the parse/aggregate callback
- Handle backpressure if parsing falls behind (future)
- Surface capture errors to a shared logger

### `metricsService.ts`

- Single entry point for reading current metrics
- Encapsulate `metricsState` so aggregation internals aren't imported everywhere
- Expose `getSnapshot()` wrapping `buildSnapshot()`

### `snapshotScheduler.ts`

- Start/stop the interval timer
- Configurable tick rate (default 1000 ms)
- Guard against overlapping ticks if snapshot build is slow

---

## Why extract services?

| Benefit | Description |
|---------|-------------|
| Testability | Each service can be unit tested in isolation |
| Clarity | `index.ts` becomes a thin bootstrap |
| Configurability | Tick rate, interface, and port injected at startup |
| Graceful shutdown | Services can stop `tshark` and close WebSocket cleanly |

---

## Bootstrap target (`index.ts`)

```typescript
import { startPacketProcessor } from "./services/packetProcessor";
import { startSnapshotScheduler } from "./services/snapshotScheduler";

startPacketProcessor();
startSnapshotScheduler({ intervalMs: 1000 });
```

This refactor is incremental — the current flat structure is correct and functional for development.
