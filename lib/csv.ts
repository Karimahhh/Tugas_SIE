import { createHash } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'

const columns = [
  'booking_id', 'booking_date', 'booking_time', 'booking_status', 'customer_id',
  'vehicle_type', 'pickup_location', 'drop_location', 'avg_vtat', 'avg_ctat',
  'cancelled_by_customer', 'cancel_customer_reason', 'cancelled_by_driver',
  'cancel_driver_reason', 'incomplete_rides', 'incomplete_reason', 'booking_value',
  'ride_distance', 'driver_rating', 'customer_rating', 'payment_method',
] as const

const csvHeaders = [
  'Date', 'Time', 'Booking ID', 'Booking Status', 'Customer ID', 'Vehicle Type',
  'Pickup Location', 'Drop Location', 'Avg VTAT', 'Avg CTAT',
  'Cancelled Rides by Customer', 'Reason for cancelling by Customer',
  'Cancelled Rides by Driver', 'Driver Cancellation Reason', 'Incomplete Rides',
  'Incomplete Rides Reason', 'Booking Value', 'Ride Distance', 'Driver Ratings',
  'Customer Rating', 'Payment Method',
]
const databaseHeaders = [
  'Booking ID', 'Date', 'Time', 'Booking Status', 'Customer ID', 'Vehicle Type',
  'Pickup Location', 'Drop Location', 'Avg VTAT', 'Avg CTAT',
  'Cancelled Rides by Customer', 'Reason for cancelling by Customer',
  'Cancelled Rides by Driver', 'Driver Cancellation Reason', 'Incomplete Rides',
  'Incomplete Rides Reason', 'Booking Value', 'Ride Distance', 'Driver Ratings',
  'Customer Rating', 'Payment Method',
]

const statementSql = `INSERT INTO rides (${columns.join(', ')})
  VALUES (${columns.map(() => '?').join(', ')})`

function parseRecords(text: string, onRecord: (record: string[]) => void) {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  let record: string[] = []
  let field = ''
  let quoted = false
  let atFieldStart = true

  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"' && atFieldStart) {
      quoted = true
      atFieldStart = false
    } else if (char === ',') {
      record.push(field)
      field = ''
      atFieldStart = true
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++
      record.push(field)
      if (record.some(value => value.length > 0)) onRecord(record)
      record = []
      field = ''
      atFieldStart = true
    } else {
      field += char
      atFieldStart = false
    }
  }

  if (field.length > 0 || record.length > 0) {
    record.push(field)
    if (record.some(value => value.length > 0)) onRecord(record)
  }
  if (quoted) throw new Error('CSV memiliki tanda kutip yang tidak berpasangan.')
}

function nullable(value: string) {
  const cleaned = value.trim()
  return cleaned === '' || cleaned.toLowerCase() === 'null' ? null : cleaned
}

function bookingId(value: string) {
  return value.trim().replace(/^"+|"+$/g, '')
}

export type ImportMode = 'replace' | 'append'

