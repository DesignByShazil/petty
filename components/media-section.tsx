'use client'

import { useRef, useState, useTransition } from 'react'
import exifr from 'exifr'
import { createClient } from '@/lib/db/client'
import {
  MAX_FILES_PER_ENTRY,
  validateMediaFile,
  validateBatchCount,
  describeError,
} from '@/lib/media/validate'
import {
  prepareMediaUpload,
  attachMedia,
  removeMedia,
} from '@/app/pets/[id]/log/[entryId]/media-actions'

type MediaThumb = {
  id: string
  mime_type: string
  storage_path: string
  signedUrl?: string
}

type Props = {
  petId: string
  entryId: string
  existing: MediaThumb[]
}

async function readImageDimensions(
  file: File
): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith('image/')) return null
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

async function readCapturedAt(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null
  try {
    const exif = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate'])
    const d: Date | undefined = exif?.DateTimeOriginal ?? exif?.CreateDate
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : null
  } catch {
    return null
  }
}

export function MediaSection({ petId, entryId, existing }: Props) {
  const [items, setItems] = useState(existing)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  const remaining = MAX_FILES_PER_ENTRY - items.length

  async function handleFiles(fileList: FileList | File[]) {
    setError(null)
    const files = Array.from(fileList)
    if (files.length === 0) return

    const countCheck = validateBatchCount(items.length, files.length)
    if (countCheck.ok === false) {
      setError(describeError(countCheck))
      return
    }

    const supabase = createClient()

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const check = validateMediaFile(file)
      if (check.ok === false) {
        setError(describeError(check))
        continue
      }

      setProgress(`Uploading ${i + 1} of ${files.length}`)

      const prep = await prepareMediaUpload({
        petId,
        entryId,
        mimeType: file.type,
        sizeBytes: file.size,
      })
      if (prep.ok === false) {
        setError(prep.reason)
        continue
      }

      const { error: upErr } = await supabase.storage
        .from('pet-media')
        .uploadToSignedUrl(prep.path, prep.token, file, { contentType: file.type })

      if (upErr) {
        setError('Upload failed. Try again.')
        continue
      }

      const [dims, capturedAt] = await Promise.all([
        readImageDimensions(file),
        readCapturedAt(file),
      ])

      const attach = await attachMedia({
        petId,
        entryId,
        path: prep.path,
        mimeType: file.type,
        sizeBytes: file.size,
        width: dims?.width ?? null,
        height: dims?.height ?? null,
        capturedAt,
      })
      if (attach.ok === false) {
        setError(attach.reason)
        continue
      }

      // Read back a short-lived signed URL for immediate preview.
      const { data: signed } = await supabase.storage
        .from('pet-media')
        .createSignedUrl(prep.path, 600)

      setItems((prev) => [
        ...prev,
        {
          id: attach.mediaId,
          mime_type: file.type,
          storage_path: prep.path,
          signedUrl: signed?.signedUrl,
        },
      ])
    }

    setProgress(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) void handleFiles(e.dataTransfer.files)
  }

  function handleRemove(mediaId: string) {
    startTransition(async () => {
      await removeMedia(petId, entryId, mediaId)
      setItems((prev) => prev.filter((m) => m.id !== mediaId))
    })
  }

  return (
    <section>
      <h2 className="text-sm font-medium text-stone-700 mb-3 uppercase tracking-wide">
        Photos & videos
      </h2>

      {items.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 mb-4">
          {items.map((m) => (
            <li
              key={m.id}
              className="relative group aspect-square rounded-lg overflow-hidden border border-stone-200 bg-stone-100"
            >
              {m.mime_type.startsWith('video/') ? (
                <video
                  src={m.signedUrl}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                />
              ) : m.signedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.signedUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-stone-400">
                  {m.mime_type}
                </div>
              )}
              <button
                type="button"
                onClick={() => handleRemove(m.id)}
                disabled={isPending}
                className="absolute top-1 right-1 rounded bg-stone-900/70 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-8 text-center"
        >
          <p className="text-sm text-stone-600 mb-2">
            Drop photos or videos here, or
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            Pick files
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <p className="mt-2 text-xs text-stone-400">
            Up to {remaining} more · 100 MB per file
          </p>
          {progress && <p className="mt-2 text-xs text-stone-500">{progress}</p>}
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      ) : (
        <p className="text-xs text-stone-500">
          Maximum {MAX_FILES_PER_ENTRY} files attached.
        </p>
      )}

    </section>
  )
}
