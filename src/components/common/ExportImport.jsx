import { useRef } from 'react'
import { useAppStore } from '../../store/AppStore'

export default function ExportImport() {
  const { exportData, importData } = useAppStore()
  const fileInput = useRef(null)

  const handleExport = () => {
    const data = exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `journey-tracker-backup-${data.exportedAt.slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        importData(data)
      } catch {
        alert('That file could not be read as a valid backup.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="export-import">
      <button className="link-btn" onClick={handleExport}>Export backup</button>
      <button className="link-btn" onClick={() => fileInput.current?.click()}>Import backup</button>
      <input
        type="file"
        accept="application/json"
        ref={fileInput}
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />
    </div>
  )
}