export function importCsv(db: DatabaseSync, text: string, source: string, mode: ImportMode = 'replace') {
  let headerSeen = false
  let rowNumber = 0
  let imported = 0
  let skipped = 0
  const insert = db.prepare(statementSql)
  const recordImport = db.prepare(
    'INSERT INTO dataset_imports (source, row_count, checksum) VALUES (?, ?, ?)',
  )

  db.exec('BEGIN IMMEDIATE')
  try {
    // Mode tambah: Booking ID yang sudah ada (di database maupun di berkas itu sendiri) dilewati, bukan digandakan.
    const knownIds = mode === 'append'
      ? new Set((db.prepare('SELECT booking_id FROM rides').all() as { booking_id: string }[]).map(r => r.booking_id))
      : null
    parseRecords(text, record => {
      rowNumber++
      if (!headerSeen) {
        const headers = record.map(value => value.trim())
        if (headers.length !== csvHeaders.length || csvHeaders.some((header, index) => headers[index] !== header)) {
          throw new Error('Header atau urutan kolom CSV tidak sesuai format pemesanan yang didukung.')
        }
        headerSeen = true
        if (mode === 'replace') db.exec('DELETE FROM rides')
        return
      }

      if (record.length !== columns.length) {
        throw new Error(`Jumlah kolom pada baris ${rowNumber} tidak sesuai header CSV.`)
      }

      const values = record.map(nullable)
      const id = bookingId(record[headersIndex('Booking ID')])
      const date = values[headersIndex('Date')]
      const status = values[headersIndex('Booking Status')]
      const timestamp = date ? Date.parse(`${date}T00:00:00.000Z`) : NaN
      if (!id || !date || !status || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) {
        throw new Error(`ID, tanggal, atau status pemesanan tidak valid pada baris ${rowNumber}.`)
      }

      const numericHeaders = [
        'Avg VTAT', 'Avg CTAT', 'Cancelled Rides by Customer', 'Cancelled Rides by Driver',
        'Incomplete Rides', 'Booking Value', 'Ride Distance', 'Driver Ratings', 'Customer Rating',
      ]
      for (const header of numericHeaders) {
        const value = values[headersIndex(header)]
        if (value !== null && !Number.isFinite(Number(value))) {
          throw new Error(`Nilai ${header} tidak valid pada baris ${rowNumber}.`)
        }
      }

      if (knownIds) {
        if (knownIds.has(id)) { skipped++; return }
        knownIds.add(id)
      }
      values[headersIndex('Booking ID')] = id
      const ordered = databaseHeaders.map(header => values[headersIndex(header)])
      insert.run(...ordered)
      imported++
    })

    if (!headerSeen) throw new Error('CSV tidak memiliki baris pemesanan untuk diimpor.')
    if (imported === 0) {
      throw new Error(skipped > 0
        ? `Semua ${skipped.toLocaleString('id-ID')} baris sudah ada di database (Booking ID sama). Tidak ada data baru yang ditambahkan.`
        : 'CSV tidak memiliki baris pemesanan untuk diimpor.')
    }
    recordImport.run(mode === 'append' ? `${source} (tambah)` : source, imported, createHash('sha256').update(text).digest('hex'))
    const { totalRows, latestDate } = refreshMetadata(db)
    db.exec('COMMIT')
    return { mode, rowCount: imported, skipped, totalRows, latestDate }
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function headersIndex(header: string) {
  return csvHeaders.indexOf(header)
}

// Menyegarkan jumlah baris & tanggal terbaru. Dipanggil setiap data berubah.
export function refreshMetadata(db: DatabaseSync) {
  const stats = db.prepare('SELECT COUNT(*) AS total, MAX(booking_date) AS latest FROM rides').get() as
    { total: number; latest: string | null }
  const totalRows = Number(stats.total)
  const latestDate = stats.latest ?? ''
  db.prepare("INSERT OR REPLACE INTO metadata (key, value) VALUES ('row_count', ?)").run(String(totalRows))
  db.prepare("INSERT OR REPLACE INTO metadata (key, value) VALUES ('latest_date', ?)").run(latestDate)
  return { totalRows, latestDate }
}

export const BOOKING_STATUSES = [
  'Completed', 'Cancelled by Driver', 'Cancelled by Customer', 'No Driver Found', 'Incomplete',
] as const

export type ManualRideInput = Partial<Record<
  | 'booking_id' | 'booking_date' | 'booking_time' | 'booking_status' | 'customer_id' | 'vehicle_type'
  | 'pickup_location' | 'drop_location' | 'payment_method' | 'booking_value' | 'ride_distance'
  | 'avg_vtat' | 'avg_ctat' | 'driver_rating' | 'customer_rating' | 'reason', unknown>>

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim()
}

function number(value: unknown, label: string, min: number, max: number) {
  const raw = text(value)
  if (raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${label} harus berupa angka antara ${min} dan ${max}.`)
  return n
}

// Input manual (satu baris pemesanan) lewat form. Validasi mengikuti aturan yang sama dengan impor CSV.
export function insertManualRide(db: DatabaseSync, input: ManualRideInput) {
  const id = bookingId(text(input.booking_id))
  const date = text(input.booking_date)
  const time = text(input.booking_time)
  const status = text(input.booking_status)
  const reason = text(input.reason)

  if (!id) throw new Error('Booking ID wajib diisi.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) !== date) {
    throw new Error('Tanggal tidak valid. Gunakan format YYYY-MM-DD.')
  }
  if (time && !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time)) throw new Error('Waktu tidak valid. Gunakan format HH:MM atau HH:MM:SS.')
  if (!(BOOKING_STATUSES as readonly string[]).includes(status)) throw new Error('Status pemesanan tidak valid.')

  const vehicle = text(input.vehicle_type)
  if (!vehicle) throw new Error('Jenis kendaraan wajib diisi.')
  if (!text(input.customer_id)) throw new Error('Customer ID wajib diisi.')

  const bookingValue = number(input.booking_value, 'Nilai pemesanan', 0, 1e7)
  const distance = number(input.ride_distance, 'Jarak perjalanan', 0, 5000)
  const vtat = number(input.avg_vtat, 'Avg VTAT', 0, 1000)
  const ctat = number(input.avg_ctat, 'Avg CTAT', 0, 1000)
  const driverRating = number(input.driver_rating, 'Rating pengemudi', 0, 5)
  const customerRating = number(input.customer_rating, 'Rating pelanggan', 0, 5)
  const payment = text(input.payment_method)

  if (status === 'Completed') {
    if (bookingValue === null) throw new Error('Nilai pemesanan wajib diisi untuk pemesanan yang selesai.')
    if (!payment) throw new Error('Metode pembayaran wajib diisi untuk pemesanan yang selesai.')
  } else if (status !== 'No Driver Found' && !reason) {
    throw new Error('Alasan pembatalan / ketidaklengkapan wajib diisi untuk status ini.')
  }

  db.exec('BEGIN IMMEDIATE')
  try {
    if (db.prepare('SELECT 1 FROM rides WHERE booking_id = ? LIMIT 1').get(id)) {
      throw new Error(`Booking ID ${id} sudah ada di database.`)
    }
    const byCustomer = status === 'Cancelled by Customer'
    const byDriver = status === 'Cancelled by Driver'
    const incomplete = status === 'Incomplete'
    // Urutan nilai sama dengan `columns` di atas.
    const row = [
      id, date, time || null, status, text(input.customer_id), vehicle,
      text(input.pickup_location) || null, text(input.drop_location) || null, vtat, ctat,
      byCustomer ? 1 : null, byCustomer ? reason : null,
      byDriver ? 1 : null, byDriver ? reason : null,
      incomplete ? 1 : null, incomplete ? reason : null,
      bookingValue, distance, driverRating, customerRating, payment || null,
    ]
    db.prepare(statementSql).run(...row)
    db.prepare('INSERT INTO dataset_imports (source, row_count, checksum) VALUES (?, ?, ?)')
      .run('input-manual', 1, createHash('sha256').update(JSON.stringify(row)).digest('hex'))
    const { totalRows, latestDate } = refreshMetadata(db)
    db.exec('COMMIT')
    return { bookingId: id, totalRows, latestDate }
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
