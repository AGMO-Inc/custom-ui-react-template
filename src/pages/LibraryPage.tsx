export function LibraryPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Library</h1>
        <p className="mt-2 text-gray-600">
          SeamOS 앱 개발에 사용할 수 있는 공식 라이브러리 목록입니다.
        </p>
      </div>

      {/* @seamos/websocket */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            @seamos/websocket
          </h2>
          <a
            href="https://www.npmjs.com/package/@seamos/websocket"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 hover:bg-red-200"
          >
            npm
          </a>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          브라우저 WebSocket을 감싸는 경량 헬퍼 라이브러리입니다. 자동 재연결,
          동적 포트 선택(수동 또는 CCU 기반), JSON 유틸리티를 제공하며
          의존성 없이 동작합니다.
        </p>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-800">주요 기능</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-600">
            <li>예기치 않은 연결 해제 시 자동 재연결</li>
            <li>수동 포트 지정 또는 CCU 엔드포인트를 통한 동적 포트 할당</li>
            <li>네이티브 WebSocket 이벤트 훅 (open, message, close, error)</li>
            <li>JSON 페이로드 안전 전송 및 방어적 소켓 종료</li>
          </ul>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-800">설치</h3>
          <pre className="mt-2 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
            npm install @seamos/websocket
          </pre>
          <a
            href="https://www.npmjs.com/package/@seamos/websocket"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-blue-600 hover:underline"
          >
            https://www.npmjs.com/package/@seamos/websocket
          </a>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-800">사용 예제</h3>
          <pre className="mt-2 overflow-x-auto rounded-md bg-gray-50 p-3 text-sm text-gray-700">
{`import {
  createWebSocketClient,
  sendJson,
  closeWebSocketSafe,
} from '@seamos/websocket'

const client = createWebSocketClient('ws://192.168.0.10/socket', {
  useCCUPort: false,
  manualPort: 8080,
  autoReconnect: true,
  reconnectInterval: 3000,
  events: {
    open: () => console.log('connected'),
    message: (event) => console.log('message', event.data),
    close: () => console.log('socket closed'),
  },
})

sendJson(client.socket, { type: 'ping' })
closeWebSocketSafe(client.socket, 1000, 'done')`}
          </pre>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-800">API</h3>
          <div className="mt-2 space-y-2 text-sm text-gray-600">
            <div>
              <code className="font-semibold text-gray-800">
                createWebSocketClient(baseUrl, options)
              </code>
              <span className="ml-2">
                — WebSocket 연결을 생성하고 socket, close()를 반환
              </span>
            </div>
            <div>
              <code className="font-semibold text-gray-800">
                sendJson(socket, payload)
              </code>
              <span className="ml-2">
                — JSON 직렬화 후 열린 소켓으로 전송
              </span>
            </div>
            <div>
              <code className="font-semibold text-gray-800">
                closeWebSocketSafe(socket, code?, reason?)
              </code>
              <span className="ml-2">
                — 소켓이 열려 있을 때만 안전하게 종료
              </span>
            </div>
            <div>
              <code className="font-semibold text-gray-800">
                isProperJson(payload)
              </code>
              <span className="ml-2">
                — 객체 또는 파싱 가능한 JSON 문자열인지 확인
              </span>
            </div>
          </div>
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
