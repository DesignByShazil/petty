import Image from 'next/image'

type Size = 'sm' | 'md' | 'lg' | 'xl'

const sizePx: Record<Size, number> = {
  sm: 36,
  md: 48,
  lg: 64,
  xl: 112,
}

const sizeClass: Record<Size, string> = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-base',
  xl: 'h-28 w-28 text-2xl',
}

function initialsFor(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '·'
  const parts = trimmed.split(/\s+/)
  const chars = parts.length === 1 ? parts[0].slice(0, 2) : (parts[0][0] ?? '') + (parts[1][0] ?? '')
  return chars.toUpperCase()
}

// Deterministic warm gradient per pet so empty avatars still feel personal.
function tintFor(seed: string): { from: string; to: string } {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  const hue = hash % 360
  // keep in warm/sage band
  const h1 = 30 + (hue % 80)
  const h2 = 90 + (hue % 70)
  return {
    from: `hsl(${h1} 42% 86%)`,
    to: `hsl(${h2} 32% 78%)`,
  }
}

type Props = {
  name: string
  src?: string | null
  size?: Size
  className?: string
}

/**
 * Read-only pet avatar. Falls back to a warm gradient + initials when
 * no signed URL is supplied.
 */
export function PetAvatar({ name, src, size = 'md', className = '' }: Props) {
  const { from, to } = tintFor(name)
  const dim = sizePx[size]
  const ring =
    'ring-1 ring-[color:var(--line)] shadow-[0_6px_18px_-12px_rgba(33,26,18,0.35)]'

  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full ${sizeClass[size]} ${ring} ${className}`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      aria-hidden={src ? 'true' : undefined}
    >
      {src ? (
        <Image
          src={src}
          alt={`${name}`}
          width={dim}
          height={dim}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-display font-semibold text-[color:var(--ink)]/70">
          {initialsFor(name)}
        </span>
      )}
    </span>
  )
}
