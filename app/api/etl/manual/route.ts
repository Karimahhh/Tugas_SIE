import { NextResponse } from 'next/server'
import { hasAdminSession } from '@/lib/auth'
import { getDatabase } from '@/lib/database'
import { analyzeCsv, insertManualRide, type ManualRideInput } from '@/lib/csv'

export const runtime = 'nodejs'

// Metode 3: input manual satu baris pemesanan lewat form.
export async function POST(request: Request) {
  if (!await hasAdminSession()) return NextResponse.json({ error: 'Sesi admin tidak valid.' }, { status: 401 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Unggah dan periksa dataset CSV sebelum mengisi data manual.' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.csv') || file.size === 0 || file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'Unggah dataset CSV yang valid sebelum mengisi data manual.' }, { status: 400 })
  }

  const db = getDatabase()
  const analysis = analyzeCsv(db, await file.text())
  if (!analysis.headerOk || analysis.dataRows === 0) {
    return NextResponse.json({ error: analysis.headerError ?? 'Dataset CSV harus memiliki baris data.' }, { status: 400 })
  }

  const serialized = form.get('data')
  if (typeof serialized !== 'string') {
    return NextResponse.json({ error: 'Data form tidak valid.' }, { status: 400 })
  }

  let body: ManualRideInput
  try {
    const parsed: unknown = JSON.parse(serialized)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Data form tidak valid.' }, { status: 400 })
    }
    body = parsed
  } catch {
    return NextResponse.json({ error: 'Data form tidak valid.' }, { status: 400 })
  }

  try {
    return NextResponse.json(insertManualRide(db, body))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Data gagal disimpan.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
