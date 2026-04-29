# SeamOS App Custom UI React Template

SeamOS 프론트엔드 커스텀 UI 개발을 위한 React 보일러플레이트 템플릿.
`@seamos/connect` 기반 REST/WebSocket 통신과 정적 배포를 위한 해시 라우팅이 기본 설정되어 있습니다.

## 시작하기

```bash
npm install
npm run dev
```

로컬 Vite 개발 서버만 실행하면 SeamOS 런타임 endpoint인 `get_assigned_ports`가 없어서 Connect 초기화가 실패할 수 있습니다.
REST/WebSocket 예제는 실제 SeamOS 런타임 또는 `get_assigned_ports`를 제공하는 개발 프록시에서 테스트하세요.

## 스크립트

| 명령어             | 설명                            |
| ------------------ | ------------------------------- |
| `npm run dev`      | 개발 서버 실행 (localhost:5173) |
| `npm run build`    | TypeScript 검사 + 프로덕션 빌드 |
| `npm run preview`  | 빌드 결과 미리보기              |
| `npm run lint`     | ESLint + Prettier 검사          |
| `npm run lint:fix` | ESLint + Prettier 자동 수정     |

## 프로젝트 구조

```
src/
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
    └── LibraryPage.tsx # SeamOS 라이브러리 안내
```

## 주요 의존성

| 라이브러리          | 설명                                                         |
| ------------------- | ------------------------------------------------------------ |
| **React 19**        | UI 렌더링 라이브러리                                         |
| **TanStack Router** | 타입 안전한 파일 기반 라우팅. 해시 라우팅으로 정적 배포 지원 |
| **TanStack Query**  | 서버 상태 관리 및 데이터 페칭. DevTools 포함                 |
| **Tailwind CSS v4** | 유틸리티 기반 CSS 프레임워크                                 |
| **Vite**            | 빌드 도구. HMR, 코드 스플리팅, 상대 경로 빌드 지원           |
| **@seamos/connect** | SeamOS 런타임 assigned port 기반 REST/WebSocket 연결 헬퍼    |

## Connect 설정

`@seamos/connect`는 SeamOS 런타임의 `get_assigned_ports` endpoint를 통해 앱에 할당된 포트를 초기화합니다.
초기화 이후 REST 요청과 WebSocket 연결은 동일한 assigned port를 사용합니다.

```typescript
import { initPorts } from '@seamos/connect'

await initPorts()
```

주의사항:

- `initPorts()`는 `createWebSocketClient`, `seamosFetch`, `getAssignedPort`보다 먼저 호출해야 합니다.
- REST/WebSocket path는 `/api/example/status`, `/ws/example`처럼 leading slash를 포함해야 합니다.
- host와 port는 직접 넣지 않습니다. `@seamos/connect`가 `location.hostname`과 assigned port로 자동 구성합니다.
- 로컬 Vite 개발 서버만 실행하는 경우 `get_assigned_ports`가 없어서 초기화가 실패할 수 있습니다.

## REST 통신 예제

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

POST 요청은 표준 `RequestInit` 옵션을 그대로 전달합니다.

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

위 endpoint는 템플릿용 placeholder입니다. 실제 앱에서는 백엔드/API 계약에 맞는 path와 payload로 교체하세요.

## WebSocket 통신 예제

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

`autoReconnect`를 사용하는 경우 컴포넌트 unmount나 수동 종료 시 `client.close()`를 호출해 재연결 타이머를 함께 정리하세요.

## 빌드 및 배포

```bash
npm run build
```

`dist/` 폴더가 생성됩니다. 해시 라우팅(`/#/`)과 상대 경로(`base: './'`) 설정으로 별도 서버 설정 없이 정적 호스팅에 바로 배포할 수 있습니다.
