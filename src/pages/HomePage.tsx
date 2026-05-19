import { useEffect, useRef, useState } from 'react'
import {
  createWebSocketClient,
  getAssignedPort,
  initPorts,
  seamosFetch,
  sendJson,
  type WebSocketClientResult,
} from '@seamos/connect'

type ExampleStatusResponse = {
  ok: boolean
  service: string
  status: 'ready' | 'busy' | 'error'
  timestamp: string
}

type ExampleCommandResponse = {
  ok: boolean
  requestId: string
  result?: Record<string, unknown>
  error?: {
    code: string
    message: string
  }
}

type ConnectionState = 'initializing' | 'ready' | 'error'

export function HomePage() {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('initializing')
  const [assignedPort, setAssignedPort] = useState<number | null>(null)
  const [initError, setInitError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [restResult, setRestResult] = useState<string>(
    'The REST response will be displayed here.',
  )
  const [wsLog, setWsLog] = useState<string[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const clientRef = useRef<WebSocketClientResult | null>(null)

  useEffect(() => {
    let mounted = true

    async function initializeConnect() {
      try {
        await initPorts()

        if (!mounted) return

        setAssignedPort(getAssignedPort())
        setConnectionState('ready')
        setInitError(null)
      } catch (error) {
        if (!mounted) return

        setConnectionState('error')
        setInitError(
          error instanceof Error
            ? error.message
            : 'Unknown initialization error',
        )
      }
    }

    initializeConnect()

    return () => {
      mounted = false
      clientRef.current?.close(1000, 'component unmount')
      clientRef.current = null
    }
  }, [])

  const appendWsLog = (entry: string) => {
    setWsLog((previous) => [entry, ...previous].slice(0, 5))
  }

  const connectWebSocket = () => {
    if (connectionState !== 'ready') return

    clientRef.current?.close(1000, 'reconnect')
    setWsConnected(false)

    const client = createWebSocketClient('/ws/example', {
      autoReconnect: true,
      reconnectInterval: 3000,
      events: {
        open: () => {
          setWsConnected(true)
          appendWsLog('connected: /ws/example')
          sendJson(client.socket, {
            type: 'example.subscribe',
            requestId: 'example-ws-001',
            payload: { channel: 'example.status' },
          })
        },
        message: (event) => {
          try {
            const payload = JSON.parse(event.data)
            appendWsLog(`message: ${JSON.stringify(payload)}`)
          } catch {
            appendWsLog(`message: ${event.data}`)
          }
        },
        close: () => {
          setWsConnected(false)
          appendWsLog('closed')
        },
        error: () => {
          setWsConnected(false)
          appendWsLog('error')
        },
      },
    })

    clientRef.current = client
  }

  const handleSend = () => {
    if (!message.trim() || !clientRef.current) return

    sendJson(clientRef.current.socket, {
      type: 'example.ping',
      requestId: 'example-ws-002',
      payload: { message },
    })
    appendWsLog(`sent: ${message}`)
    setMessage('')
  }

  const handleClose = () => {
    clientRef.current?.close(1000, 'demo disconnect')
    clientRef.current = null
    setWsConnected(false)
  }

  const fetchStatus = async () => {
    if (connectionState !== 'ready') return

    setRestResult('Requesting GET /api/example/status...')

    try {
      const response = await seamosFetch('/api/example/status')

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = (await response.json()) as ExampleStatusResponse
      setRestResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setRestResult(
        error instanceof Error ? error.message : 'Unknown REST request error',
      )
    }
  }

  const sendCommand = async () => {
    if (connectionState !== 'ready') return

    setRestResult('Requesting POST /api/example/commands...')

    try {
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

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = (await response.json()) as ExampleCommandResponse
      setRestResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setRestResult(
        error instanceof Error ? error.message : 'Unknown REST request error',
      )
    }
  }

  const isReady = connectionState === 'ready'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Home</h1>
        <p className="mt-2 text-gray-600">
          Example page for SeamOS REST/WebSocket communication using
          @seamos/connect
        </p>
        <p className="mt-2 text-gray-600">
          The SeamOS runtime must provide the <code>get_assigned_ports</code>
          endpoint, and this template example connects REST and WebSocket over
          the assigned port.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Connect Initialization Status
        </h2>
        {connectionState === 'initializing' && (
          <p className="text-sm text-gray-600">Initializing port information...</p>
        )}
        {connectionState === 'ready' && (
          <p className="text-sm text-green-700">
            Initialization complete — assigned port: {assignedPort}
          </p>
        )}
        {connectionState === 'error' && (
          <div className="space-y-2 text-sm text-red-700">
            <p>Initialization failed: {initError}</p>
            <p>
              If only the local Vite dev server is running, this failure is
              expected. Test again against the actual SeamOS runtime or a
              development proxy that provides <code>get_assigned_ports</code>.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          REST Communication Example
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          <code>seamosFetch(path, init)</code> sends an HTTP request over the
          assigned port. The example endpoint is a placeholder that the app
          developer must replace with the real API.
        </p>
        <div className="mb-4 flex flex-wrap gap-3">
          <button
            onClick={fetchStatus}
            disabled={!isReady}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            GET /api/example/status
          </button>
          <button
            onClick={sendCommand}
            disabled={!isReady}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          >
            POST /api/example/commands
          </button>
        </div>
        <pre className="overflow-x-auto rounded-md bg-gray-50 p-4 text-sm text-gray-700">
          {restResult}
        </pre>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          WebSocket Communication Example
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          Pass only a path that includes a leading slash, as in{' '}
          <code>createWebSocketClient('/ws/example')</code>. The host and port
          are configured automatically by @seamos/connect using the assigned
          port received from the SeamOS runtime.
        </p>
        <div className="mb-4 flex flex-wrap gap-3">
          <button
            onClick={connectWebSocket}
            disabled={!isReady}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Connect WebSocket
          </button>
          <button
            onClick={handleClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close Connection
          </button>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleSend()}
            placeholder="Enter a WebSocket message"
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!wsConnected}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Send
          </button>
        </div>
        <ul className="mt-4 space-y-1 text-sm text-gray-600">
          {wsLog.length === 0 ? (
            <li>WebSocket logs will be displayed here.</li>
          ) : (
            wsLog.map((entry, index) => (
              <li key={`${entry}-${index}`}>{entry}</li>
            ))
          )}
        </ul>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Project Structure
        </h2>
        <pre className="overflow-x-auto rounded-md bg-gray-50 p-4 text-sm text-gray-700">
          {`src/
├── main.tsx            # App entry point
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
    └── BridgePage.tsx  # WebView/native bridge example`}
        </pre>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Key Dependencies
        </h2>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-3">
            <span className="font-mono font-semibold text-gray-900">
              React 19
            </span>
            <span>— UI rendering library</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-mono font-semibold text-gray-900">
              TanStack Router
            </span>
            <span>
              — Type-safe file-based routing. Hash routing enables static
              deployment
            </span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-mono font-semibold text-gray-900">
              TanStack Query
            </span>
            <span>— Server state management and data fetching. Includes DevTools</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-mono font-semibold text-gray-900">
              Tailwind CSS v4
            </span>
            <span>— Utility-first CSS framework</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-mono font-semibold text-gray-900">Vite</span>
            <span>— Build tool. Supports HMR, code splitting, and relative-path builds</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-mono font-semibold text-gray-900">
              @seamos/connect
            </span>
            <span>
              — REST/WebSocket connection helper based on the SeamOS runtime
              assigned port
            </span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-mono font-semibold text-gray-900">
              @seamos/map-preset
            </span>
            <span>— SeamOS map preset based on MapLibre + PMTiles</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-mono font-semibold text-gray-900">
              @seamos/bridge
            </span>
            <span>— Cockpit/WebView native integration bridge</span>
          </div>
        </div>
      </div>
    </div>
  )
}
