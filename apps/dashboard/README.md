# Dashboard (Electron App)

The dashboard is Local Watch's **desktop client** — an Electron app that displays live network traffic metrics streamed from the collector.

It has two parts that run together in development:

| Part | Location | Role |
|------|----------|------|
| **UI** | `apps/dashboard` | Next.js + React frontend |
| **Shell** | `apps/desktop` | Electron native window |

The Electron shell loads the UI at `http://localhost:3000`. The UI connects to the collector at `ws://localhost:4000` to receive real-time snapshot events.

See also: [Desktop shell docs](../desktop/README.md)

---

## Responsibilities

- Render live traffic metrics (packets/sec, bytes/sec, top talkers)
- Maintain a WebSocket connection to the collector
- Provide a native desktop window via Electron
- Handle connection state (connected, reconnecting, offline)

---

## Quick start

Run the full stack from the repo root:

```bash
pnpm dev
```

This starts all three services:

| Service | Port | Command |
|---------|------|---------|
| Collector | `4000` (WebSocket) | `pnpm dev:collector` |
| Dashboard UI | `3000` (HTTP) | `pnpm dev:dashboard` |
| Electron shell | — | `pnpm dev:desktop` |

Or run the dashboard experience only:

```bash
# Terminal 1 — collector must be running first
pnpm dev:collector

# Terminal 2 — UI
pnpm dev:dashboard

# Terminal 3 — Electron window
pnpm dev:desktop
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Electron (apps/desktop)                │
│  ┌───────────────────────────────────────────────────┐  │
│  │           Next.js UI (apps/dashboard)             │  │
│  │                                                   │  │
│  │   React components ← WebSocket client             │  │
│  │         ▲                                         │  │
│  └─────────┼─────────────────────────────────────────┘  │
└────────────┼────────────────────────────────────────────┘
             │  ws://localhost:4000
             ▼
      Collector (streaming events)
```

### Why Electron + Next.js?

- **Next.js** — fast React development, Tailwind styling, component ecosystem
- **Electron** — native window, dock icon, future access to OS integrations
- **Separation** — UI and capture run as independent processes; the dashboard can also be opened in a regular browser during development

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| UI framework | Next.js 16 (App Router) |
| Components | React 19 |
| Styling | Tailwind CSS 4 |
| Desktop shell | Electron 42 |
| Real-time data | WebSocket (`ws://localhost:4000`) |

---

## Project structure

```
apps/dashboard/
├── app/
│   ├── layout.tsx      # Root layout, fonts, metadata
│   ├── page.tsx        # Home — live metrics dashboard (WIP)
│   └── globals.css     # Tailwind + theme variables
├── public/             # Static assets
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## Consuming collector events

The dashboard connects to the collector WebSocket and receives **MetricsSnapshot** messages once per second.

### Snapshot shape

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

### Recommended React hook pattern

```typescript
"use client";

import { useEffect, useState } from "react";

const WS_URL = "ws://localhost:4000";

export function useMetricsSnapshot() {
  const [snapshot, setSnapshot] = useState<MetricsSnapshot | null>(null);
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");

  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => setStatus("open");
    ws.onclose = () => setStatus("closed");
    ws.onmessage = (event) => setSnapshot(JSON.parse(event.data));

    return () => ws.close();
  }, []);

  return { snapshot, status };
}
```

Use this hook in `app/page.tsx` to drive gauges, tables, and connection indicators.

---

## UI roadmap

Planned dashboard views:

| Component | Data source | Status |
|-----------|-------------|--------|
| Throughput gauges | `packetsPerSecond`, `bytesPerSecond` | Planned |
| Top protocols table | `topProtocols` | Planned |
| Top IPs table | `topIps` | Planned |
| Top ports table | `topPorts` | Planned |
| Connection badge | WebSocket `readyState` | Planned |

---

## Development

### UI only (browser)

```bash
pnpm dev:dashboard
```

Open [http://localhost:3000](http://localhost:3000). Useful for iterating on React components without launching Electron.

### Lint

```bash
pnpm --filter dashboard lint
```

### Production build

```bash
pnpm --filter dashboard build
pnpm --filter dashboard start
```

For a packaged Electron release, the built Next.js output would be served locally or bundled into the Electron app — not yet implemented.

---

## Configuration

| Setting | Default | Notes |
|---------|---------|-------|
| UI dev server | `http://localhost:3000` | Next.js default |
| Collector WebSocket | `ws://localhost:4000` | Must match collector port |
| Electron window size | 1400 × 900 | Set in `apps/desktop/src/main.ts` |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Electron blank window | Dashboard not running | Start `pnpm dev:dashboard` first |
| No metrics updating | Collector not running | Start `pnpm dev:collector` |
| WebSocket errors | Port mismatch or collector crashed | Check collector terminal |
| Stale default Next.js page | UI not wired to WebSocket yet | Implement hook in `app/page.tsx` |

---

## Related docs

- [Collector README](../collector/README.md) — event streaming source
- [WebSocket protocol](../collector/src/websocket/websocket.md) — message format and client lifecycle
- [Desktop shell](../desktop/README.md) — Electron window configuration
