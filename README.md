# SeamOS App Custom UI React Template

A React boilerplate template for SeamOS frontend custom UI development.
It includes `@seamos/connect`-based REST/WebSocket communication, a `@seamos/map-preset` map example,
a `@seamos/bridge` WebView native integration example, and hash routing for static deployment.

## Getting Started

```bash
npm install
npm run dev
```

If you only run the local Vite dev server, the SeamOS runtime endpoint `get_assigned_ports` is unavailable, so Connect initialization may fail.
Test the REST/WebSocket examples against an actual SeamOS runtime or a development proxy that provides `get_assigned_ports`.

## Scripts

| Command            | Description                            |
| ------------------ | -------------------------------------- |
| `npm run dev`      | Run the dev server (localhost:5173)    |
| `npm run build`    | TypeScript check + production build     |
| `npm run preview`  | Preview the build output               |
| `npm run lint`     | ESLint + Prettier check                |
| `npm run lint:fix` | ESLint + Prettier auto-fix             |

## Project Structure

```
src/
├── main.tsx            # App entrypoint
├── router.tsx          # Hash router configuration
├── providers.tsx       # QueryClient + RouterProvider
├── App.css             # Tailwind CSS entry point
├── routes/             # File-based routing (auto-generated)
│   ├── __root.tsx      # Root layout
│   ├── index.tsx       # Home page route
│   ├── library.tsx     # Library guide page route
│   ├── map.tsx         # @seamos/map-preset map example route
│   └── bridge.tsx      # @seamos/bridge WebView example route
├── layouts/
│   └── RootLayout.tsx  # Shared layout (navigation)
└── pages/
    ├── HomePage.tsx    # Connect REST/WebSocket example
    ├── LibraryPage.tsx # SeamOS library guide
    ├── MapPage.tsx     # MapLibre/PMTiles map example
    └── BridgePage.tsx  # WebView/native bridge example
```

## Key Dependencies

| Library                | Description                                                          |
| ---------------------- | -------------------------------------------------------------------- |
| **React 19**           | UI rendering library                                                 |
| **TanStack Router**    | Type-safe file-based routing. Supports static deployment via hash routing |
| **TanStack Query**     | Server state management and data fetching. Includes DevTools         |
| **Tailwind CSS v4**    | Utility-first CSS framework                                          |
| **Vite**               | Build tool. Supports HMR, code splitting, and relative-path builds   |
| **@seamos/connect**    | REST/WebSocket connection helper based on SeamOS runtime assigned ports |
| **@seamos/map-preset** | SeamOS map preset based on MapLibre + PMTiles                        |
| **@seamos/bridge**     | Cockpit/WebView native integration bridge                            |

## @seamos Library Selection Guide

- `@seamos/connect`: The core communication layer. It connects both REST and WebSocket based on assigned ports.
- `@seamos/map-preset`: Use this in apps that need a map UI. This template includes it along with `maplibre-gl` and `pmtiles` for the runnable sample. If you don't need map functionality, you can remove the `/map` route and its related dependencies.
- `@seamos/bridge`: Choose this when using settings, location, haptic, vibration, file download, or custom messages inside the SeamOS Cockpit or a React Native WebView. This template includes it by default for the WebView sample.
- `@seamos/websocket`: Deprecated. Do not add it to new apps; use `@seamos/connect` instead.

## Connect Setup

`@seamos/connect` initializes the ports assigned to the app through the SeamOS runtime's `get_assigned_ports` endpoint.
After initialization, REST requests and WebSocket connections use the same assigned port.

```typescript
import { initPorts } from '@seamos/connect'

await initPorts()
```

Notes:

- `initPorts()` must be called before `createWebSocketClient`, `seamosFetch`, or `getAssignedPort`.
- REST/WebSocket paths must include a leading slash, like `/api/example/status` and `/ws/example`.
- Do not specify the host and port yourself. `@seamos/connect` configures them automatically from `location.hostname` and the assigned port.
- If you only run the local Vite dev server, initialization may fail because `get_assigned_ports` is unavailable.

## REST Communication Example

```typescript
import { initPorts, seamosFetch } from '@seamos/connect'

await initPorts()

const response = await seamosFetch('/api/example/status')

if (!response.ok) {
  throw new Error(`HTTP ${response.status}`)
}

const data = await response.json()
console.log(data)
```

POST requests pass standard `RequestInit` options through as-is.

```typescript
const response = await seamosFetch('/api/example/commands', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'ping',
    requestId: 'example-request-001',
    payload: { message: 'hello' },
  }),
})
```

The endpoints above are placeholders for the template. In a real app, replace them with the paths and payloads that match your backend/API contract.

## WebSocket Communication Example

```typescript
import { createWebSocketClient, initPorts, sendJson } from '@seamos/connect'

await initPorts()

const client = createWebSocketClient('/ws/example', {
  autoReconnect: true,
  reconnectInterval: 3000,
  events: {
    open: () => {
      sendJson(client.socket, {
        type: 'example.subscribe',
        requestId: 'example-ws-001',
        payload: { channel: 'example.status' },
      })
    },
    message: (event) => console.log('message', event.data),
    close: () => console.log('socket closed'),
    error: () => console.log('socket error'),
  },
})

sendJson(client.socket, {
  type: 'example.ping',
  requestId: 'example-ws-002',
  payload: { message: 'hello' },
})

client.close(1000, 'done')
```

When using `autoReconnect`, call `client.close()` on component unmount or manual termination to also clear the reconnect timer.

## Map Preset Example

`@seamos/map-preset` uses S3 PMTiles in the dev environment and the device's local `/maps` path in the prod environment.
The map page is available at `/#/map`.

```typescript
import { useEffect, useRef } from 'react'
import { createSeamOSMap } from '@seamos/map-preset'
import 'maplibre-gl/dist/maplibre-gl.css'

export function MapView() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const map = createSeamOSMap({
      container: ref.current,
      preset: 'basic',
      env: 'dev',
    })

    map.on('load', () => console.log('map loaded'))

    return () => map.remove()
  }, [])

  return <div ref={ref} className="h-[420px]" />
}
```

Notes:

- You must import `maplibre-gl/dist/maplibre-gl.css`.
- Before prod deployment, verify the device's `/maps` resources and Range Request support.
- The map may not load on browsers that do not support WebGL.

## WebView Bridge Example

The `@seamos/bridge` example page is available at `/#/bridge`.
In a regular browser, `ReactNativeWebView` is unavailable, so native requests are not actually processed.
Verify it in the SeamOS Cockpit WebView or a test harness.

```typescript
import { bridge, BridgeEvent } from '@seamos/bridge/webview'

const unsubscribe = bridge.addListener(
  BridgeEvent.SETTINGS_UPDATE,
  (settings) => console.log(settings),
)

bridge.triggerHaptic('success')
bridge.sendCustom('example:ping', { message: 'hello' })

unsubscribe()
```

## Build and Deployment

```bash
npm run build
```

A `dist/` folder is generated. With hash routing (`/#/`) and relative-path (`base: './'`) configuration, you can deploy it directly to static hosting without any extra server setup.
