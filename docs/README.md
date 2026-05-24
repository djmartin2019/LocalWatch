# Local Watch Documentation

Documentation for each part of the Local Watch monorepo.

---

## Apps

| App | Description | Docs |
|-----|-------------|------|
| **Collector** | Captures network traffic and streams metrics events over WebSocket | [apps/collector/README.md](../apps/collector/README.md) |
| **Dashboard** | Electron desktop client — Next.js UI + live metrics | [apps/dashboard/README.md](../apps/dashboard/README.md) |
| **Desktop** | Electron shell that hosts the dashboard window | [apps/desktop/README.md](../apps/desktop/README.md) |

---

## Collector modules

Deep dives into the collector pipeline:

- [Capture](./../apps/collector/src/capture/capture.md) — `tshark` subprocess and CSV parsing
- [Aggregation](./../apps/collector/src/aggregation/aggregation.md) — per-second metrics windows
- [WebSocket](./../apps/collector/src/websocket/websocket.md) — event streaming protocol
- [Services](./../apps/collector/src/services/services.md) — pipeline orchestration

---

## How the apps connect

```
Collector (:4000)  ──WebSocket──►  Dashboard UI (:3000)  ◄──loadURL──  Desktop (Electron)
     │                                    │
  tshark capture                    React + Tailwind
  metrics snapshots                 renders live data
```

Start everything:

```bash
pnpm dev
```
