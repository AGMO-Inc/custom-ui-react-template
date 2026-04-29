export function LibraryPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Library</h1>
        <p className="mt-2 text-gray-600">
          SeamOS 앱 개발에 사용할 수 있는 공식 라이브러리 목록입니다.
        </p>
      </div>

      {/* @seamos/connect */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            @seamos/connect
          </h2>
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
          SeamOS 런타임에서 할당된 포트를 자동으로 해석해 REST와 WebSocket
          통신을 연결하는 공식 헬퍼 라이브러리입니다. 기존 WebSocket 전용
          라이브러리 대신 앱 UI 개발에서는 이 패키지를 사용합니다.
        </p>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-800">주요 기능</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-600">
            <li>
              <code>get_assigned_ports</code>를 통한 SeamOS assigned port 초기화
            </li>
            <li>할당된 포트를 사용하는 REST fetch wrapper</li>
            <li>path 기반 WebSocket client 생성 및 자동 재연결</li>
            <li>JSON WebSocket 전송과 안전한 연결 종료 유틸리티</li>
          </ul>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-800">설치</h3>
          <pre className="mt-2 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
            npm install @seamos/connect
          </pre>
          <a
            href="https://www.npmjs.com/package/@seamos/connect"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-blue-600 hover:underline"
          >
            https://www.npmjs.com/package/@seamos/connect
          </a>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-800">
            REST 사용 예제
          </h3>
          <pre className="mt-2 overflow-x-auto rounded-md bg-gray-50 p-3 text-sm text-gray-700">
            {`import { initPorts, seamosFetch } from '@seamos/connect'

await initPorts()

const response = await seamosFetch('/api/example/status')
if (!response.ok) {
  throw new Error(\`HTTP \${response.status}\`)
}

const data = await response.json()
console.log(data)`}
          </pre>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-800">
            WebSocket 사용 예제
          </h3>
          <pre className="mt-2 overflow-x-auto rounded-md bg-gray-50 p-3 text-sm text-gray-700">
            {`import {
  createWebSocketClient,
  initPorts,
  sendJson,
} from '@seamos/connect'

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

client.close(1000, 'done')`}
          </pre>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-800">API</h3>
          <div className="mt-2 space-y-2 text-sm text-gray-600">
            <div>
              <code className="font-semibold text-gray-800">initPorts()</code>
              <span className="ml-2">
                — SeamOS 런타임의 <code>get_assigned_ports</code>를 호출해 통신
                포트를 초기화
              </span>
            </div>
            <div>
              <code className="font-semibold text-gray-800">
                createWebSocketClient(path, options)
              </code>
              <span className="ml-2">
                — 할당된 포트로 WebSocket을 생성. path는{' '}
                <code>/ws/example</code>처럼 leading slash 포함
              </span>
            </div>
            <div>
              <code className="font-semibold text-gray-800">
                seamosFetch(path, init?)
              </code>
              <span className="ml-2">
                — 할당된 포트로 REST 요청을 보내는 fetch wrapper
              </span>
            </div>
            <div>
              <code className="font-semibold text-gray-800">
                sendJson(socket, payload)
              </code>
              <span className="ml-2">— JSON 직렬화 후 열린 소켓으로 전송</span>
            </div>
            <div>
              <code className="font-semibold text-gray-800">
                closeWebSocketSafe(socket, code?, reason?)
              </code>
              <span className="ml-2">
                — 소켓이 닫힌 상태여도 예외 없이 종료 시도
              </span>
            </div>
            <div>
              <code className="font-semibold text-gray-800">
                getAssignedPort()
              </code>
              <span className="ml-2">— 초기화된 assigned port 조회</span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-md bg-blue-50 p-4 text-sm text-blue-800">
          로컬 Vite 개발 서버만 실행하면 <code>get_assigned_ports</code>가 없어
          초기화가 실패할 수 있습니다. 실제 SeamOS 런타임 또는 해당 endpoint를
          제공하는 개발 프록시에서 REST/WebSocket 예제를 테스트하세요.
        </div>
      </div>

      {/* @seamos/map-preset */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            @seamos/map-preset
          </h2>
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
          SeamOS 애플리케이션을 위한 MapLibre 래퍼 라이브러리입니다. PMTiles
          기반의 벡터 및 지형 지도를 제공하며, 개발(S3)과 프로덕션(디바이스 로컬
          서버) 환경 간 자동 전환을 지원합니다.
        </p>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-800">주요 기능</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-600">
            <li>MapLibre GL JS 래퍼 (브라우저 전용)</li>
            <li>PMTiles 프로토콜 자동 등록</li>
            <li>dev/prod 환경에 따른 PMTiles 기본 URL 자동 관리</li>
            <li>내장 스타일 프리셋 (basic, terrain 등)</li>
            <li>Vanilla JS, Vue, React, Next.js 클라이언트 사이드 지원</li>
          </ul>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-800">설치</h3>
          <pre className="mt-2 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
            npm install @seamos/map-preset maplibre-gl pmtiles
          </pre>
          <a
            href="https://www.npmjs.com/package/@seamos/map-preset"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-blue-600 hover:underline"
          >
            https://www.npmjs.com/package/@seamos/map-preset
          </a>
        </div>
      </div>
    </div>
  )
}
