'use client'

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatNumber } from '@/lib/metrics'
import { EmptyState } from './panel'

export const CHART_COLORS = ['#1d4ed8', '#60a5fa', '#6b7280', '#b91c1c', '#d97706', '#0f766e', '#9ca3af']

export const AXIS_PROPS = {
  stroke: '#6b7280',
  fontSize: 12,
  tickLine: false,
} as const

export const TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: 4,
    border: '1px solid #d1d5db',
    fontSize: 12,
    boxShadow: 'none',
  },
} as const

export function DonutChart({
  data,
  valueFormatter = formatNumber,
}: {
  data: { name: string; value: number }[]
  valueFormatter?: (value: number) => string
}) {
  if (data.length === 0) return <EmptyState />
  const total = data.reduce((acc, d) => acc + d.value, 0)

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={1} stroke="#fff">
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(value) => {
              const v = Number(value)
              return `${valueFormatter(v)} (${((v / total) * 100).toFixed(1)}%)`
            }}
          />
          <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
