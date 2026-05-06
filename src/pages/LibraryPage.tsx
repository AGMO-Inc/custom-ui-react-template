export function LibraryPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Library</h1>
        <p className="mt-2 text-gray-600">
          SeamOS Custom UI 앱 개발에 사용할 수 있는 공식 <code>@seamos</code>{' '}
          라이브러리와 선택 기준입니다.
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 text-sm text-blue-900">
        <h2 className="text-base font-semibold">선택 가이드</h2>
        <ul className="mt-3 list-inside list-disc space-y-1">
          <li>
            REST/WebSocket 통신은 기본 포함된 <code>@seamos/connect</code>를
            사용합니다.
          </li>
          <li>
            지도 UI가 필요한 앱은 <code>@seamos/map-preset</code>,{' '}
            <code>maplibre-gl</code>, <code>pmtiles</code>를 사용합니다. 이
            템플릿에는 실행 샘플을 위해 포함되어 있으며, 지도 기능이 필요 없으면{' '}
            <code>/map</code> route와 관련 dependency를 제거해도 됩니다.
          </li>
          <li>
            Cockpit WebView native 연동은 <code>@seamos/bridge</code>를
            사용합니다. 이 템플릿에는 WebView 샘플을 위해 포함되어 있습니다.
          </li>
          <li>
            <code>@seamos/websocket</code>은 deprecated입니다. 신규 앱에서는
            추가하지 말고 <code>@seamos/connect</code>로 이전하세요.
          </li>
        </ul>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            @seamos/connect
          </h2>
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            기본 포함
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
          SeamOS 런타임에서 할당된 포트를 자동으로 해석해 REST와 WebSocket
          통신을 연결하는 기본 헬퍼 라이브러리입니다.
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
            지도 앱 선택 설치
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
          MapLibre GL과 PMTiles를 사용해 dev(S3)와 prod(디바이스 로컬{' '}
          <code>/maps</code>) 환경을 전환하는 지도 프리셋입니다. 실행 예제는{' '}
          <code>/map</code> 라우트에서 확인할 수 있습니다.
        </p>
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-800">설치</h3>
          <pre className="mt-2 overflow-x-auto rounded-md bg-gray-50 p-3 text-sm text-gray-700">
            npm install @seamos/map-preset maplibre-gl pmtiles
          </pre>
        </div>
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-800">React 예제</h3>
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
            WebView 선택 설치
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
          React Native WebView와 Custom UI 사이에서 settings, location, haptic,
          vibration, file download, custom message를 주고받는 타입 안전
          bridge입니다. 실행 예제는 <code>/bridge</code> 라우트에서 확인할 수
          있습니다.
        </p>
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-800">WebView 예제</h3>
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
          일반 브라우저에서는 ReactNativeWebView가 없으므로 native 요청은 실제로
          처리되지 않습니다. SeamOS Cockpit WebView 또는 테스트 harness에서
          검증하세요.
        </div>
      </div>
    </div>
  )
}
