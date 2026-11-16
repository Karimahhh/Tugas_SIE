import { NextResponse } from 'next/server'
import { hasAdminSession } from '@/lib/auth'
import { getDatabase } from '@/lib/database'
import { importCsv } from '@/lib/csv'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  if (!await hasAdminSession()) return NextResponse.json({ error: 'Sesi admin tidak valid.' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.csv')) {
    return NextResponse.json({ error: 'Pilih berkas CSV yang valid.' }, { status: 400 })
  }
  if (file.size === 0 || file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'Ukuran berkas harus lebih dari 0 dan tidak melebihi 50 MB.' }, { status: 400 })
  }

  try {
    const result = importCsv(getDatabase(), await file.text(), file.name)
    return NextResponse.json({ ...result, fileName: file.name })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Proses impor CSV gagal.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
