import { useState, useEffect } from 'react'
import { sendMessage } from '../shared/services/messagingService'
import type { AppSettings } from '../shared/types/settings'

export default function OptionsApp() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    sendMessage<AppSettings>({ type: 'GET_SETTINGS' }).then(r => {
      if (r?.ok && r.data) setSettings(r.data)
    })
  }, [])

  const update = async (patch: Partial<AppSettings>) => {
    const res = await sendMessage<AppSettings>({ type: 'UPDATE_SETTINGS', payload: patch })
    if (res?.ok && res.data) {
      setSettings(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  if (!settings) return <div className="options-root"><p>Loading…</p></div>

  return (
    <div className="options-root">
      <header className="options-header">
        <h1>A1 – Google Translate Manager</h1>
        <p>Settings</p>
        {saved && <span className="saved-badge">Saved ✓</span>}
      </header>

      <section className="options-section">
        <h2>Capture</h2>
        <label className="options-row">
          <span>Capture mode</span>
          <select
            value={settings.captureMode}
            onChange={e => update({ captureMode: e.target.value as AppSettings['captureMode'] })}
          >
            <option value="manual">Manual — only save when I click Save</option>
            <option value="auto">Auto — save every detected translation</option>
            <option value="off">Off — disable capture</option>
          </select>
        </label>
        <label className="options-row">
          <span>Show toolbar on Google Translate</span>
          <input
            type="checkbox"
            checked={settings.showInjectedButtons}
            onChange={e => update({ showInjectedButtons: e.target.checked })}
          />
        </label>
      </section>

      <section className="options-section">
        <h2>Duplicates</h2>
        <label className="options-row">
          <span>When the same translation is detected again</span>
          <select
            value={settings.dedupePolicy}
            onChange={e => update({ dedupePolicy: e.target.value as AppSettings['dedupePolicy'] })}
          >
            <option value="update_existing">Update existing (increment count)</option>
            <option value="create_new">Create a new entry</option>
          </select>
        </label>
      </section>

      <section className="options-section">
        <h2>Privacy</h2>
        <label className="options-row">
          <span>Confirm before saving</span>
          <input
            type="checkbox"
            checked={settings.privacyMode.requireConfirmationBeforeSaving}
            onChange={e =>
              update({ privacyMode: { ...settings.privacyMode, requireConfirmationBeforeSaving: e.target.checked } })
            }
          />
        </label>
        <label className="options-row">
          <span>Mask popup content</span>
          <input
            type="checkbox"
            checked={settings.privacyMode.maskPopupContent}
            onChange={e =>
              update({ privacyMode: { ...settings.privacyMode, maskPopupContent: e.target.checked } })
            }
          />
        </label>
      </section>

      <section className="options-section">
        <h2>About</h2>
        <p className="options-about">
          A1 – Google Translate Manager v0.1.0<br />
          All data is stored locally. No external servers.
        </p>
      </section>
    </div>
  )
}
