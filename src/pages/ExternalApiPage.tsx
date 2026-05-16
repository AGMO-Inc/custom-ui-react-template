import { useEffect, useRef, useState } from 'react'
import {
  createWebSocketClient,
  getAssignedPort,
  initPorts,
  sendJson,
  type WebSocketClientResult,
} from '@seamos/connect'

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestStatus = 'pending' | 'received' | 'blocked' | 'error'

type HistoryEntry = {
  correlationId: string
  endPoint: string
  methodSelect: string
  status: RequestStatus
  reason?: string
  responseData?: unknown
  timestamp: string
}

type WsReadyState = 0 | 1 | 2 | 3

type DiagnosticsState = {
  // connection phase
  assignedPort: number | null
  wsPath: string | null
  readyState: WsReadyState | null
}

type LogLine = string

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * RFC 4122 v4 UUID generator that works in non-secure contexts (plain HTTP).
 * - Prefers crypto.randomUUID() when available (secure context only).
 * - Falls back to crypto.getRandomValues() which IS available in non-secure contexts.
 * - Final fallback uses Math.random() (sufficient for correlation-id uniqueness).
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    // Set version bits to 4 (0100xxxx)
    bytes[6] = ((bytes[6] as number) & 0x0f) | 0x40
    // Set variant bits to 10xxxxxx
    bytes[8] = ((bytes[8] as number) & 0x3f) | 0x80
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0'))
    return (
      hex.slice(0, 4).join('') +
      '-' +
      hex.slice(4, 6).join('') +
      '-' +
      hex.slice(6, 8).join('') +
      '-' +
      hex.slice(8, 10).join('') +
      '-' +
      hex.slice(10, 16).join('')
    )
  }
  // Math.random fallback — acceptable for correlation-id (uniqueness, not crypto)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const WS_READY_STATE_LABEL: Record<number, string> = {
  0: 'CONNECTING',
  1: 'OPEN',
  2: 'CLOSING',
  3: 'CLOSED',
}

