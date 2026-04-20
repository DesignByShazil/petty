import { NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'
import { renderSummaryPdf } from '@/lib/pdf/summary'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; summaryId: string }> }
) {
  const { id, summaryId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: pet } = await supabase
    .from('pet')
    .select('id, name')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (!pet) return new NextResponse('Not found', { status: 404 })

  const { data: summary } = await supabase
    .from('summary')
    .select('id, markdown, created_at, range_start, range_end, pdf_storage_path')
    .eq('id', summaryId)
    .eq('pet_id', pet.id)
    .single()
  if (!summary) return new NextResponse('Not found', { status: 404 })

  const pdf = await renderSummaryPdf({
    petName: pet.name,
    generatedAt: summary.created_at,
    rangeStart: summary.range_start ?? '',
    rangeEnd: summary.range_end ?? '',
    markdown: summary.markdown,
  })

  // Persist to storage for re-download, fire-and-forget if it fails.
  if (!summary.pdf_storage_path) {
    const storagePath = `${pet.id}/${summary.id}.pdf`
    const up = await supabase.storage
      .from('summary-pdf')
      .upload(storagePath, pdf, { contentType: 'application/pdf', upsert: true })
    if (!up.error) {
      await supabase.from('summary').update({ pdf_storage_path: storagePath }).eq('id', summary.id)
    }
  }

  // Copy into a fresh ArrayBuffer to satisfy BodyInit typing
  const body = new ArrayBuffer(pdf.byteLength)
  new Uint8Array(body).set(pdf)
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pet.name}-summary-${summary.id.slice(0, 8)}.pdf"`,
    },
  })
}
