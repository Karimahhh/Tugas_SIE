'use client'

import { useId, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatINRCompact } from '@/lib/metrics'
import { useFilters } from './filter-provider'
import { KpiCard, PageHeader, Panel } from './panel'
import { AXIS_PROPS, TOOLTIP_STYLE } from './chart-utils'

function SliderField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  hint: string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span className="rounded border border-border bg-muted px-2 py-0.5 text-sm font-semibold tabular-nums">{value}%</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span>{hint}</span>
        <span>100%</span>
      </div>
    </div>
  )
}

export function WhatIfAnalysis() {
  const { analytics } = useFilters()
  const [driverReduction, setDriverReduction] = useState(20)
  const [noDriverReduction, setNoDriverReduction] = useState(20)

  const { summary, driverLoss, noDriverLoss } = analytics

  const recoveredDriver = driverLoss * (driverReduction / 100)
  const recoveredNoDriver = noDriverLoss * (noDriverReduction / 100)
  const recovered = recoveredDriver + recoveredNoDriver
  const remainingLeakage = summary.revenueLeakage - recovered
  const projectedRevenue = summary.totalRevenue + recovered
  const uplift = summary.totalRevenue ? (recovered / summary.totalRevenue) * 100 : 0

  const comparison = [
    { name: 'Actual Revenue', value: summary.totalRevenue },
    { name: 'Projected Revenue', value: projectedRevenue },
  ]

  return (
    <>
      <PageHeader
        title="What-If Analysis Engine"
        description="Simulasi pemulihan pendapatan dengan mengurangi pembatalan driver dan kasus No Driver Found."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Parameter Simulasi" description="Geser slider untuk melihat dampaknya secara real-time">
          <div className="flex flex-col gap-6">
            <SliderField
              label="Reduksi Pembatalan Driver"
              value={driverReduction}
              onChange={setDriverReduction}
              hint={`Potensi ${formatINRCompact(driverLoss)}`}
            />
            <SliderField
              label={'Reduksi Kasus "No Driver Found"'}
              value={noDriverReduction}
              onChange={setNoDriverReduction}
              hint={`Potensi ${formatINRCompact(noDriverLoss)}`}
            />
            <button
              type="button"
              onClick={() => {
                setDriverReduction(0)
                setNoDriverReduction(0)
              }}
              className="h-9 self-start rounded border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
            >
              Reset Slider
            </button>
          </div>
        </Panel>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:col-span-2">
          <KpiCard
            label="Revenue Leakage Potential"
            value={formatINRCompact(remainingLeakage)}
            note={`Dari ${formatINRCompact(summary.revenueLeakage)} sebelum simulasi`}
            tone="danger"
          />
          <KpiCard
            label="Pendapatan Dipulihkan"
            value={formatINRCompact(recovered)}
            note={`+${uplift.toFixed(1)}% terhadap pendapatan aktual`}
            tone="success"
          />
          <KpiCard label="Actual Revenue" value={formatINRCompact(summary.totalRevenue)} />
          <KpiCard label="Projected Revenue" value={formatINRCompact(projectedRevenue)} tone="primary" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Actual vs Projected Revenue" className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" {...AXIS_PROPS} />
                <YAxis {...AXIS_PROPS} tickFormatter={(v) => formatINRCompact(v).replace('INR ', '')} width={56} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatINRCompact(Number(v))} cursor={{ fill: '#f3f4f6' }} />
                <Bar dataKey="value" name="Pendapatan" barSize={80} isAnimationActive={false}>
                  <Cell fill="#6b7280" />
                  <Cell fill="#1d4ed8" />
                  <LabelList dataKey="value" position="top" fontSize={12} fill="#1f2937" formatter={(v) => formatINRCompact(Number(v))} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Rincian Pemulihan">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              <tr>
                <td className="py-2 text-muted-foreground">Dari pembatalan driver</td>
                <td className="py-2 text-right font-medium tabular-nums">{formatINRCompact(recoveredDriver)}</td>
              </tr>
              <tr>
                <td className="py-2 text-muted-foreground">Dari No Driver Found</td>
                <td className="py-2 text-right font-medium tabular-nums">{formatINRCompact(recoveredNoDriver)}</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">Total dipulihkan</td>
                <td className="py-2 text-right font-semibold text-green-700 tabular-nums">{formatINRCompact(recovered)}</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">Sisa leakage</td>
                <td className="py-2 text-right font-semibold text-destructive tabular-nums">{formatINRCompact(remainingLeakage)}</td>
              </tr>
            </tbody>
          </table>
        </Panel>
      </div>
    </>
  )
}