function nowMs(): string {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${hh}:${mm}:${ss}.${ms}`
}

function readyStateLabel(rs: number | null): string {
  if (rs === null) return 'N/A'
  return `${rs} (${WS_READY_STATE_LABEL[rs] ?? 'UNKNOWN'})`
}

// ─── Module-level response layer ──────────────────────────────────────────────
// These survive StrictMode double-mount, remount, and component lifecycle.
// All inbound external_api_response frames are processed here, independently
// of which component instance (if any) is currently mounted.

// FIX DROP POINT 2: pending cid set is now module-level, not per-component-instance.
let _pendingIds = new Set<string>()

// Module-level history store — component mirrors this via subscription.
let _responseHistory: HistoryEntry[] = []

// Subscribers notified whenever _responseHistory changes.
let _historySubscribers = new Set<() => void>()

function _notifyHistorySubscribers() {
  _historySubscribers.forEach((fn) => fn())
}

// FIX DROP POINT 1 (response path): single permanent inbound frame handler,
// wired directly at socket-creation time and never cleared on unmount.
function handleInboundFrame(raw: string) {
  let frame: { type?: string; 'correlation-id'?: string; data?: unknown }
  try {
    frame = JSON.parse(raw) as { type?: string; 'correlation-id'?: string; data?: unknown }
  } catch {
    return // ignore malformed frames
  }

  if (
    frame.type === 'external_api_response' &&
    frame['correlation-id'] &&
    _pendingIds.has(frame['correlation-id'])
  ) {
    const correlationId = frame['correlation-id']
    _pendingIds.delete(correlationId)
    _responseHistory = _responseHistory.map((entry) =>
      entry.correlationId === correlationId
        ? {
            ...entry,
            status: 'received' as RequestStatus,
            responseData: frame.data,
            timestamp: new Date().toLocaleTimeString(),
          }
        : entry,
    )
    _notifyHistorySubscribers()
  }
}

// ─── Module-level singleton for /socket WebSocket client ─────────────────────
// This singleton survives StrictMode double-mount and page navigation.
// It is created at most once per page load. autoReconnect is disabled to
// prevent the reconnect storm that triggers the backend's close-previous logic.

let _sharedSocketClient: WebSocketClientResult | null = null
let _initPortsPromise: Promise<void> | null = null
// Tracks in-flight client creation to prevent parallel /socket connections.
let _clientCreationInFlight = false
// Promise that resolves when the in-flight connection settles (open or close).
let _clientCreationSettled: Promise<void> | null = null

// Callbacks registered by the mounted component for non-response events only
// (onOpen, onClose, onError for UI status display).
type SocketStatusCallbacks = {
  onOpen?: () => void
  onClose?: () => void
  onError?: () => void
}
let _statusCallbacks: SocketStatusCallbacks = {}

function createSharedSocketClient(): WebSocketClientResult {
  _clientCreationInFlight = true
  _clientCreationSettled = new Promise<void>((resolveSettled) => {
    const wsPath = '/socket'
    const client = createWebSocketClient(wsPath, {
      autoReconnect: false,
      events: {
        open: (_event) => {
          _clientCreationInFlight = false
          resolveSettled()
          if (_statusCallbacks.onOpen) _statusCallbacks.onOpen()
        },
        // FIX DROP POINT 1: onMessage is wired DIRECTLY to handleInboundFrame.
        // It does NOT go through _statusCallbacks and is never cleared on unmount.
        message: (event) => {
          handleInboundFrame((event as MessageEvent).data as string)
        },
        close: (_event) => {
          _clientCreationInFlight = false
          resolveSettled()
          if (_statusCallbacks.onClose) _statusCallbacks.onClose()
        },
        error: (_event) => {
          _clientCreationInFlight = false
          resolveSettled()
          if (_statusCallbacks.onError) _statusCallbacks.onError()
        },
      },
    })
    _sharedSocketClient = client
  })
  return _sharedSocketClient!
}

async function getOrCreateSocketClient(): Promise<WebSocketClientResult> {
  // Guard: initPorts is idempotent but we serialize with a single promise.
  if (!_initPortsPromise) {
    _initPortsPromise = initPorts()
  }
  await _initPortsPromise

  // Guard: return existing live client if already open or connecting.
  if (_sharedSocketClient !== null) {
    const rs = _sharedSocketClient.socket?.readyState
    if (rs === WebSocket.OPEN || rs === WebSocket.CONNECTING) {
      return _sharedSocketClient
    }
  }

  // FIX in-flight wrapper: wait for the settled promise directly.
  // Does NOT touch _statusCallbacks — no stale snapshot is ever restored.
  if (_clientCreationInFlight && _clientCreationSettled) {
    await _clientCreationSettled
    if (_sharedSocketClient !== null) return _sharedSocketClient
  }

  return createSharedSocketClient()
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ExternalApiPage() {
  // Form state
  const [endPoint, setEndPoint] = useState('')
  const [methodSelect, setMethodSelect] = useState('GET')
  const [reqHeaderRaw, setReqHeaderRaw] = useState('{}')
  const [reqBodyRaw, setReqBodyRaw] = useState('{}')
  const [headerError, setHeaderError] = useState<string | null>(null)
  const [bodyError, setBodyError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  // History + response — component mirrors the module-level store
  const [history, setHistory] = useState<HistoryEntry[]>(_responseHistory)
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null)

  // Diagnostics panel
  const [diagOpen, setDiagOpen] = useState(true)
  const [diag, setDiag] = useState<DiagnosticsState>({
    assignedPort: null,
    wsPath: null,
    readyState: null,
  })
  const [eventLog, setEventLog] = useState<LogLine[]>([])
  const [initError, setInitError] = useState<string | null>(null)

  // Refs — component holds a reference to the shared singleton, not ownership.
  const clientRef = useRef<WebSocketClientResult | null>(null)

  // ── Log helper ──────────────────────────────────────────────────────────────
  function appendLog(msg: string) {
    setEventLog((prev) => [`${nowMs()}  ${msg}`, ...prev].slice(0, 50))
  }

  // ── readyState updater ──────────────────────────────────────────────────────
  function syncReadyState() {
    const rs = clientRef.current?.socket?.readyState ?? null
    setDiag((prev) => ({ ...prev, readyState: rs as WsReadyState | null }))
  }

  // ── Initialization — acquire/reuse the module-level singleton ───────────────
  useEffect(() => {
    let mounted = true

    // Subscribe this component instance to the module-level history store.
    // When handleInboundFrame updates _responseHistory, this callback re-syncs.
    function onHistoryUpdate() {
      if (!mounted) return
      setHistory([..._responseHistory])
      // Keep selectedEntry in sync if it was updated by the inbound handler.
      setSelectedEntry((sel) => {
        if (!sel) return sel
        return _responseHistory.find((e) => e.correlationId === sel.correlationId) ?? sel
      })
    }
    _historySubscribers.add(onHistoryUpdate)

    // Register component-local status callbacks (onOpen/onClose/onError only).
    // These are for UI status display — NOT for response routing.
    _statusCallbacks = {
      onOpen: () => {
        if (!mounted) return
        appendLog('ws open')
        setDiag((prev) => ({ ...prev, readyState: 1 }))
        setInitError(null)
      },
      onClose: () => {
        if (!mounted) return
        appendLog('ws close')
        setDiag((prev) => ({ ...prev, readyState: 3 }))
      },
      onError: () => {
        if (!mounted) return
        appendLog('ws error')
        setDiag((prev) => ({
          ...prev,
          readyState: (clientRef.current?.socket?.readyState ?? null) as WsReadyState | null,
        }))
      },
    }

    async function initialize() {
      appendLog('init start')

      try {
        const client = await getOrCreateSocketClient()
        if (!mounted) return

        const port = getAssignedPort()
        appendLog(`initPorts ok: assignedPort=${port}`)
        setDiag((prev) => ({
          ...prev,
          assignedPort: port,
          wsPath: '/socket',
          readyState: (client.socket?.readyState ?? null) as WsReadyState | null,
        }))
        setInitError(null)
        clientRef.current = client
        appendLog(`ws acquiring: /socket (readyState=${client.socket?.readyState ?? 'null'})`)
      } catch (e) {
        if (!mounted) return
        const msg = e instanceof Error ? e.message : String(e)
        appendLog(`init threw: ${msg}`)
        setInitError(`포트 초기화 실패: ${msg}`)
      }
    }

    void initialize()

    return () => {
      mounted = false
      // FIX DROP POINT 1 (unmount): Do NOT clear the response path.
      // Only unsubscribe this instance from the module-level history store
      // and clear status UI callbacks. The socket stays open. handleInboundFrame
      // continues to work regardless of mount state.
      _historySubscribers.delete(onHistoryUpdate)
      _statusCallbacks = {}
      clientRef.current = null
    }
    // appendLog is stable within the effect closure; no deps needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── JSON validation ─────────────────────────────────────────────────────────
  const validateJson = (
    raw: string,
    setError: (msg: string | null) => void,
  ): unknown | null => {
    try {
      const parsed: unknown = JSON.parse(raw)
      setError(null)
      return parsed
    } catch {
      setError('유효한 JSON이 아닙니다.')
      return null
    }
  }

  const handleHeaderChange = (value: string) => {
    setReqHeaderRaw(value)
    try {
      JSON.parse(value)
      setHeaderError(null)
    } catch {
      setHeaderError('유효한 JSON이 아닙니다.')
    }
  }

  const handleBodyChange = (value: string) => {
    setReqBodyRaw(value)
    try {
      JSON.parse(value)
      setBodyError(null)
    } catch {
      setBodyError('유효한 JSON이 아닙니다.')
    }
  }

  // ── Send ────────────────────────────────────────────────────────────────────
  const handleSend = () => {
    setSendError(null)

    const correlationId = generateUUID()
    const ts = new Date().toLocaleTimeString()
    const rs = clientRef.current?.socket?.readyState ?? null
    appendLog(
      `Send clicked: endpoint="${endPoint}" readyState=${readyStateLabel(rs)}`,
    )

    // Validate JSON first (these keep the button disabled, so reaching here means valid)
    const parsedHeader = validateJson(reqHeaderRaw, setHeaderError)
    const parsedBody = validateJson(reqBodyRaw, setBodyError)

    if (parsedHeader === null || parsedBody === null) {
      const reason = 'invalid headers or body JSON'
      appendLog(`Send blocked: ${reason}`)
      setSendError('Headers 또는 Body의 JSON을 수정하세요.')
      // Not adding a history entry for pure JSON-error because button should be disabled for this case
      return
    }

    if (!endPoint.trim()) {
      const reason = 'empty endpoint'
      appendLog(`Send blocked: ${reason}`)
      const entry: HistoryEntry = {
        correlationId,
        endPoint: '',
        methodSelect,
        status: 'blocked',
        reason,
        timestamp: ts,
      }
      _responseHistory = [entry, ..._responseHistory].slice(0, 10)
      _notifyHistorySubscribers()
      setSelectedEntry(entry)
      setSendError('Endpoint URL을 입력하세요.')
      return
    }

    // Check socket readiness
    const client = clientRef.current
    const socket = client?.socket ?? null
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      const rsNow = socket?.readyState ?? null
      const reason = `socket not OPEN (readyState=${rsNow !== null ? rsNow : 'null'})`
      appendLog(`Send blocked: ${reason}`)
      const entry: HistoryEntry = {
        correlationId,
        endPoint: endPoint.trim(),
        methodSelect,
        status: 'blocked',
        reason,
        timestamp: ts,
      }
      _responseHistory = [entry, ..._responseHistory].slice(0, 10)
      _notifyHistorySubscribers()
      setSelectedEntry(entry)
      setSendError(`WebSocket이 연결되지 않았습니다. ${reason}`)
      syncReadyState()
      return
    }

    // Build payload (raw keys unchanged — backend does the rename server-side)
    const payload = {
      endPoint: endPoint.trim(),
      methodSelect,
      reqHeader: parsedHeader,
      reqBody: parsedBody,
      'correlation-id': correlationId,
    }

    // Attempt send via SDK
    try {
      sendJson(socket, payload)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      appendLog(`Send threw: ${msg}`)
      const entry: HistoryEntry = {
        correlationId,
        endPoint: endPoint.trim(),
        methodSelect,
        status: 'error',
        reason: msg,
        timestamp: ts,
      }
      _responseHistory = [entry, ..._responseHistory].slice(0, 10)
      _notifyHistorySubscribers()
      setSelectedEntry(entry)
      setSendError(`전송 실패: ${msg}`)
      return
    }

    const byteLen = new TextEncoder().encode(JSON.stringify(payload)).length
    appendLog(`Send ok: cid=${correlationId} bytes=${byteLen}`)

    // FIX DROP POINT 2: add cid to module-level _pendingIds (not per-instance ref)
    _pendingIds.add(correlationId)

    const entry: HistoryEntry = {
      correlationId,
      endPoint: endPoint.trim(),
      methodSelect,
      status: 'pending',
      timestamp: ts,
    }
    _responseHistory = [entry, ..._responseHistory].slice(0, 10)
    _notifyHistorySubscribers()
    setSelectedEntry(entry)
  }

  // ── Status badge helpers ────────────────────────────────────────────────────
  const statusBadgeClass: Record<RequestStatus, string> = {
    pending: 'text-yellow-600',
    received: 'text-green-700',
    blocked: 'text-orange-600',
    error: 'text-red-700',
  }

  const statusLabel: Record<RequestStatus, string> = {
    pending: '대기 중',
    received: '수신됨',
    blocked: '차단됨',
    error: '오류',
  }

  const rsLabel = readyStateLabel(diag.readyState)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">External API</h1>
        <p className="mt-2 text-gray-600">
          WebSocket을 통해 외부 API 요청을 백엔드로 전달하고 응답을 확인합니다.
        </p>
      </div>

      {/* ── Init error banner ─────────────────────────────────────────────── */}
      {initError && (
        <div className="rounded-lg border border-red-400 bg-red-50 p-4">
          <p className="text-base font-semibold text-red-700">초기화 오류</p>
          <p className="mt-1 text-sm text-red-700">{initError}</p>
        </div>
      )}

      {/* ── Diagnostics panel ────────────────────────────────────────────── */}
      <div className="rounded-lg border border-yellow-300 bg-yellow-50 shadow-sm">
        <button
          onClick={() => setDiagOpen((v) => !v)}
          className="flex w-full items-center justify-between px-6 py-4 text-left"
        >
          <span className="text-base font-semibold text-yellow-900">
            진단 (Diagnostics)
          </span>
          <span className="text-xs text-yellow-700">
            {diagOpen ? '접기 ▲' : '펼치기 ▼'}
          </span>
        </button>

        {diagOpen && (
          <div className="space-y-4 border-t border-yellow-200 px-6 pb-6 pt-4">
            {/* Connection info */}
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-yellow-800">
                연결 정보
              </h3>
              <table className="w-full text-xs text-gray-700">
                <tbody>
                  <tr>
                    <td className="w-40 font-medium">assignedPort</td>
                    <td className="font-mono">
                      {diag.assignedPort !== null ? diag.assignedPort : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-medium">wsPath</td>
                    <td className="font-mono">{diag.wsPath ?? '—'}</td>
                  </tr>
                  <tr>
                    <td className="font-medium">readyState</td>
                    <td
                      className={
                        diag.readyState === 1
                          ? 'font-mono font-semibold text-green-700'
                          : 'font-mono text-orange-700'
                      }
                    >
                      {rsLabel}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* Event log */}
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-yellow-800">
                이벤트 로그 (최근 50건)
              </h3>
              <div className="max-h-48 overflow-y-auto rounded bg-gray-900 p-2">
                {eventLog.length === 0 ? (
                  <p className="text-xs text-gray-500">(없음)</p>
                ) : (
                  eventLog.map((line, i) => (
                    <p
                      key={i}
                      className="whitespace-pre font-mono text-xs text-green-300"
                    >
                      {line}
                    </p>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* ── Connection status (compact) ───────────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700">
            WebSocket 상태
          </h2>
          <span
            className={`text-sm font-semibold ${
              diag.readyState === 1
                ? 'text-green-700'
                : diag.readyState === 0
                  ? 'text-yellow-600'
                  : 'text-red-700'
            }`}
          >
            {rsLabel}
          </span>
          {diag.wsPath && (
            <span className="font-mono text-xs text-gray-400">
              {diag.wsPath}
            </span>
          )}
        </div>
      </div>

      {/* ── Request form ─────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">요청 설정</h2>

        <div className="space-y-4">
          {/* Endpoint + Method */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Endpoint URL
              </label>
              <input
                type="text"
                value={endPoint}
                onChange={(e) => setEndPoint(e.target.value)}
                placeholder="https://example.com/api/resource"
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Method
              </label>
              <select
                value={methodSelect}
                onChange={(e) => setMethodSelect(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>DELETE</option>
                <option>PATCH</option>
              </select>
            </div>
          </div>

          {/* Headers */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Headers (JSON)
            </label>
            <textarea
              value={reqHeaderRaw}
              onChange={(e) => handleHeaderChange(e.target.value)}
              rows={3}
              className={`w-full rounded-md border px-4 py-2 font-mono text-sm focus:ring-1 focus:outline-none ${
                headerError
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
            {headerError && (
              <p className="mt-1 text-xs text-red-600">{headerError}</p>
            )}
          </div>

          {/* Body */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Body (JSON)
            </label>
            <textarea
              value={reqBodyRaw}
              onChange={(e) => handleBodyChange(e.target.value)}
              rows={4}
              className={`w-full rounded-md border px-4 py-2 font-mono text-sm focus:ring-1 focus:outline-none ${
                bodyError
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
            {bodyError && (
              <p className="mt-1 text-xs text-red-600">{bodyError}</p>
            )}
          </div>

          {/* Send button — disabled ONLY on JSON validation errors */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSend}
              disabled={!!headerError || !!bodyError}
              className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Send
            </button>
            {sendError && <p className="text-sm text-red-600">{sendError}</p>}
          </div>
        </div>
      </div>

      {/* ── History list ─────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          요청 히스토리 (최근 10건)
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">요청 내역이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {history.map((entry) => (
              <li
                key={entry.correlationId}
                onClick={() => setSelectedEntry(entry)}
                className={`cursor-pointer px-3 py-3 hover:bg-gray-50 ${
                  selectedEntry?.correlationId === entry.correlationId
                    ? 'bg-blue-50'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs font-semibold text-gray-700">
                      {entry.methodSelect}
                    </span>
                    <span className="max-w-xs truncate text-sm text-gray-800">
                      {entry.endPoint || '(endpoint 없음)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium ${statusBadgeClass[entry.status]}`}
                    >
                      {statusLabel[entry.status]}
                    </span>
                    <span className="text-xs text-gray-400">
                      {entry.timestamp}
                    </span>
                  </div>
                </div>
                {entry.reason && (
                  <p className="mt-0.5 text-xs text-orange-700">
                    {entry.reason}
                  </p>
                )}
                <p className="mt-1 font-mono text-xs text-gray-400">
                  {entry.correlationId}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Response panel ───────────────────────────────────────────────── */}
      {selectedEntry && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">응답</h2>
          <div className="mb-3 space-y-1 text-xs text-gray-500">
            <p>
              <span className="font-medium">correlation-id:</span>{' '}
              {selectedEntry.correlationId}
            </p>
            <p>
              <span className="font-medium">endpoint:</span>{' '}
              {selectedEntry.endPoint || '(없음)'}
            </p>
            <p>
              <span className="font-medium">status:</span>{' '}
              <span className={statusBadgeClass[selectedEntry.status]}>
                {statusLabel[selectedEntry.status]}
              </span>
            </p>
            {selectedEntry.reason && (
              <p>
                <span className="font-medium">reason:</span>{' '}
                <span className="text-orange-700">{selectedEntry.reason}</span>
              </p>
            )}
            <p>
              <span className="font-medium">timestamp:</span>{' '}
              {selectedEntry.timestamp}
            </p>
          </div>
          {selectedEntry.status === 'received' ? (
            <pre className="overflow-x-auto rounded-md bg-gray-50 p-4 text-sm text-gray-700">
              {JSON.stringify(selectedEntry.responseData, null, 2)}
            </pre>
          ) : selectedEntry.status === 'pending' ? (
            <p className="text-sm text-yellow-600">응답 대기 중...</p>
          ) : (
            <p className={`text-sm ${statusBadgeClass[selectedEntry.status]}`}>
              {selectedEntry.status === 'blocked'
                ? `전송 차단됨: ${selectedEntry.reason ?? ''}`
                : `전송 오류: ${selectedEntry.reason ?? ''}`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
