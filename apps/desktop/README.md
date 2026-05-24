# Desktop Shell

The desktop app is the **Electron shell** for the Local Watch dashboard. It wraps the Next.js UI in a native window so the dashboard runs as a desktop application rather than a browser tab.

The UI itself lives in [`apps/dashboard`](../dashboard/README.md). This package only handles the native window lifecycle.

---

## Responsibilities

- Create and manage the Electron `BrowserWindow`
- Load the dashboard UI (`http://localhost:3000` in dev)
- Provide a native desktop entry point (dock icon, window chrome)

---

## Quick start

The shell expects the dashboard dev server to be running:

```bash
# From repo root — starts collector, dashboard, and desktop together
pnpm dev

# Or desktop only (dashboard must already be on :3000)
pnpm dev:desktop
```

---

## Entry point

`src/main.ts`:

```typescript
import { app, BrowserWindow } from "electron";

function createWindow() {
  const window = new BrowserWindow({
    width: 1400,
    height: 900,
  });

  window.loadURL("http://localhost:3000");
}

app.whenReady().then(createWindow);
```

### Behavior

| Event | Action |
|-------|--------|
| App ready | Open a 1400 × 900 window |
| Window loads | Navigate to dashboard dev server |
| App quit | Electron default lifecycle |

---

## Architecture

```
Electron main process (this app)
        │
        │  loadURL("http://localhost:3000")
        ▼
Next.js renderer (apps/dashboard)
        │
        │  WebSocket
        ▼
Collector (apps/collector)
```

Electron runs two contexts:

- **Main process** — `src/main.ts`, Node.js APIs, window management
- **Renderer process** — the Next.js app inside `BrowserWindow` (browser sandbox)

The WebSocket connection to the collector runs in the **renderer** (browser context), not the main process.

---

## Tech stack

| Package | Purpose |
|---------|---------|
| `electron` | Desktop runtime |
| `electronmon` | Hot reload during development |
| `wait-on` | *(available)* wait for dashboard before opening window |
| `tsx` | TypeScript support |

---

## Development vs production

### Development (current)

- Dashboard served by `next dev` on port 3000
- Electron loads the dev URL directly
- Requires both processes running simultaneously

### Production (planned)

- Build Next.js to static output or standalone server
- Bundle with `electron-builder` or similar
- Load `file://` or embedded local server instead of `localhost:3000`

---

## Planned improvements

- **Wait for dashboard** — use `wait-on http://localhost:3000` before opening the window
- **macOS activate** — recreate window when dock icon clicked with no open windows
- **Window state** — persist size/position across sessions
- **Menu bar** — File → Quit, View → Reload
- **Security** — `contextIsolation`, preload scripts if main/renderer IPC is needed
- **Auto-start collector** — spawn collector subprocess from main process (optional)

---

## Configuration

| Setting | Location | Default |
|---------|----------|---------|
| Window width | `src/main.ts` | `1400` |
| Window height | `src/main.ts` | `900` |
| Dashboard URL | `src/main.ts` | `http://localhost:3000` |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Blank white window | Ensure `pnpm dev:dashboard` is running |
| `ERR_CONNECTION_REFUSED` | Start the Next.js dev server before Electron |
| Window opens before UI is ready | Add `wait-on` to the dev script |

---

## Related docs

- [Dashboard README](../dashboard/README.md) — UI, WebSocket integration, metrics display
- [Collector README](../collector/README.md) — streaming event source
