import { useState } from 'react'
import {
  createWebSocketClient,
  sendJson,
  closeWebSocketSafe,
} from '@seamos/websocket'

export function HomePage() {
  const [message, setMessage] = useState('')

  /** CCU 배포 시 세팅 */
  const client = createWebSocketClient('ws://192.168.32.1/socket', {
    useCCUPort: true,
    defaultPort: 1456,
    ccuPortEndpoint: 'get_assigned_ports',
    autoReconnect: true,
    events: {
      open: () => console.log('connected'),
      message: (event) => console.log('message', event.data),
      close: () => console.log('socket closed'),
    },
  });

  /** local test 세팅 */
  // const client = createWebSocketClient('ws://127.0.0.1/socket', {
  //   useCCUPort: false,
  //   manualPort: 8081,
  //   autoReconnect: true,
  //   reconnectInterval: 3000,
  //   events: {
  //     open: () => console.log('connected'),
  //     message: (event) => console.log('message', event.data),
  //     close: () => console.log('socket closed'),
  //   },
  // });

  const handleSend = () => {
    if (!message.trim()) return
    sendJson(client.socket, { type: 'message', data: message })
    setMessage('')
  }

  const handleClose = () => {
    closeWebSocketSafe(client.socket, 1000, 'done')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Home</h1>
        <p className="mt-2 text-gray-600">WebSocket 연결 예제 페이지</p>
        <p className="mt-2 text-gray-600">브라우저 콘솔을 열면 실시간 CCU 메시지를 볼 수 있습니다.</p>
      </div>

      {/* WebSocket 전송 */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          WebSocket 메시지 전송
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="메시지를 입력하세요"
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
          <button
            onClick={handleSend}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
          >
            전송
          </button>
          <button
            onClick={handleClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
          >
            연결 종료
          </button>
        </div>
      </div>

      {/* 프로젝트 구조 */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          프로젝트 구조
        </h2>
        <pre className="rounded-md bg-gray-50 p-4 text-sm text-gray-700">
          {`src/
├── main.tsx            # 앱 엔트리포인트
├── router.tsx          # 해시 라우터 설정
├── providers.tsx       # QueryClient + RouterProvider
├── App.css             # Tailwind CSS 진입점
├── routes/             # 파일 기반 라우팅 (자동 생성)
│   ├── __root.tsx      # 루트 레이아웃
│   └── index.tsx       # 홈 페이지 라우트
├── layouts/
│   └── RootLayout.tsx  # 공통 레이아웃 (네비게이션)
└── pages/
    └── HomePage.tsx    # 페이지 컴포넌트`}
        </pre>
      </div>

      {/* 의존성 설명 */}
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
              @seamos/websocket
            </span>
            <span>— WebSocket 클라이언트. 자동 재연결 및 JSON 전송 지원</span>
          </div>
        </div>
      </div>
    </div>
  )
}
