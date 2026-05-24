# Local Watch

**Real-time local network traffic monitoring — built as a desktop app with a live dashboard.**

Local Watch captures packets from your machine's network interface, aggregates traffic metrics in real time, and streams them to a web dashboard wrapped in a native desktop shell. It is designed as a lightweight, privacy-first alternative to cloud-based network analytics: all capture and processing happens on your machine.

---

## Why this project?

Most network monitoring tools are either heavyweight enterprise suites or CLI-only utilities. Local Watch explores a middle ground:

- **Local-first** — traffic never leaves your machine
- **Real-time** — sub-second metric snapshots over WebSocket
- **Modern stack** — TypeScript monorepo with a React dashboard and Electron desktop wrapper
- **Extensible** — clear separation between capture, aggregation, transport, and UI layers

This project demonstrates systems-level integration (packet capture via Wireshark's `tshark`), streaming data pipelines, and full-stack desktop application architecture.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Electron (desktop)                       │
│                   loads http://localhost:3000                   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                   Dashboard (Next.js + React)                   │
│              WebSocket client → live traffic UI                 │
│                         :3000                                   │
└───────────────────────────────┬─────────────────────────────────┘
                                │  ws://localhost:4000
┌───────────────────────────────▼─────────────────────────────────┐
│                     Collector (Node.js)                         │
│  ┌──────────┐   ┌──────────┐   ┌──────────────┐   ┌─────────┐  │
│  │  tshark  │ → │  parser  │ → │ metrics eng. │ → │   WS    │  │
│  │ capture  │   │          │   │  (1s ticks)  │   │ server  │  │
│  └──────────┘   └──────────┘   └──────────────┘   └─────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                         network interface
                           (e.g. en0)
```

### Data flow

1. **Capture** — `tshark` streams live packet fields (timestamp, IPs, protocol, length, ports) from a network interface as CSV lines.
2. **Parse** — Each line is normalized into a typed `PacketEvent`.
3. **Aggregate** — A metrics engine rolls up per-second counters: packets/sec, bytes/sec, and top talkers by protocol, IP, and port.
4. **Broadcast** — Every second, a snapshot is pushed to all connected WebSocket clients.
5. **Visualize** — The dashboard (in progress) consumes snapshots and renders live charts and tables.

---

## Documentation

| App | Description |
|-----|-------------|
| [Collector](./apps/collector/README.md) | Packet capture, aggregation, and WebSocket event streaming |
| [Dashboard](./apps/dashboard/README.md) | Electron desktop client (Next.js UI + live metrics) |
| [Desktop shell](./apps/desktop/README.md) | Electron window that hosts the dashboard |
| [Docs index](./docs/README.md) | Full documentation map |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Monorepo | pnpm workspaces |
| Packet capture | [Wireshark `tshark`](https://www.wireshark.org/docs/man-pages/tshark.html) |
| Backend / pipeline | Node.js, TypeScript, `ws`, Pino, Zod |
| Dashboard | Next.js 16, React 19, Tailwind CSS 4 |
| Desktop shell | Electron 42 |
| Dev tooling | tsx, concurrently, Turbo |

---

## Project structure

```
local-watch/
├── apps/
│   ├── collector/          # Packet capture, aggregation, WebSocket server
│   │   └── src/
│   │       ├── capture/    # tshark subprocess + line parser
│   │       ├── aggregation/# Metrics state + snapshot builder
│   │       ├── websocket/  # Broadcast server (:4000)
│   │       └── types/      # Shared event types
│   ├── dashboard/          # Next.js frontend (:3000)
│   └── desktop/            # Electron wrapper
├── packages/               # Shared packages (reserved for future use)
├── package.json            # Root scripts
└── pnpm-workspace.yaml
```

---

## Metrics snapshot

The collector emits a JSON snapshot every second:

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

## Prerequisites

- **Node.js** 20+
- **pnpm** 10+ (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Wireshark** (for `tshark`) — [Install Wireshark](https://www.wireshark.org/download.html)
- **macOS/Linux** — packet capture requires elevated permissions (see below)

Verify `tshark` is available:

```bash
tshark --version
```

---

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure the network interface

The collector defaults to interface `en0` (typical macOS Wi-Fi). Edit `apps/collector/src/capture/tshark.ts` to match your interface:

```bash
# macOS — list interfaces
networksetup -listallhardwareports

# Linux
ip link show
```

### 3. Run the full stack

```bash
pnpm dev
```

This starts all three apps concurrently:

| Service | URL / Port | Description |
|---------|------------|-------------|
| Collector | `ws://localhost:4000` | Packet capture + metrics broadcast |
| Dashboard | `http://localhost:3000` | Web UI |
| Desktop | Electron window | Native shell around the dashboard |

Or run services individually:

```bash
pnpm dev:collector   # WebSocket server + tshark
pnpm dev:dashboard   # Next.js dev server
pnpm dev:desktop     # Electron window
```

### 4. Packet capture permissions

On **macOS**, grant Wireshark/tshark permission to capture packets:

- System Settings → Privacy & Security → Full Disk Access / Local Network (as applicable)
- Or run the collector with `sudo` during development:

```bash
sudo pnpm dev:collector
```

On **Linux**, you may need to run with `sudo` or add your user to the `wireshark` group.

---

## Development

### Collector

The collector is the core backend. Key modules:

- `capture/tshark.ts` — spawns `tshark` with field extraction and line-buffered stdout parsing
- `capture/parser.ts` — converts CSV lines into `PacketEvent` objects
- `aggregation/metricsEngine.ts` — rolling counters and top-N rankings
- `websocket/server.ts` — fans out snapshots to connected clients

Test the pipeline without the dashboard by watching collector logs — snapshots are printed every second.

Connect manually via WebSocket:

```javascript
const ws = new WebSocket("ws://localhost:4000");
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

### Dashboard

The dashboard is a Next.js App Router project. The UI layer is scaffolded and ready to wire up to the WebSocket feed.

Planned UI components:

- Live packets/sec and bytes/sec gauges
- Top protocols, IPs, and ports tables
- Connection status indicator

### Desktop

The Electron app loads the dashboard dev server in a `BrowserWindow`. In production, this would point at a built static export or bundled Next.js output.

---

## Current status

| Component | Status |
|-----------|--------|
| Packet capture (`tshark`) | ✅ Working |
| CSV parsing + typed events | ✅ Working |
| Per-second metrics aggregation | ✅ Working |
| WebSocket broadcast | ✅ Working |
| Dashboard UI | 🚧 Scaffolded (Next.js default) |
| WebSocket → React integration | 🚧 Planned |
| Electron production build | 🚧 Planned |
| Cross-platform interface detection | 🚧 Planned |

---

## Roadmap

- [ ] Wire dashboard to WebSocket with live charts (Recharts or similar)
- [ ] Interface auto-detection and CLI flag (`--interface en0`)
- [ ] Historical buffer (ring buffer of last N snapshots)
- [ ] Filter by protocol, IP, or port
- [ ] Shared types package in `packages/`
- [ ] Production Electron build with embedded dashboard
- [ ] Optional export to PCAP or CSV

---

## Design decisions

**Why `tshark` instead of a native binding?**  
Spawning `tshark` as a subprocess keeps the collector simple, leverages Wireshark's battle-tested dissectors, and avoids native addon complexity. The tradeoff is a process boundary and the Wireshark install requirement.

**Why WebSocket instead of HTTP polling?**  
Metrics are pushed every second to all connected clients. WebSocket gives low-latency, bidirectional transport with minimal overhead compared to polling.

**Why a monorepo?**  
The collector, dashboard, and desktop shell are independently deployable but share a development workflow. A shared `packages/` workspace is reserved for types and utilities as the project grows.

**Why Electron?**  
Desktop apps need reliable access to local services and a consistent window chrome. Electron wraps the web dashboard without rewriting the UI in a native toolkit.

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| `tshark: command not found` | Wireshark not installed | Install Wireshark and ensure `tshark` is on your `PATH` |
| No packets captured | Wrong interface | Update the `-i` flag in `tshark.ts` |
| Permission denied | Insufficient capture privileges | Run with `sudo` or grant Wireshark permissions |
| Dashboard shows default Next.js page | UI not yet connected | Expected — connect WebSocket client in `app/page.tsx` |
| Electron blank window | Dashboard not running | Start `pnpm dev:dashboard` before or with `pnpm dev:desktop` |

---

## License

ISC

---

## Author

Built by [David Martin](https://github.com/djmartin2019) as a portfolio project exploring network observability, real-time data pipelines, and desktop application architecture.
