import type { UploadProgress } from '@/lib/upload'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatSpeed(bytesPerSecond: number): string {
  return bytesPerSecond > 0 ? `${formatBytes(bytesPerSecond)}/с` : '—'
}

function formatEta(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—'
  if (seconds < 60) return `${Math.max(1, Math.ceil(seconds))} с`
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.ceil(seconds % 60)
  return `${minutes} мин ${remainder} с`
}

const phaseLabels = {
  preparing: 'Подготовка файла / Preparing file',
  uploading: 'Загрузка / Uploading',
  processing: 'Сборка 3D-сцены / Processing bundle',
  hashing: 'Проверка целостности / Verifying',
  complete: 'Загрузка завершена / Upload complete',
} as const

export function UploadProgressView({ progress }: { progress: UploadProgress | null }) {
  if (!progress) return null

  const percent = Math.max(0, Math.min(100, progress.percent))
  const isComplete = progress.phase === 'complete'

  return (
    <div
      role="status"
      aria-live="polite"
      className="space-y-2 p-3"
      style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate" style={{ color: 'var(--text)' }}>
          {phaseLabels[progress.phase]}: {progress.fileName}
        </span>
        <strong style={{ color: isComplete ? 'var(--accent)' : 'var(--text)', flexShrink: 0 }}>{percent}%</strong>
      </div>
      <div
        aria-label={`Upload progress ${percent}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        role="progressbar"
        style={{ height: 8, overflow: 'hidden', backgroundColor: 'var(--surface)', borderRadius: 999 }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            backgroundColor: isComplete ? 'var(--accent)' : 'var(--text)',
            borderRadius: 999,
            transition: 'width 180ms ease-out',
          }}
        />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>{formatBytes(progress.loaded)} / {formatBytes(progress.total)}</span>
        {!isComplete && progress.phase === 'uploading' && <span>{formatSpeed(progress.bytesPerSecond)}</span>}
        {!isComplete && progress.phase === 'uploading' && <span>Осталось / ETA: {formatEta(progress.etaSeconds)}</span>}
      </div>
    </div>
  )
}