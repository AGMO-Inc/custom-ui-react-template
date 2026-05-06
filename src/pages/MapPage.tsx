import { useEffect, useRef, useState } from 'react'
import {
  createSeamOSMap,
  type SeamOSEnv,
  type StylePresetName,
} from '@seamos/map-preset'
import type { Map } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const presets: StylePresetName[] = ['basic', 'terrain']
const environments: SeamOSEnv[] = ['dev', 'prod']

export function MapPage() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const [preset, setPreset] = useState<StylePresetName>('basic')
  const [env, setEnv] = useState<SeamOSEnv>('dev')
  const [status, setStatus] = useState('MapLibre 지도를 초기화하는 중...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    setStatus('MapLibre 지도를 초기화하는 중...')
    setError(null)

    try {
      const map = createSeamOSMap({
        container: containerRef.current,
        preset,
        env,
        maplibre: {
          center: [127.024612, 37.5326],
          zoom: 11,
          maxZoom: 16,
          pitch: preset === 'terrain' ? 45 : 0,
        },
      })

      mapRef.current = map

      map.on('load', () => {
        setStatus(`loaded — preset: ${preset}, env: ${env}`)
      })

      map.on('error', (event) => {
        const mapError = event.error
        setStatus(`error — preset: ${preset}, env: ${env}`)
        setError(
          mapError instanceof Error ? mapError.message : 'Map load error',
        )
      })
    } catch (caughtError) {
      setStatus(`error — preset: ${preset}, env: ${env}`)
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unknown map initialization error',
      )
    }

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [env, preset])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Map Preset</h1>
        <p className="mt-2 text-gray-600">
          <code>@seamos/map-preset</code>을 사용해 SeamOS Custom UI에서 PMTiles
          기반 MapLibre 지도를 초기화하는 예제입니다.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">지도 설정</h2>
        <p className="mt-2 text-sm text-gray-600">
          <code>env=&quot;dev&quot;</code>는 S3 PMTiles를,{' '}
          <code>env=&quot;prod&quot;</code>는 디바이스 로컬 <code>/maps</code>{' '}
          경로를 사용합니다. 배포 전 실제 리소스 경로를 확인하세요.
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="text-sm font-medium text-gray-700">
            Preset
            <select
              value={preset}
              onChange={(event) =>
                setPreset(event.target.value as StylePresetName)
              }
              className="ml-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              {presets.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Env
            <select
              value={env}
              onChange={(event) => setEnv(event.target.value as SeamOSEnv)}
              className="ml-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              {environments.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div ref={containerRef} className="h-[420px] w-full bg-gray-900" />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">상태</h2>
        <p className="mt-2 text-sm text-gray-600">{status}</p>
        {error && (
          <div className="mt-3 rounded-md bg-red-50 p-4 text-sm text-red-700">
            지도 오류: {error}
          </div>
        )}
        <div className="mt-4 rounded-md bg-blue-50 p-4 text-sm text-blue-800">
          WebGL 미지원 브라우저, PMTiles Range Request 미지원 서버, 또는 prod
          환경의 <code>/maps</code> 리소스 누락 시 지도가 로드되지 않을 수
          있습니다.
        </div>
      </div>
    </div>
  )
}
