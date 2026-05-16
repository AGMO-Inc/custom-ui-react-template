import { useEffect, useRef, useState } from 'react'
import {
  createWebSocketClient,
  getAssignedPort,
  initPorts,
  sendJson,
  type WebSocketClientResult,
} from '@seamos/connect'

type ConnState = 'initializing' | 'ready' | 'error'

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
type HttpMethod = (typeof HTTP_METHODS)[number]

type PendingEntry = {
  resolve: (data: unknown) => void
  reject: (err: Error) => void
  timer: ReturnType<typeof setTimeout>
}

const REQUEST_TIMEOUT_MS = 30_000

export function ExternalApiPage() {
  const [connState, setConnState] = useState<ConnState>('initializing')
  const [assignedPort, setAssignedPort] = useState<number | null>(null)
  const [initError, setInitError] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)

  const [endPoint, setEndPoint] = useState(
    'https://dev.marketplace-api.seamos.io/health',
  )
  const [method, setMethod] = useState<HttpMethod>('GET')
  const [headersText, setHeadersText] = useState(
    '{\n  "Content-Type": "application/json"\n}',
  )
  const [bodyText, setBodyText] = useState('{}')

  const [pending, setPending] = useState(false)
  const [responseText, setResponseText] = useState('응답이 여기에 표시됩니다.')
  const [errorText, setErrorText] = useState<string | null>(null)

  const clientRef = useRef<WebSocketClientResult | null>(null)
  const pendingRef = useRef<Map<string, PendingEntry>>(new Map())
  const counterRef = useRef(0)

  useEffect(() => {
    let mounted = true
    const pendingMap = pendingRef.current

    async function boot() {
      try {
        await initPorts()
        if (!mounted) return
        setAssignedPort(getAssignedPort())
        setConnState('ready')
        setInitError(null)

        const client = createWebSocketClient('/socket', {
          autoReconnect: true,
          reconnectInterval: 3000,
          events: {
            open: () => setWsConnected(true),
            close: () => setWsConnected(false),
            error: () => setWsConnected(false),
            message: (event: MessageEvent) => {
              let frame: {
                type?: string
                'correlation-id'?: string
                data?: unknown
              }
              try {
                frame = JSON.parse(event.data)
              } catch {
                return
              }
              if (frame?.type !== 'external_api_response') return
              const cid = frame['correlation-id']
              if (!cid) return
              const entry = pendingMap.get(cid)
              if (!entry) return
              clearTimeout(entry.timer)
              pendingMap.delete(cid)
              entry.resolve(frame.data)
            },
          },
        })
        clientRef.current = client
      } catch (error) {
        if (!mounted) return
        setConnState('error')
        setInitError(
          error instanceof Error ? error.message : 'Unknown init error',
        )
      }
    }

    boot()

    return () => {
      mounted = false
      pendingMap.forEach((entry) => clearTimeout(entry.timer))
      pendingMap.clear()
      clientRef.current?.close(1000, 'component unmount')
      clientRef.current = null
    }
  }, [])

  const callExternalApi = () =>
    new Promise<unknown>((resolve, reject) => {
      const client = clientRef.current
      if (
        !client ||
        !client.socket ||
        client.socket.readyState !== WebSocket.OPEN
      ) {
        reject(new Error('WebSocket이 연결되어 있지 않습니다.'))
        return
      }

      let reqHeader: unknown
      let reqBody: unknown
      try {
        reqHeader = headersText.trim() ? JSON.parse(headersText) : {}
      } catch {
        reject(new Error('헤더(Headers) JSON 파싱 실패'))
        return
      }
      try {
        reqBody = bodyText.trim() ? JSON.parse(bodyText) : {}
      } catch {
        reject(new Error('바디(Body) JSON 파싱 실패'))
        return
      }

      counterRef.current += 1
      const cid = `UI-${Date.now()}-${counterRef.current}`
      const timer = setTimeout(() => {
        pendingRef.current.delete(cid)
        reject(new Error(`요청 타임아웃 (cid=${cid})`))
      }, REQUEST_TIMEOUT_MS)
      pendingRef.current.set(cid, { resolve, reject, timer })

      sendJson(client.socket, {
        'correlation-id': cid,
        endPoint,
        methodSelect: method,
        reqHeader,
        reqBody,
      })
    })

  const handleSubmit = async () => {
    if (connState !== 'ready' || pending) return
    setPending(true)
    setErrorText(null)
    setResponseText('요청 전송 중...')
    try {
      const data = await callExternalApi()
      setResponseText(
        typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      )
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Unknown error')
      setResponseText('응답이 여기에 표시됩니다.')
    } finally {
      setPending(false)
    }
  }

  const isReady = connState === 'ready'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">External API</h1>
        <p className="mt-2 text-gray-600">
          엔드포인트 · 헤더 · 메소드 · 바디를 입력해 백엔드로 전송하면, 백엔드가
          Cloud 플러그인을 경유해 외부 API를 호출하고 응답을 WebSocket으로 다시
          푸시합니다 (비동기 Pattern B).
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">연결 상태</h2>
        {connState === 'initializing' && (
          <p className="text-sm text-gray-600">포트 정보를 초기화하는 중...</p>
        )}
        {connState === 'ready' && (
          <p className="text-sm text-green-700">
            초기화 완료 — assigned port: {assignedPort} · WebSocket{' '}
            {wsConnected ? '연결됨' : '연결 대기'}
          </p>
        )}
        {connState === 'error' && (
          <div className="space-y-2 text-sm text-red-700">
            <p>초기화 실패: {initError}</p>
            <p>
              로컬 Vite 개발 서버만 실행한 상태라면 정상적으로 실패할 수
              있습니다. 실제 SeamOS 런타임에서 다시 테스트하세요.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">요청</h2>
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Endpoint URL
            </label>
            <input
              type="text"
              value={endPoint}
              onChange={(event) => setEndPoint(event.target.value)}
              placeholder="https://api.example.com/resource"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Method</label>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value as HttpMethod)}
              className="w-40 rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Headers (JSON)
            </label>
            <textarea
              value={headersText}
              onChange={(event) => setHeadersText(event.target.value)}
              rows={4}
              className="rounded-md border border-gray-300 px-4 py-2 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Body (JSON)
            </label>
            <textarea
              value={bodyText}
              onChange={(event) => setBodyText(event.target.value)}
              rows={6}
              className="rounded-md border border-gray-300 px-4 py-2 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!isReady || pending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {pending ? '요청 중...' : '요청 전송'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">응답</h2>
        {errorText && (
          <p className="mb-3 text-sm text-red-700">에러: {errorText}</p>
        )}
        <pre className="overflow-x-auto rounded-md bg-gray-50 p-4 text-sm text-gray-700">
          {responseText}
        </pre>
      </div>
    </div>
  )
}
