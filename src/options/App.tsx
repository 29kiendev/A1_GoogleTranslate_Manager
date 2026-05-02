import { useState, useEffect } from 'react'
import { sendMessage } from '../shared/services/messagingService'
import type { AppSettings } from '../shared/types/settings'
import type { ProviderType } from '../shared/types/provider'
import type { Folder } from '../shared/types/folder'
import type { TranslateVaultExport } from '../shared/types/importExport'

export default function OptionsApp() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saved, setSaved] = useState(false)
  const [folders, setFolders] = useState<Folder[]>([])
  const [testingProvider, setTestingProvider] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    sendMessage<AppSettings>({ type: 'GET_SETTINGS' }).then(r => {
      if (r?.ok && r.data) setSettings(r.data)
    })
    sendMessage<Folder[]>({ type: 'GET_FOLDER_TREE' }).then(r => {
      if (r?.ok && r.data) setFolders(r.data)
    })
  }, [])

  useEffect(() => {
    setTestResult(null)
  }, [settings?.provider.type])

  const update = async (patch: Partial<AppSettings>) => {
    const res = await sendMessage<AppSettings>({ type: 'UPDATE_SETTINGS', payload: patch })
    if (res?.ok && res.data) {
      setSettings(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleTestProvider = async () => {
    setTestingProvider(true)
    setTestResult(null)
    const res = await sendMessage<{ result: string; latencyMs: number }>({ type: 'TEST_PROVIDER' })
    setTestingProvider(false)
    if (res?.ok && res.data) {
      setTestResult({ ok: true, message: `✓ "${res.data.result}" (${res.data.latencyMs}ms)` })
    } else {
      setTestResult({ ok: false, message: `✗ ${res?.error?.message ?? 'Test failed'}` })
    }
  }

  const handleDownloadBackup = async () => {
    setDownloading(true)
    try {
      const res = await sendMessage<TranslateVaultExport>({ type: 'EXPORT_DATA', payload: { format: 'json' } })
      if (res?.ok && res.data) {
        const json = JSON.stringify(res.data, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `translate-vault-backup-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        alert('Export failed: ' + (res?.error?.message ?? 'Unknown error'))
      }
    } catch (err) {
      alert('Export failed: ' + String(err))
    } finally {
      setDownloading(false)
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
        <label className="options-row">
          <span>Translation font scale</span>
          <input
            type="number"
            className="options-number"
            min={0.75}
            max={2.0}
            step={0.05}
            value={settings.uiPreferences?.translateFontScale ?? 1.0}
            onChange={e => {
              const v = parseFloat(e.target.value)
              if (!isNaN(v) && v >= 0.75 && v <= 2.0) {
                update({ uiPreferences: { ...settings.uiPreferences, translateFontScale: v } })
              }
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
        <div className="options-row" style={{ marginTop: 16 }}>
          <button
            className="btn-primary"
            onClick={handleTestProvider}
            disabled={testingProvider}
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            {testingProvider ? 'Testing…' : 'Test Provider'}
          </button>
          {testResult && (
            <span style={{
              marginLeft: 12,
              fontSize: 12,
              color: testResult.ok ? '#188038' : '#d93025',
              fontWeight: 500
            }}>
              {testResult.message}
            </span>
          )}
        </div>
      </section>

      <section className="options-section">
        <h2>Floating Action Button (FAB)</h2>
        <label className="options-row">
          <span>Enable FAB on all websites</span>
          <input
            type="checkbox"
            checked={settings.fab.enabled}
            onChange={async e => {
              if (e.target.checked) {
                const granted = await chrome.permissions.request({
                  origins: ['<all_urls>'],
                })
                if (granted) {
                  update({ fab: { ...settings.fab, enabled: true } })
                }
              } else {
                update({ fab: { ...settings.fab, enabled: false } })
              }
            }}
          />
        </label>
        <p className="options-help-text" style={{ fontSize: 11, color: '#5f6368', marginTop: -8, marginBottom: 12 }}>
          Requires permission to access all websites.
        </p>
        <label className="options-row">
          <span>Auto-hide when not in use</span>
          <input
            type="checkbox"
            checked={settings.fab.autoHide}
            onChange={e => update({ fab: { ...settings.fab, autoHide: e.target.checked } })}
          />
        </label>
        <label className="options-row">
          <span>Open mode</span>
          <select
            value={settings.fab.openMode}
            onChange={e => update({ fab: { ...settings.fab, openMode: e.target.value as 'inline' | 'window' } })}
          >
            <option value="inline">Inline on page (overlay)</option>
            <option value="window">Separate popup window</option>
          </select>
        </label>
        <label className="options-row">
          <span>Default side</span>
          <select
            value={settings.fab.position.side}
            onChange={e =>
              update({
                fab: {
                  ...settings.fab,
                  position: { ...settings.fab.position, side: e.target.value as 'left' | 'right' },
                },
              })
            }
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </label>
        <label className="options-row">
          <span>Global position (same for all sites)</span>
          <input
            type="checkbox"
            checked={settings.fab.globalPosition}
            onChange={e => update({ fab: { ...settings.fab, globalPosition: e.target.checked } })}
          />
        </label>
      </section>

      <section className="options-section">
        <h2>About</h2>
        <p className="options-about">
          A1 – Google Translate Manager v2.0.0<br />
          All data is stored locally. No external servers.
        </p>
        <button
          className="btn"
          disabled={downloading}
          onClick={handleDownloadBackup}
          style={{ marginTop: 12, padding: '6px 16px' }}
        >
          {downloading ? 'Preparing backup…' : 'Download JSON backup'}
        </button>
      </section>
    </div>
  )
}
