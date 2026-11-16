'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Database, FileUp, ListTree, Plus, Search, Upload, X } from 'lucide-react'

function Button({ children, onClick, variant = 'primary', type = 'button', disabled = false }: {
  children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary'; type?: 'button' | 'submit'; disabled?: boolean
}) {
  return <button type={type} onClick={onClick} disabled={disabled} className={`button button-${variant}`}>{children}</button>
}

type Method = 'replace' | 'append' | 'manual'
type Notice = { kind: 'success' | 'error' | 'info'; title: string; text: string } | null

type PreviewRow = {
  ride_id: number
  booking_id: string
  booking_date: string
  booking_time: string | null
  booking_status: string
  customer_id: string | null
  vehicle_type: string | null
  pickup_location: string | null
  drop_location: string | null
  avg_vtat: number | null
  avg_ctat: number | null
  booking_value: number | null
  ride_distance: number | null
  driver_rating: number | null
  customer_rating: number | null
  payment_method: string | null
}
type Preview = { rows: PreviewRow[]; total: number; totalAll: number; page: number; pageSize: number }

const METHODS: { id: Method; title: string; desc: string; icon: typeof Upload }[] = [
  { id: 'replace', title: 'Timpa Dataset', desc: 'Ganti seluruh dataset lama dengan CSV yang baru.', icon: Upload },
  { id: 'append', title: 'Tambah Data (Import)', desc: 'Tambahkan baris dari CSV ke dataset yang sudah ada.', icon: Plus },
  { id: 'manual', title: 'Input Manual', desc: 'Isi satu data pemesanan lewat form.', icon: ListTree },
]

const STATUS_OPTIONS = [
  { value: 'Completed', label: 'Completed (Selesai)' },
  { value: 'Cancelled by Driver', label: 'Cancelled by Driver (Dibatalkan pengemudi)' },
  { value: 'Cancelled by Customer', label: 'Cancelled by Customer (Dibatalkan pelanggan)' },
  { value: 'No Driver Found', label: 'No Driver Found (Pengemudi tidak ditemukan)' },
  { value: 'Incomplete', label: 'Incomplete (Perjalanan tidak selesai)' },
]
const VEHICLES = ['Auto', 'Bike', 'eBike', 'Go Mini', 'Go Sedan', 'Premier Sedan', 'Uber XL']
const PAYMENTS = ['UPI', 'Cash', 'Uber Wallet', 'Credit Card', 'Debit Card']
const REASON_HINTS: Record<string, string[]> = {
  'Cancelled by Customer': ['Wrong Address', 'Change of plans', 'Driver asked to cancel', 'AC is not working'],
  'Cancelled by Driver': ['Personal & Car related issues', 'Customer related issue', 'More than permitted people in there'],
  Incomplete: ['Vehicle Breakdown', 'Customer Demand', 'Other Issue'],
}

const EMPTY_FORM = {
  booking_id: '', booking_date: '', booking_time: '', booking_status: 'Completed', customer_id: '',
  vehicle_type: '', pickup_location: '', drop_location: '', payment_method: '', booking_value: '',
  ride_distance: '', avg_vtat: '', avg_ctat: '', driver_rating: '', customer_rating: '', reason: '',
}
type FormState = typeof EMPTY_FORM

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, init)
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Permintaan gagal.')
  return result
}

const fmt = (value: string | number | null, digits?: number) =>
  value === null || value === undefined || value === '' ? '—'
    : typeof value === 'number' && digits !== undefined ? value.toLocaleString('id-ID', { maximumFractionDigits: digits })
      : String(value)

