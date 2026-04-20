'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/db/client'
import { PetAvatar } from './pet-avatar'
import {
  prepareAvatarUpload,
  commitAvatar,
  removeAvatar,
} from '@/app/pets/avatar-actions'

type Props = {
  petId: string
  petName: string
  initialSrc: string | null
  hasAvatar: boolean
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

export function PetAvatarUploader({ petId, petName, initialSrc, hasAvatar }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [src, setSrc] = useState<string | null>(initialSrc)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'saving'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [showingAvatar, setShowingAvatar] = useState<boolean>(hasAvatar)
  const [isPending, startTransition] = useTransition()

  async function handleFile(file: File) {
    setError(null)
    setStatus('uploading')

    const prep = await prepareAvatarUpload(petId, file.type, file.size)
    if (prep.ok === false) {
      setError(prep.reason)
      setStatus('idle')
      return
    }

    const supabase = createClient()
    const { error: upErr } = await supabase.storage
      .from('pet-media')
      .uploadToSignedUrl(prep.path, prep.token, file, { contentType: file.type })

    if (upErr) {
      setError('Upload failed. Try again.')
      setStatus('idle')
      return
    }

    setStatus('saving')
    const commit = await commitAvatar(petId, prep.path)
    if (commit.ok === false) {
      setError(commit.reason)
      setStatus('idle')
      return
    }

    // Fetch a fresh signed URL for an immediate preview.
    const { data: signed } = await supabase.storage
      .from('pet-media')
      .createSignedUrl(prep.path, 600)

    setSrc(signed?.signedUrl ?? null)
    setShowingAvatar(true)
    setStatus('idle')
    if (fileRef.current) fileRef.current.value = ''
    router.refresh()
  }

  function handleRemove() {
    startTransition(async () => {
      setError(null)
      const res = await removeAvatar(petId)
      if (res.ok === false) {
        setError(res.reason)
        return
      }
      setSrc(null)
      setShowingAvatar(false)
      router.refresh()
    })
  }

  const busy = status !== 'idle' || isPending

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={src ?? 'placeholder'}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
          >
            <PetAvatar name={petName} src={src} size="xl" />
          </motion.div>
        </AnimatePresence>

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 text-white">
            <span className="spinner" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex flex-col items-start gap-2">
        <p className="font-display text-lg leading-none text-[color:var(--ink)]">
          {showingAvatar ? 'Change photo' : 'Add a photo'}
        </p>
        <p className="text-xs text-[color:var(--ink-soft)]">
          JPG, PNG, WebP or HEIC · up to 8 MB
        </p>

        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="btn btn-sage"
          >
            {status === 'uploading' ? 'Uploading…' : status === 'saving' ? 'Saving…' : showingAvatar ? 'Replace' : 'Upload'}
          </button>

          {showingAvatar && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="btn btn-ghost"
            >
              Remove
            </button>
          )}
        </div>

        {error && (
          <p className="text-xs text-[color:var(--warm)] mt-1">{error}</p>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleFile(f)
        }}
      />
    </div>
  )
}
