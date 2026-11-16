import { NextResponse } from 'next/server'
import { hasAdminSession } from '@/lib/auth'
import { getDatabase } from '@/lib/database'
import { insertManualRide, type ManualRideInput } from '@/lib/csv'

export const runtime = 'nodejs'

// Metode 3: input manual satu baris pemesanan lewat form.
export async function POST(request: Request) {
  if (!await hasAdminSession()) return NextResponse.json({ error: 'Sesi admin tidak valid.' }, { status: 401 })
  let body: ManualRideInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Data form tidak valid.' }, { status: 400 })
  }
  try {
    return NextResponse.json(insertManualRide(getDatabase(), body))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Data gagal disimpan.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
