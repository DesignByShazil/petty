import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import React from 'react'

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: 'Helvetica', color: '#1c1917' },
  meta: { fontSize: 9, color: '#78716c', marginBottom: 16 },
  h1: { fontSize: 20, fontWeight: 700, marginBottom: 8 },
  h2: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 14, marginBottom: 4, color: '#44403c' },
  p: { marginBottom: 4, lineHeight: 1.45 },
  li: { marginLeft: 10, marginBottom: 2, lineHeight: 1.45 },
})

type Block =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'p'; text: string }
  | { type: 'li'; text: string }

function parseMarkdown(md: string): Block[] {
  const blocks: Block[] = []
  for (const rawLine of md.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    if (line.startsWith('# ')) blocks.push({ type: 'h1', text: line.slice(2) })
    else if (line.startsWith('## ')) blocks.push({ type: 'h2', text: line.slice(3) })
    else if (line.startsWith('- ')) blocks.push({ type: 'li', text: line.slice(2) })
    else blocks.push({ type: 'p', text: line })
  }
  return blocks
}

// Strip ** and _ markers so react-pdf Text renders clean.
function clean(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/_(.+?)_/g, '$1')
}

export type SummaryPdfData = {
  petName: string
  generatedAt: string
  rangeStart: string
  rangeEnd: string
  markdown: string
}

export function SummaryDocument({ data }: { data: SummaryPdfData }) {
  const blocks = parseMarkdown(data.markdown)
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.meta}>
          {data.petName} · Generated {new Date(data.generatedAt).toLocaleString()}
        </Text>
        {blocks.map((b, i) => {
          if (b.type === 'h1') return <Text key={i} style={styles.h1}>{clean(b.text)}</Text>
          if (b.type === 'h2') return <Text key={i} style={styles.h2}>{clean(b.text)}</Text>
          if (b.type === 'li') return <Text key={i} style={styles.li}>• {clean(b.text)}</Text>
          return <Text key={i} style={styles.p}>{clean(b.text)}</Text>
        })}
      </Page>
    </Document>
  )
}

export async function renderSummaryPdf(data: SummaryPdfData): Promise<Uint8Array> {
  const buf = await renderToBuffer(<SummaryDocument data={data} />) as unknown as Buffer
  return new Uint8Array(buf)
}

// Export the parser for tests
export const __parseMarkdown = parseMarkdown
