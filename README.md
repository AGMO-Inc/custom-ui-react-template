# SeamOS App Custom UI React Template

SeamOS 프론트엔드 커스텀 UI 개발을 위한 React 보일러플레이트 템플릿.
WebSocket 기반 CCU 통신과 정적 배포를 위한 해시 라우팅이 기본 설정되어 있습니다.

## 시작하기

```bash
npm install
npm run dev
```

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 (localhost:5173) |
| `npm run build` | TypeScript 검사 + 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | ESLint + Prettier 검사 |
| `npm run lint:fix` | ESLint + Prettier 자동 수정 |

## 프로젝트 구조

```
src/
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
    └── HomePage.tsx    # 페이지 컴포넌트
```

## 주요 의존성

| 라이브러리 | 설명 |
|-----------|------|
| **React 19** | UI 렌더링 라이브러리 |
| **TanStack Router** | 타입 안전한 파일 기반 라우팅. 해시 라우팅으로 정적 배포 지원 |
| **TanStack Query** | 서버 상태 관리 및 데이터 페칭. DevTools 포함 |
| **Tailwind CSS v4** | 유틸리티 기반 CSS 프레임워크 |
| **Vite** | 빌드 도구. HMR, 코드 스플리팅, 상대 경로 빌드 지원 |
| **@seamos/websocket** | WebSocket 클라이언트. 자동 재연결 및 JSON 전송 지원 |

## WebSocket 설정

### CCU 배포

```typescript
const client = createWebSocketClient('ws://192.168.32.1/socket', {
  useCCUPort: true,
  defaultPort: 1456,
  ccuPortEndpoint: 'get_assigned_ports',
  autoReconnect: true,
})
```

### 로컬 테스트

```typescript
const client = createWebSocketClient('ws://127.0.0.1/socket', {
  useCCUPort: false,
  manualPort: 8081,
  autoReconnect: true,
  reconnectInterval: 3000,
})
```

## 빌드 및 배포

```bash
npm run build
```

`dist/` 폴더가 생성됩니다. 해시 라우팅(`/#/`)과 상대 경로(`base: './'`) 설정으로 별도 서버 설정 없이 정적 호스팅에 바로 배포할 수 있습니다.
