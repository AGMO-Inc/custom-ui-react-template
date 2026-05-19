import { useEffect, useRef, useState } from 'react'
import {
  bridge,
  BridgeEvent,
  type SettingsWithLocation,
} from '@seamos/bridge/webview'

type BridgeStatus = 'available' | 'unavailable'

type BridgeLog = {
  id: number
  message: string
}

const hasReactNativeWebView = () =>
  typeof window !== 'undefined' &&
  typeof (
    window as Window & {
      ReactNativeWebView?: { postMessage?: unknown }
    }
  ).ReactNativeWebView?.postMessage === 'function'

const formatJson = (value: unknown) => JSON.stringify(value, null, 2)

export function BridgePage() {
  const [status, setStatus] = useState<BridgeStatus>(
    hasReactNativeWebView() ? 'available' : 'unavailable',
  )
  const [settings, setSettings] = useState<SettingsWithLocation | null>(
    bridge.settings,
  )
  const [location, setLocation] = useState(bridge.location)
  const [logs, setLogs] = useState<BridgeLog[]>([])
  const nextLogIdRef = useRef(0)

  const appendLog = (message: string) => {
    nextLogIdRef.current += 1
    setLogs((previous) => [
      { id: nextLogIdRef.current, message },
      ...previous.slice(0, 5),
    ])
  }

  useEffect(() => {
    setStatus(hasReactNativeWebView() ? 'available' : 'unavailable')
    setSettings(bridge.settings)
    setLocation(bridge.location)

    const unsubscribeSettings = bridge.addListener(
      BridgeEvent.SETTINGS_UPDATE,
      (nextSettings) => {
        setSettings(nextSettings)
        appendLog('settings:update received')
      },
    )

    const unsubscribeLocation = bridge.addListener(
      BridgeEvent.LOCATION_UPDATE,
      (nextLocation) => {
        setLocation(nextLocation)
        appendLog('location:update received')
      },
    )

    const unsubscribeCustom = bridge.addListener(
      BridgeEvent.custom('example:reply'),
      (payload) => {
        appendLog(`custom reply: ${formatJson(payload)}`)
      },
    )

    const unsubscribeFile = bridge.addListener(
      BridgeEvent.FILE_DOWNLOAD_RESULT,
      (result) => {
        appendLog(`file download result: ${formatJson(result)}`)
      },
    )

    const unsubscribeError = bridge.addListener(BridgeEvent.ERROR, (error) => {
      appendLog(`bridge error: ${error.message}`)
    })

    return () => {
      unsubscribeSettings()
      unsubscribeLocation()
      unsubscribeCustom()
      unsubscribeFile()
      unsubscribeError()
    }
  }, [])

  const requestHaptic = () => {
    bridge.triggerHaptic('success')
    appendLog('haptic: success requested')
  }

  const requestVibration = () => {
    bridge.triggerVibration({ duration: 300 })
    appendLog('vibration: 300ms requested')
  }

  const sendCustomMessage = () => {
    bridge.sendCustom('example:ping', {
      sentAt: new Date().toISOString(),
      source: 'custom-ui-react-template',
    })
    appendLog('custom message: example:ping sent')
  }

  const requestFileDownload = () => {
    const data = btoa('SeamOS bridge download example')
    bridge.downloadFile({
      data,
      fileName: 'seamos-bridge-example.txt',
      mimeType: 'text/plain',
    })
    appendLog('file:download requested')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">WebView Bridge</h1>
        <p className="mt-2 text-gray-600">
          An example of exchanging settings, location, haptic, vibration, file
          download, and custom messages with the SeamOS Cockpit or a React
          Native WebView using <code>@seamos/bridge/webview</code>.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Runtime status</h2>
        {status === 'available' ? (
          <p className="mt-2 text-sm text-green-700">
            ReactNativeWebView bridge detected.
          </p>
        ) : (
          <div className="mt-2 rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
            In a regular browser / Vite dev server, ReactNativeWebView is not
            available, so native actions are not performed. Verify in an actual
            SeamOS Cockpit WebView or a test harness.
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
          <pre className="mt-4 overflow-x-auto rounded-md bg-gray-50 p-4 text-sm text-gray-700">
            {settings
              ? formatJson(settings)
              : 'settings have not been injected yet.'}
          </pre>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Location</h2>
          <pre className="mt-4 overflow-x-auto rounded-md bg-gray-50 p-4 text-sm text-gray-700">
            {location
              ? formatJson(location)
              : 'location has not been injected yet.'}
          </pre>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Native requests</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={requestHaptic}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Haptic success
          </button>
          <button
            onClick={requestVibration}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Vibration 300ms
          </button>
          <button
            onClick={sendCustomMessage}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Custom message
          </button>
          <button
            onClick={requestFileDownload}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            File download
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Bridge log</h2>
        <ul className="mt-4 space-y-1 text-sm text-gray-600">
          {logs.length === 0 ? (
            <li>No bridge events yet.</li>
          ) : (
            logs.map((entry) => <li key={entry.id}>{entry.message}</li>)
          )}
        </ul>
      </div>
    </div>
  )
}
