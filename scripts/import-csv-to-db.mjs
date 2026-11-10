import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const argumentsList = process.argv.slice(2).filter((argument) => argument !== '--')
const forceImport = argumentsList.includes('--force')
const suppliedCsvPath = argumentsList.find((argument) => argument !== '--force')
const csvPath = resolve(projectRoot, suppliedCsvPath ?? 'data/ncr_ride_bookings.csv')
const databasePath = resolve(projectRoot, 'data/ncr_ride_bookings.sqlite')
mkdirSync(dirname(databasePath), { recursive: true })

if (!existsSync(csvPath)) {
  throw new Error(
    `CSV tidak ditemukan: ${csvPath}\nSimpan file sebagai data/ncr_ride_bookings.csv atau jalankan pnpm db:import -- \"path\\ke\\file.csv\".`,
  )
}

const databaseIsCurrent =
  !forceImport &&
  !suppliedCsvPath &&
  existsSync(databasePath) &&
  statSync(databasePath).mtimeMs >= statSync(csvPath).mtimeMs
if (databaseIsCurrent) {
  const database = new DatabaseSync(databasePath, { readOnly: true })
  const table = database.prepare(
    "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'bookings'",
  ).get()
  const row = Number(table?.count) ? database.prepare('SELECT COUNT(*) AS count FROM bookings').get() : null
  database.close()
  if (Number(row?.count) > 0) {
    console.log(`Database sudah terbaru (${Number(row.count).toLocaleString('id-ID')} booking).`)
    process.exit(0)
  }
}

function* parseCsv(text) {
  let field = ''
  let row = []
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const character = text[i]

    if (quoted) {
      if (character === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (character === '"') {
        quoted = false
      } else {
        field += character
      }
    } else if (character === '"') {
      quoted = true
    } else if (character === ',') {
      row.push(field)
      field = ''
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((value) => value !== '')) yield row
      row = []
    } else {
      field += character
    }
  }

  if (quoted) throw new Error('CSV memiliki tanda kutip yang tidak berpasangan.')
  if (field !== '' || row.length > 0) {
    row.push(field)
    if (row.some((value) => value !== '')) yield row
  }
}

function clean(value) {
  const trimmed = (value ?? '').trim()
  return trimmed === '' || trimmed.toLowerCase() === 'null' ? null : trimmed
}

function text(value, field, rowNumber) {
  let result = clean(value)
  if (result === null) throw new Error(`Kolom ${field} kosong pada baris ${rowNumber}.`)
  if ((field === 'Booking ID' || field === 'Customer ID') && result.startsWith('"') && result.endsWith('"')) {
    result = result.slice(1, -1)
  }
  return result
}

function number(value) {
  const result = clean(value)
  if (result === null) return null
  const parsed = Number(result)
  if (!Number.isFinite(parsed)) throw new Error(`Nilai angka tidak valid: ${value}`)
  return parsed
}

const csv = readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '')
const records = parseCsv(csv)
const headers = records.next().value
if (!headers) throw new Error('File CSV kosong.')

const headerIndex = new Map(headers.map((header, index) => [header, index]))
const requiredColumns = [
  'Date', 'Time', 'Booking ID', 'Booking Status', 'Customer ID', 'Vehicle Type',
  'Pickup Location', 'Drop Location', 'Avg VTAT', 'Avg CTAT',
  'Cancelled Rides by Customer', 'Reason for cancelling by Customer',
  'Cancelled Rides by Driver', 'Driver Cancellation Reason', 'Incomplete Rides',
  'Incomplete Rides Reason', 'Booking Value', 'Ride Distance', 'Driver Ratings',
  'Customer Rating', 'Payment Method',
]
for (const column of requiredColumns) {
  if (!headerIndex.has(column)) throw new Error(`Kolom wajib tidak ditemukan di CSV: ${column}`)
}

const index = (name) => headerIndex.get(name)
const database = new DatabaseSync(databasePath)

database.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  BEGIN IMMEDIATE;
  DROP TABLE IF EXISTS bookings;
  CREATE TABLE bookings (
    id INTEGER PRIMARY KEY,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    booking_id TEXT NOT NULL,
    booking_status TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    pickup_location TEXT NOT NULL,
    drop_location TEXT NOT NULL,
    avg_vtat REAL,
    avg_ctat REAL,
    cancelled_rides_by_customer INTEGER NOT NULL,
    reason_for_cancelling_by_customer TEXT,
    cancelled_rides_by_driver INTEGER NOT NULL,
    driver_cancellation_reason TEXT,
    incomplete_rides INTEGER NOT NULL,
    incomplete_rides_reason TEXT,
    booking_value REAL NOT NULL,
    ride_distance REAL,
    driver_ratings REAL,
    customer_rating REAL,
    payment_method TEXT
  );
`)

const insert = database.prepare(`
  INSERT INTO bookings (
    date, time, booking_id, booking_status, customer_id, vehicle_type,
    pickup_location, drop_location, avg_vtat, avg_ctat,
    cancelled_rides_by_customer, reason_for_cancelling_by_customer,
    cancelled_rides_by_driver, driver_cancellation_reason, incomplete_rides,
    incomplete_rides_reason, booking_value, ride_distance, driver_ratings,
    customer_rating, payment_method
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

let count = 0
try {
  for (const values of records) {
    count++
    insert.run(
      text(values[index('Date')], 'Date', count + 1),
      text(values[index('Time')], 'Time', count + 1),
      text(values[index('Booking ID')], 'Booking ID', count + 1),
      text(values[index('Booking Status')], 'Booking Status', count + 1),
      text(values[index('Customer ID')], 'Customer ID', count + 1),
      text(values[index('Vehicle Type')], 'Vehicle Type', count + 1),
      text(values[index('Pickup Location')], 'Pickup Location', count + 1),
      text(values[index('Drop Location')], 'Drop Location', count + 1),
      number(values[index('Avg VTAT')]),
      number(values[index('Avg CTAT')]),
      number(values[index('Cancelled Rides by Customer')]) ?? 0,
      clean(values[index('Reason for cancelling by Customer')]),
      number(values[index('Cancelled Rides by Driver')]) ?? 0,
      clean(values[index('Driver Cancellation Reason')]),
      number(values[index('Incomplete Rides')]) ?? 0,
      clean(values[index('Incomplete Rides Reason')]),
      number(values[index('Booking Value')]) ?? 0,
      number(values[index('Ride Distance')]),
      number(values[index('Driver Ratings')]),
      number(values[index('Customer Rating')]),
      clean(values[index('Payment Method')]),
    )
  }

  database.exec(`
    CREATE INDEX bookings_date_idx ON bookings (date);
    CREATE INDEX bookings_booking_id_idx ON bookings (booking_id);
    COMMIT;
  `)
} catch (error) {
  database.exec('ROLLBACK;')
  database.close()
  throw error
}

database.close()
console.log(`Berhasil mengimpor ${count.toLocaleString('id-ID')} booking ke ${databasePath}`)
