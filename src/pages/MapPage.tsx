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
  const [status, setStatus] = useState('Initializing MapLibre map...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    setStatus('Initializing MapLibre map...')
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
          An example of initializing a PMTiles-based MapLibre map in a SeamOS
          Custom UI using <code>@seamos/map-preset</code>.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Map Settings</h2>
        <p className="mt-2 text-sm text-gray-600">
          <code>env=&quot;dev&quot;</code> uses S3 PMTiles, while{' '}
          <code>env=&quot;prod&quot;</code> uses the device-local <code>/maps</code>{' '}
          path. Verify the actual resource paths before deployment.
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
        <h2 className="text-lg font-semibold text-gray-900">Status</h2>
        <p className="mt-2 text-sm text-gray-600">{status}</p>
        {error && (
          <div className="mt-3 rounded-md bg-red-50 p-4 text-sm text-red-700">
            Map error: {error}
          </div>
        )}
        <div className="mt-4 rounded-md bg-blue-50 p-4 text-sm text-blue-800">
          The map may fail to load on browsers without WebGL support, on
          servers that do not support PMTiles Range Requests, or when the{' '}
          <code>/maps</code> resources are missing in the prod environment.
        </div>
      </div>
    </div>
  )
}
