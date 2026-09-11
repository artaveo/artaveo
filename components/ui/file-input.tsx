'use client'

import { Upload, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import { IconButton } from '@/components/ui/actions'
import { cn } from '@/lib/utils'

/**
 * FileInput — drag-and-drop / click-to-browse shell around a native
 * `<input type="file">`. This is the shell only (§4.3 roadmap note): it
 * exposes the picked `File[]` via `onFilesChange` but does not upload,
 * validate size/type against a backend, or show progress — that wiring
 * lands with the real upload flow in Phase 15.
 */
function FileInput({
  className,
  accept,
  multiple,
  disabled,
  label = 'Choose a file or drag it here',
  hint,
  onFilesChange,
  'aria-invalid': ariaInvalid,
}: {
  className?: string
  accept?: string
  multiple?: boolean
  disabled?: boolean
  label?: string
  hint?: string
  onFilesChange?: (files: File[]) => void
  'aria-invalid'?: boolean
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)

  function commit(next: File[]) {
    setFiles(next)
    onFilesChange?.(next)
  }

  function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    const incoming = Array.from(list)
    commit(multiple ? [...files, ...incoming] : incoming.slice(0, 1))
  }

  function removeAt(index: number) {
    commit(files.filter((_, i) => i !== index))
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label
        htmlFor={inputId}
        data-slot="file-input"
        data-dragging={isDragging || undefined}
        aria-disabled={disabled}
        aria-invalid={ariaInvalid}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          if (!disabled) handleFiles(event.dataTransfer.files)
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-card px-4 py-8 text-center transition-colors',
          'hover:border-ring/60 hover:bg-muted/40',
          'data-[dragging]:border-ring data-[dragging]:bg-muted/60',
          'aria-disabled:pointer-events-none aria-disabled:opacity-50',
          'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
          'has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50',
        )}
      >
        <Upload aria-hidden="true" className="size-5 text-muted-foreground" />
        <span className="text-sm text-foreground">{label}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(event) => handleFiles(event.target.files)}
          className="sr-only"
        />
      </label>

      {files.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground"
            >
              <span className="truncate">{file.name}</span>
              <IconButton
                type="button"
                size="xs"
                variant="ghost"
                aria-label={`Remove ${file.name}`}
                onClick={() => removeAt(index)}
              >
                <X className="size-3.5" aria-hidden="true" />
              </IconButton>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export { FileInput }
