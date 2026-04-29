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
    'REST 응답이 여기에 표시됩니다.',
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

    setRestResult('GET /api/example/status 요청 중...')

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

    setRestResult('POST /api/example/commands 요청 중...')

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
          @seamos/connect를 사용한 SeamOS REST/WebSocket 통신 예제 페이지
        </p>
        <p className="mt-2 text-gray-600">
          SeamOS 런타임은 <code>get_assigned_ports</code> 엔드포인트를 제공해야
          하며, 템플릿 예제는 할당된 포트로 REST와 WebSocket을 연결합니다.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Connect 초기화 상태
        </h2>
        {connectionState === 'initializing' && (
          <p className="text-sm text-gray-600">포트 정보를 초기화하는 중...</p>
        )}
        {connectionState === 'ready' && (
          <p className="text-sm text-green-700">
            초기화 완료 — assigned port: {assignedPort}
          </p>
        )}
        {connectionState === 'error' && (
          <div className="space-y-2 text-sm text-red-700">
            <p>초기화 실패: {initError}</p>
            <p>
              로컬 Vite 개발 서버만 실행한 상태라면 정상적으로 실패할 수
              있습니다. 실제 SeamOS 런타임 또는 <code>get_assigned_ports</code>
              를 제공하는 개발 프록시에서 다시 테스트하세요.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          REST 통신 예제
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          <code>seamosFetch(path, init)</code>는 할당된 포트로 HTTP 요청을
          보냅니다. 예제 endpoint는 앱 개발자가 실제 API에 맞게 교체해야 하는
          placeholder입니다.
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
          WebSocket 통신 예제
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          <code>createWebSocketClient('/ws/example')</code>처럼 leading slash를
          포함한 path만 전달합니다. host와 port는 @seamos/connect가 SeamOS
          런타임에서 받은 assigned port로 자동 구성합니다.
        </p>
        <div className="mb-4 flex flex-wrap gap-3">
          <button
            onClick={connectWebSocket}
            disabled={!isReady}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            WebSocket 연결
          </button>
          <button
            onClick={handleClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            연결 종료
          </button>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleSend()}
            placeholder="WebSocket 메시지를 입력하세요"
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!wsConnected}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            전송
          </button>
        </div>
        <ul className="mt-4 space-y-1 text-sm text-gray-600">
          {wsLog.length === 0 ? (
            <li>WebSocket 로그가 여기에 표시됩니다.</li>
          ) : (
            wsLog.map((entry, index) => (
              <li key={`${entry}-${index}`}>{entry}</li>
            ))
          )}
        </ul>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          프로젝트 구조
        </h2>
        <pre className="overflow-x-auto rounded-md bg-gray-50 p-4 text-sm text-gray-700">
          {`src/
├── main.tsx            # 앱 엔트리포인트
├── router.tsx          # 해시 라우터 설정
├── providers.tsx       # QueryClient + RouterProvider
├── App.css             # Tailwind CSS 진입점
├── routes/             # 파일 기반 라우팅 (자동 생성)
│   ├── __root.tsx      # 루트 레이아웃
│   ├── index.tsx       # 홈 페이지 라우트
│   └── library.tsx     # 라이브러리 안내 페이지 라우트
├── layouts/
│   └── RootLayout.tsx  # 공통 레이아웃 (네비게이션)
└── pages/
    ├── HomePage.tsx    # Connect REST/WebSocket 예제
    └── LibraryPage.tsx # SeamOS 라이브러리 안내`}
        </pre>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          주요 의존성
        </h2>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-3">
            <span className="font-mono font-semibold text-gray-900">
              React 19
            </span>
            <span>— UI 렌더링 라이브러리</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-mono font-semibold text-gray-900">
              TanStack Router
            </span>
            <span>
              — 타입 안전한 파일 기반 라우팅. 해시 라우팅으로 정적 배포 지원
            </span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-mono font-semibold text-gray-900">
              TanStack Query
            </span>
            <span>— 서버 상태 관리 및 데이터 페칭. DevTools 포함</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-mono font-semibold text-gray-900">
              Tailwind CSS v4
            </span>
            <span>— 유틸리티 기반 CSS 프레임워크</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-mono font-semibold text-gray-900">Vite</span>
            <span>— 빌드 도구. HMR, 코드 스플리팅, 상대 경로 빌드 지원</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-mono font-semibold text-gray-900">
              @seamos/connect
            </span>
            <span>
              — SeamOS 런타임 assigned port 기반 REST/WebSocket 연결 헬퍼
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
