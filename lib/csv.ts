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

export function importCsv(db: DatabaseSync, text: string, source: string) {
  let headerSeen = false
  let rowNumber = 0
  let imported = 0
  let latestDate = ''
  const insert = db.prepare(statementSql)
  const recordImport = db.prepare(
    'INSERT INTO dataset_imports (source, row_count, checksum) VALUES (?, ?, ?)',
  )

  db.exec('BEGIN IMMEDIATE')
  try {
    parseRecords(text, record => {
      rowNumber++
      if (!headerSeen) {
        const headers = record.map(value => value.trim())
        if (headers.length !== csvHeaders.length || csvHeaders.some((header, index) => headers[index] !== header)) {
          throw new Error('Header atau urutan kolom CSV tidak sesuai format pemesanan yang didukung.')
        }
        headerSeen = true
        db.exec('DELETE FROM rides')
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

      values[headersIndex('Booking ID')] = id
      const ordered = databaseHeaders.map(header => values[headersIndex(header)])
      insert.run(...ordered)
      imported++
      if (date > latestDate) latestDate = date
    })

    if (!headerSeen || imported === 0) throw new Error('CSV tidak memiliki baris pemesanan untuk diimpor.')
    db.prepare("INSERT OR REPLACE INTO metadata (key, value) VALUES ('row_count', ?)").run(String(imported))
    db.prepare("INSERT OR REPLACE INTO metadata (key, value) VALUES ('latest_date', ?)").run(latestDate)
    recordImport.run(source, imported, createHash('sha256').update(text).digest('hex'))
    db.exec('COMMIT')
    return { rowCount: imported, latestDate }
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function headersIndex(header: string) {
  return csvHeaders.indexOf(header)
}
