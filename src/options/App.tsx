import { useState, useEffect } from 'react'
import { sendMessage } from '../shared/services/messagingService'
import type { AppSettings } from '../shared/types/settings'
import type { ProviderType } from '../shared/types/provider'
import type { Folder } from '../shared/types/folder'

export default function OptionsApp() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saved, setSaved] = useState(false)
  const [folders, setFolders] = useState<Folder[]>([])

  useEffect(() => {
    sendMessage<AppSettings>({ type: 'GET_SETTINGS' }).then(r => {
      if (r?.ok && r.data) setSettings(r.data)
    })
    sendMessage<Folder[]>({ type: 'GET_FOLDER_TREE' }).then(r => {
      if (r?.ok && r.data) setFolders(r.data)
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
        <label className="options-row">
          <span>Enable keyboard shortcut (Alt+Shift+S to save)</span>
          <input
            type="checkbox"
            checked={settings.enableKeyboardShortcuts}
            onChange={e => update({ enableKeyboardShortcuts: e.target.checked })}
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
        <div className="options-row-group">
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
          <p className="options-help-text" style={{ marginLeft: 'auto', textAlign: 'right', fontSize: 11, color: '#5f6368', marginTop: -8, marginBottom: 12 }}>
            Note: Confirmation is skipped in Auto mode.
          </p>
        </div>
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
        <h2>Popup</h2>
        <label className="options-row">
          <span>Default view</span>
          <select
            value={settings.popupDefaultView}
            onChange={e => update({ popupDefaultView: e.target.value as AppSettings['popupDefaultView'] })}
          >
            <option value="translate">Translate</option>
            <option value="recent">Recent</option>
            <option value="search">Search</option>
            <option value="folders">Folders</option>
          </select>
        </label>
        <label className="options-row">
          <span>Default save folder</span>
          <select
            value={settings.defaultFolderId ?? ''}
            onChange={e => update({ defaultFolderId: e.target.value || null })}
          >
            <option value="">None (root)</option>
            {folders.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </label>
        <label className="options-row">
          <span>Search debounce (ms)</span>
          <input
            type="number"
            className="options-number"
            min={0}
            max={2000}
            step={50}
            value={settings.searchDebounceMs}
            onChange={e => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v) && v >= 0) update({ searchDebounceMs: v })
            }}
          />
        </label>
      </section>

      <section className="options-section">
        <h2>Spaced Repetition (SRS)</h2>
        <label className="options-row">
          <span>Enable SRS flashcard review</span>
          <input
            type="checkbox"
            checked={settings.srs.enabled}
            onChange={e => update({ srs: { ...settings.srs, enabled: e.target.checked } })}
          />
        </label>
        <label className="options-row">
          <span>Auto-enroll new saves for review</span>
          <input
            type="checkbox"
            checked={settings.srs.autoEnrollOnSave}
            onChange={e => update({ srs: { ...settings.srs, autoEnrollOnSave: e.target.checked } })}
          />
        </label>
        <label className="options-row">
          <span>Daily review limit</span>
          <input
            type="number"
            className="options-number"
            min={1}
            max={200}
            value={settings.srs.dailyReviewLimit}
            onChange={e => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v) && v >= 1) update({ srs: { ...settings.srs, dailyReviewLimit: v } })
            }}
          />
        </label>
      </section>

      <section className="options-section">
        <h2>Translation Provider</h2>
        <label className="options-row">
          <span>Provider</span>
          <select
            value={settings.provider.type}
            onChange={e => update({ provider: { ...settings.provider, type: e.target.value as ProviderType } })}
          >
            <option value="google_translate_web">Google Translate (free, no key)</option>
            <option value="libre_translate">LibreTranslate (free)</option>
            <option value="deepl">DeepL</option>
            <option value="custom_http">Custom HTTP endpoint</option>
            <option value="mock">Mock (testing)</option>
          </select>
        </label>
        {(settings.provider.type === 'libre_translate' || settings.provider.type === 'custom_http') && (
          <label className="options-row">
            <span>Endpoint URL</span>
            <input
              type="url"
              value={settings.provider.endpoint}
              onChange={e => update({ provider: { ...settings.provider, endpoint: e.target.value } })}
              placeholder={settings.provider.type === 'libre_translate' ? 'https://libretranslate.com (optional)' : 'https://…'}
            />
          </label>
        )}
        {(settings.provider.type === 'deepl' || settings.provider.type === 'custom_http') && (
          <label className="options-row">
            <span>API Key{settings.provider.type === 'deepl' ? ' *' : ''}</span>
            <input
              type="password"
              value={settings.provider.apiKey}
              onChange={e => update({ provider: { ...settings.provider, apiKey: e.target.value } })}
              placeholder={settings.provider.type === 'deepl' ? 'Required' : 'Optional'}
            />
          </label>
        )}
      </section>

      <section className="options-section">
        <h2>About</h2>
        <p className="options-about">
          A1 – Google Translate Manager v1.0.0<br />
          All data is stored locally. No external servers.
        </p>
      </section>
    </div>
  )
}
