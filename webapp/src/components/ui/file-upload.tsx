import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'

interface FileUploadProps {
  accept: string
  maxSize: number
  onFileSelect: (file: File | null) => void
  label: string
  error?: string | null
  imagePreview?: boolean
  disabled?: boolean
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUpload({ accept, maxSize, onFileSelect, label, error, imagePreview, disabled }: FileUploadProps) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [internalError, setInternalError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  const handleFile = (f: File) => {
    const exts = accept.split(',').map((e) => e.trim().replace('.', '').toLowerCase())
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (!exts.includes(ext)) {
      setInternalError(`Неподдерживаемый формат: .${ext} / Unsupported format: .${ext}`)
      onFileSelect(null)
      return
    }
    if (f.size > maxSize) {
      setInternalError(`Файл слишком большой (макс. ${formatSize(maxSize)}) / File too large (max ${formatSize(maxSize)})`)
      onFileSelect(null)
      return
    }
    setInternalError(null)
    setFile(f)
    onFileSelect(f)
    if (imagePreview && f.type.startsWith('image/')) {
      if (preview) URL.revokeObjectURL(preview)
      setPreview(URL.createObjectURL(f))
    }
  }

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault()
    dragCounter.current += 1
    setDragging(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setDragging(false)
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    dragCounter.current = 0
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) handleFile(selected)
  }

  const handleRemove = () => {
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setInternalError(null)
    onFileSelect(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const displayError = error ?? internalError

  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
        {label}
      </label>

      {file ? (
        <div
          className="flex items-start gap-3 p-3"
          style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
        >
          {preview && (
            <img
              src={preview}
              alt="Preview"
              style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm truncate" style={{ color: 'var(--text)' }}>{file.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatSize(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs shrink-0 px-2 py-1"
            style={{
              color: 'var(--text-muted)',
              backgroundColor: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            Удалить / Remove
          </button>
        </div>
      ) : (
        <div
          onClick={() => !disabled && inputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center gap-2 py-6 cursor-pointer transition-colors"
          style={{
            borderRadius: 'var(--radius)',
            border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
            backgroundColor: dragging ? 'rgba(var(--accent-rgb), 0.04)' : 'var(--bg)',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {dragging ? 'Отпустите / Drop here' : 'Перетащите или кликните / Drag or click'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {accept.split(',').map((e) => e.trim().toUpperCase()).join(', ')} · макс. {formatSize(maxSize)}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
            disabled={disabled}
          />
        </div>
      )}

      {displayError && (
        <p className="text-xs mt-1" style={{ color: 'var(--accent)' }}>{displayError}</p>
      )}
    </div>
  )
}