export function EtlWorkspace({ onChanged }: { onChanged: () => Promise<void> }) {
  const [method, setMethod] = useState<Method>('replace')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [previewError, setPreviewError] = useState('')
  const [page, setPage] = useState(1)
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [tick, setTick] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(searchInput.trim()); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ page: String(page), order })
    if (query) params.set('q', query)
    fetch(`/api/etl/preview?${params}`, { signal: controller.signal })
      .then(async response => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Data gagal dimuat.')
        setPreview(result); setPreviewError('')
      })
      .catch(error => { if (!controller.signal.aborted) setPreviewError(error instanceof Error ? error.message : 'Data gagal dimuat.') })
    return () => controller.abort()
  }, [page, order, query, tick])

  const refreshAfterChange = async (newestFirst: boolean) => {
    await onChanged()
    setSearchInput(''); setQuery(''); setPage(1)
    setOrder(newestFirst ? 'desc' : 'asc')
    setTick(value => value + 1)
  }

  const chooseFile = (selected: File | undefined) => {
    if (!selected) return
    setFile(selected); setNotice(null)
  }

  const runImport = async () => {
    if (!file || busy) return
    if (!file.name.toLowerCase().endsWith('.csv') || file.size === 0 || file.size > 50 * 1024 * 1024) {
      setNotice({ kind: 'error', title: 'Perhatian', text: 'Berkas harus berupa CSV dengan ukuran maksimal 50 MB.' })
      return
    }
    if (method === 'replace') {
      const existing = preview?.totalAll ?? 0
      const ok = window.confirm(`Seluruh dataset lama (${existing.toLocaleString('id-ID')} baris) akan dihapus dan diganti dengan isi "${file.name}". Lanjutkan?`)
      if (!ok) return
    }
    setBusy(true)
    setNotice({ kind: 'info', title: 'Memproses', text: 'Mengimpor data ke database...' })
    try {
      const body = new FormData()
      body.set('file', file)
      body.set('mode', method)
      const result = await api('/api/etl/upload', { method: 'POST', body })
      await refreshAfterChange(method === 'append')
      const total = Number(result.totalRows).toLocaleString('id-ID')
      const added = Number(result.rowCount).toLocaleString('id-ID')
      const skipped = Number(result.skipped)
      setNotice(method === 'replace'
        ? { kind: 'success', title: 'Dataset berhasil ditimpa', text: `${added} baris dari ${result.fileName} kini menggantikan dataset lama.` }
        : { kind: 'success', title: 'Data berhasil ditambahkan', text: `${added} baris baru ditambahkan dari ${result.fileName}.${skipped ? ` ${skipped.toLocaleString('id-ID')} baris dilewati karena Booking ID sudah ada.` : ''} Total data sekarang ${total} baris.` })
      setFile(null)
    } catch (error) {
      setNotice({ kind: 'error', title: 'Proses ETL gagal', text: error instanceof Error ? error.message : 'Proses ETL gagal.' })
    } finally {
      setBusy(false)
    }
  }

  const setField = (name: keyof FormState, value: string) => setForm(current => ({ ...current, [name]: value }))

  const submitManual = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setNotice(null)
    try {
      const result = await api('/api/etl/manual', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      await refreshAfterChange(true)
      setForm({ ...EMPTY_FORM, booking_status: form.booking_status })
      setNotice({ kind: 'success', title: 'Data berhasil disimpan', text: `Booking ${result.bookingId} ditambahkan. Total data sekarang ${Number(result.totalRows).toLocaleString('id-ID')} baris.` })
    } catch (error) {
      setNotice({ kind: 'error', title: 'Data belum tersimpan', text: error instanceof Error ? error.message : 'Data gagal disimpan.' })
    } finally {
      setBusy(false)
    }
  }

  const completed = form.booking_status === 'Completed'
  const needsReason = form.booking_status !== 'Completed' && form.booking_status !== 'No Driver Found'
  const lastPage = preview ? Math.max(1, Math.ceil(preview.total / preview.pageSize)) : 1
  const from = preview && preview.total ? (preview.page - 1) * preview.pageSize + 1 : 0
  const to = preview ? Math.min(preview.total, preview.page * preview.pageSize) : 0
  const active = METHODS.find(item => item.id === method)!

  return (
    <div className="etl-content etl-wide">
      <div className="eyebrow">MANAJEMEN DATA <span>•</span> RUANG KERJA ETL</div>
      <h1>Pemuatan dataset</h1>
      <p className="etl-lead">Pilih salah satu dari tiga metode untuk menyiapkan data analitik. Seluruh isi dataset di database ditampilkan di bagian bawah.</p>

      <div className="method-tabs" role="tablist">
        {METHODS.map(item => (
          <button key={item.id} role="tab" aria-selected={method === item.id} className={`method-tab ${method === item.id ? 'active' : ''}`}
            onClick={() => { setMethod(item.id); setNotice(null) }}>
            <item.icon size={16} /><span><b>{item.title}</b><small>{item.desc}</small></span>
          </button>
        ))}
      </div>

      {method !== 'manual' ? (
        <section className={`upload-panel ${dragging ? 'drop-active' : ''}`}
          onDragOver={event => { event.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={event => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]) }}>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only"
            onChange={event => { chooseFile(event.target.files?.[0]); event.target.value = '' }} />
          <div className="upload-icon">{method === 'replace' ? <Upload size={21} /> : <Plus size={21} />}</div>
          <h2>{method === 'replace' ? 'Unggah dataset pengganti' : 'Unggah data tambahan'}</h2>
          <p>
            {method === 'replace'
              ? 'Seluruh dataset lama akan dihapus dan diganti dengan isi berkas CSV ini.'
              : 'Baris baru ditambahkan ke dataset yang sudah ada. Booking ID yang sudah ada otomatis dilewati.'}
          </p>
          <Button variant="secondary" onClick={() => inputRef.current?.click()}><FileUp size={15} /> Pilih berkas</Button>
          <span className="upload-hint">Format CSV · Ukuran berkas maksimum 50 MB · Header kolom harus sesuai format dataset</span>
          {file && (
            <div className="file-chip"><FileUp size={15} />
              <span><b>{file.name}</b><small>{(file.size / 1024).toFixed(1)} KB</small></span>
              <button aria-label="Hapus berkas" onClick={() => { setFile(null); setNotice(null) }}><X size={15} /></button>
            </div>
          )}
          <div className="expected-file"><Database size={15} /><span>Dataset aktif di database</span>
            <b>{preview ? `${preview.totalAll.toLocaleString('id-ID')} baris` : '…'}</b></div>
        </section>
      ) : (
        <form className="manual-form" onSubmit={submitManual}>
          <h2>Input data pemesanan</h2>
          <p>Kolom bertanda * wajib diisi sesuai status pemesanan.</p>
          <div className="form-grid">
            <label>Booking ID *<input value={form.booking_id} onChange={e => setField('booking_id', e.target.value)} placeholder="CNR1234567" required /></label>
            <label>Tanggal *<input type="date" value={form.booking_date} onChange={e => setField('booking_date', e.target.value)} required /></label>
            <label>Waktu<input type="time" step={1} value={form.booking_time} onChange={e => setField('booking_time', e.target.value)} /></label>
            <label>Status pemesanan *
              <select value={form.booking_status} onChange={e => setField('booking_status', e.target.value)}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label>Customer ID *<input value={form.customer_id} onChange={e => setField('customer_id', e.target.value)} placeholder="CID1234567" required /></label>
            <label>Jenis kendaraan *<input list="etl-vehicles" value={form.vehicle_type} onChange={e => setField('vehicle_type', e.target.value)} required />
              <datalist id="etl-vehicles">{VEHICLES.map(v => <option key={v} value={v} />)}</datalist></label>
            <label>Lokasi jemput<input value={form.pickup_location} onChange={e => setField('pickup_location', e.target.value)} /></label>
            <label>Lokasi tujuan<input value={form.drop_location} onChange={e => setField('drop_location', e.target.value)} /></label>
            <label>Metode pembayaran{completed ? ' *' : ''}
              <select value={form.payment_method} onChange={e => setField('payment_method', e.target.value)} required={completed}>
                <option value="">— Pilih —</option>
                {PAYMENTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label>Nilai pemesanan{completed ? ' *' : ''}<input type="number" min={0} step="any" value={form.booking_value} onChange={e => setField('booking_value', e.target.value)} required={completed} /></label>
            <label>Jarak perjalanan (km)<input type="number" min={0} step="any" value={form.ride_distance} onChange={e => setField('ride_distance', e.target.value)} /></label>
            <label>Avg VTAT (menit)<input type="number" min={0} step="any" value={form.avg_vtat} onChange={e => setField('avg_vtat', e.target.value)} /></label>
            <label>Avg CTAT (menit)<input type="number" min={0} step="any" value={form.avg_ctat} onChange={e => setField('avg_ctat', e.target.value)} /></label>
            {completed && <>
              <label>Rating pengemudi (0–5)<input type="number" min={0} max={5} step="any" value={form.driver_rating} onChange={e => setField('driver_rating', e.target.value)} /></label>
              <label>Rating pelanggan (0–5)<input type="number" min={0} max={5} step="any" value={form.customer_rating} onChange={e => setField('customer_rating', e.target.value)} /></label>
            </>}
            {needsReason && (
              <label className="span-2">Alasan {form.booking_status === 'Incomplete' ? 'perjalanan tidak selesai' : 'pembatalan'} *
                <input list="etl-reasons" value={form.reason} onChange={e => setField('reason', e.target.value)} required />
                <datalist id="etl-reasons">{(REASON_HINTS[form.booking_status] ?? []).map(r => <option key={r} value={r} />)}</datalist>
              </label>
            )}
          </div>
          <div className="etl-actions">
            <Button type="submit" disabled={busy}><Check size={16} /> Simpan Data</Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => { setForm(EMPTY_FORM); setNotice(null) }}>Kosongkan Form</Button>
          </div>
        </form>
      )}

      {notice && (
        <div className={`etl-result ${notice.kind === 'info' ? 'info' : notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
          <span>{notice.kind === 'error' ? <X size={17} /> : <Check size={17} />}</span>
          <div><b>{notice.title}</b><p>{notice.text}</p></div>
        </div>
      )}

      {method !== 'manual' && (
        <div className="etl-actions">
          <Button onClick={runImport} disabled={!file || busy}>
            {method === 'replace' ? <Upload size={16} /> : <Plus size={16} />}
            {busy ? 'Memproses...' : method === 'replace' ? 'Timpa Dataset' : 'Tambahkan Data'}
          </Button>
        </div>
      )}

      <section className="etl-note"><Database size={17} />
        <div><b>{active.title}</b><p>
          {method === 'replace' && 'Berkas divalidasi di server lalu menggantikan seluruh dataset aktif secara atomik. Jika ada baris yang tidak valid, dataset lama tetap utuh.'}
          {method === 'append' && 'Berkas divalidasi baris demi baris. Data lama dipertahankan; hanya Booking ID yang belum ada yang ditambahkan. Jika ada baris tidak valid, tidak ada yang ditambahkan.'}
          {method === 'manual' && 'Data divalidasi dengan aturan yang sama seperti impor CSV. Booking ID harus unik dan baris baru langsung muncul di dashboard.'}
        </p></div>
      </section>

      <section className="panel table-panel etl-table">
        <div className="table-heading">
          <div><h3>Isi dataset di database</h3>
            <p>{preview ? `${preview.totalAll.toLocaleString('id-ID')} baris tersimpan` : 'Memuat data...'}{query && preview ? ` · ${preview.total.toLocaleString('id-ID')} cocok dengan pencarian` : ''}</p></div>
          <div className="table-tools">
            <label className="search-box"><Search size={13} />
              <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Cari Booking ID, Customer ID, lokasi" aria-label="Cari data" />
            </label>
            <select className="order-select" value={order} aria-label="Urutan data"
              onChange={e => { setOrder(e.target.value as 'asc' | 'desc'); setPage(1) }}>
              <option value="asc">Urutan awal</option>
              <option value="desc">Terbaru dulu</option>
            </select>
          </div>
        </div>
        {previewError && <div className="no-results">{previewError}</div>}
        <div className="table-wrap">
          <table>
            <thead><tr>
              {['BOOKING ID', 'TANGGAL', 'WAKTU', 'STATUS', 'CUSTOMER ID', 'KENDARAAN', 'JEMPUT', 'TUJUAN', 'VTAT', 'CTAT', 'NILAI', 'JARAK', 'RATING DRV', 'RATING CUST', 'PEMBAYARAN'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {preview?.rows.map(r => (
                <tr key={r.ride_id}>
                  <td className="booking-id">{r.booking_id}</td><td>{r.booking_date}</td><td>{fmt(r.booking_time)}</td>
                  <td>{r.booking_status}</td><td>{fmt(r.customer_id)}</td><td>{fmt(r.vehicle_type)}</td>
                  <td>{fmt(r.pickup_location)}</td><td>{fmt(r.drop_location)}</td>
                  <td>{fmt(r.avg_vtat, 1)}</td><td>{fmt(r.avg_ctat, 1)}</td>
                  <td className="fare">{fmt(r.booking_value, 0)}</td><td>{fmt(r.ride_distance, 2)}</td>
                  <td>{fmt(r.driver_rating, 1)}</td><td>{fmt(r.customer_rating, 1)}</td><td>{fmt(r.payment_method)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {preview && preview.rows.length === 0 && <div className="no-results">{preview.totalAll === 0 ? 'Belum ada data. Unggah CSV atau isi lewat form.' : 'Tidak ada data yang cocok.'}</div>}
        </div>
        <div className="table-footer">
          <span>Menampilkan {from.toLocaleString('id-ID')}–{to.toLocaleString('id-ID')} dari {(preview?.total ?? 0).toLocaleString('id-ID')}</span>
          <div>
            <button className="pagination" disabled={page <= 1} onClick={() => setPage(1)}>Awal</button>
            <button className="pagination" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ArrowLeft size={12} /> Sebelumnya</button>
            <span className="page-indicator">Halaman {page.toLocaleString('id-ID')} / {lastPage.toLocaleString('id-ID')}</span>
            <button className="pagination" disabled={page >= lastPage} onClick={() => setPage(p => Math.min(lastPage, p + 1))}>Berikutnya <ArrowRight size={12} /></button>
            <button className="pagination" disabled={page >= lastPage} onClick={() => setPage(lastPage)}>Akhir</button>
          </div>
        </div>
      </section>
    </div>
  )
}
