'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { PetAvatar } from './pet-avatar'

type PetCard = {
  id: string
  name: string
  species: string
  breed: string | null
  avatarUrl: string | null
}

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] },
  },
}

export function PetsList({ pets }: { pets: PetCard[] }) {
  return (
    <motion.ul
      variants={container}
      initial="hidden"
      animate="show"
      className="grid gap-3 sm:grid-cols-2"
    >
      {pets.map((p) => (
        <motion.li key={p.id} variants={item}>
          <Link
            href={`/pets/${p.id}`}
            className="surface surface-hover group flex items-center gap-4 p-4"
          >
            <PetAvatar name={p.name} src={p.avatarUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg leading-tight text-[color:var(--ink)]">
                {p.name}
              </p>
              <p className="truncate text-xs text-[color:var(--ink-soft)]">
                {p.species}
                {p.breed ? ` · ${p.breed}` : ''}
              </p>
            </div>
            <span
              aria-hidden="true"
              className="translate-x-0 text-[color:var(--ink-mute)] transition-transform duration-300 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </motion.li>
      ))}
    </motion.ul>
  )
}
