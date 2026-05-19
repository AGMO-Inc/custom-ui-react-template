export function LibraryPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Library</h1>
        <p className="mt-2 text-gray-600">
          The official <code>@seamos</code>{' '}
          libraries available for SeamOS Custom UI app development, with guidance on which to choose.
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 text-sm text-blue-900">
        <h2 className="text-base font-semibold">Selection Guide</h2>
        <ul className="mt-3 list-inside list-disc space-y-1">
          <li>
            For REST/WebSocket communication, use the built-in <code>@seamos/connect</code>.
          </li>
          <li>
            Apps that need a map UI use <code>@seamos/map-preset</code>,{' '}
            <code>maplibre-gl</code>, and <code>pmtiles</code>. They are included in this
            template for the runnable sample; if you do not need map features, you can
            remove the <code>/map</code> route and the related dependencies.
          </li>
          <li>
            For Cockpit WebView native integration, use <code>@seamos/bridge</code>.
            It is included in this template for the WebView sample.
          </li>
          <li>
            <code>@seamos/websocket</code> is deprecated. Do not add it in new apps;
            migrate to <code>@seamos/connect</code> instead.
          </li>
        </ul>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            @seamos/connect
          </h2>
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            Built-in
          </span>
          <a
            href="https://www.npmjs.com/package/@seamos/connect"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 hover:bg-red-200"
          >
            npm
          </a>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          The default helper library that automatically resolves the port assigned by
          the SeamOS runtime and wires up REST and WebSocket communication.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">REST</h3>
            <pre className="mt-2 overflow-x-auto rounded-md bg-gray-50 p-3 text-sm text-gray-700">
              {`import { initPorts, seamosFetch } from '@seamos/connect'

await initPorts()

const response = await seamosFetch('/api/example/status')
const data = await response.json()`}
            </pre>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">WebSocket</h3>
            <pre className="mt-2 overflow-x-auto rounded-md bg-gray-50 p-3 text-sm text-gray-700">
              {`import { createWebSocketClient, initPorts, sendJson } from '@seamos/connect'

await initPorts()

const client = createWebSocketClient('/ws/example', {
  autoReconnect: true,
  events: {
    open: () => sendJson(client.socket, { type: 'example.subscribe' }),
    message: (event) => console.log(event.data),
  },
})

client.close(1000, 'done')`}
            </pre>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            @seamos/map-preset
          </h2>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            Optional install for map apps
          </span>
          <a
            href="https://www.npmjs.com/package/@seamos/map-preset"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 hover:bg-red-200"
          >
            npm
          </a>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          A map preset that uses MapLibre GL and PMTiles to switch between the dev (S3)
          and prod (device-local{' '}
          <code>/maps</code>) environments. A runnable example is available at the{' '}
          <code>/map</code> route.
        </p>
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-800">Installation</h3>
          <pre className="mt-2 overflow-x-auto rounded-md bg-gray-50 p-3 text-sm text-gray-700">
            npm install @seamos/map-preset maplibre-gl pmtiles
          </pre>
        </div>
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-800">React Example</h3>
          <pre className="mt-2 overflow-x-auto rounded-md bg-gray-50 p-3 text-sm text-gray-700">
            {`import { useEffect, useRef } from 'react'
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
}`}
          </pre>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            @seamos/bridge
          </h2>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            Optional install for WebView
          </span>
          <a
            href="https://www.npmjs.com/package/@seamos/bridge"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 hover:bg-red-200"
          >
            npm
          </a>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          A type-safe bridge that exchanges settings, location, haptic,
          vibration, file download, and custom messages between the React Native
          WebView and the Custom UI. A runnable example is available at the{' '}
          <code>/bridge</code> route.
        </p>
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-800">WebView Example</h3>
          <pre className="mt-2 overflow-x-auto rounded-md bg-gray-50 p-3 text-sm text-gray-700">
            {`import { bridge, BridgeEvent } from '@seamos/bridge/webview'

const unsubscribe = bridge.addListener(
  BridgeEvent.SETTINGS_UPDATE,
  (settings) => console.log(settings),
)

bridge.triggerHaptic('success')
bridge.sendCustom('example:ping', { message: 'hello' })

unsubscribe()`}
          </pre>
        </div>
        <div className="mt-4 rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
          In a regular browser there is no ReactNativeWebView, so native requests are
          not actually processed. Verify in the SeamOS Cockpit WebView or a test
          harness.
        </div>
      </div>
    </div>
  )
}
