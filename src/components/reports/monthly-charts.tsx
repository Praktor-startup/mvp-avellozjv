'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// Paleta validada (dataviz, cores da marca Avelloz): azul da identidade para
// entradas, verde para fechamentos — ΔE seguro para deuteranopia/tritanopia
// (validado com scripts/validate_palette.js). O laranja da marca no ranking
// tem contraste WARN contra fundo branco, por isso o valor sempre vem também
// como rótulo direto na barra (LabelList), não só pela cor.
const COLOR_ENTRADAS = '#3A44A8'
const COLOR_FECHAMENTOS = '#16A34A'
const COLOR_RANKING = '#F26B21'

interface SellerRankItem {
  name: string
  total_closed: number
}

interface EvolutionPoint {
  label: string
  entradas: number
  fechamentos: number
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-56 flex items-center justify-center text-sm text-slate-400">{label}</div>
  )
}

export function SellerRankingChart({ data }: { data: SellerRankItem[] }) {
  const hasData = data.some((d) => d.total_closed > 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendas fechadas por vendedor</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyChart label="Nenhuma venda fechada neste período" />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, data.length * 44)}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fontSize: 12, fill: '#475569' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                formatter={(value) => [`${value} venda${value === 1 ? '' : 's'}`, 'Fechadas']}
              />
              <Bar dataKey="total_closed" fill={COLOR_RANKING} radius={[0, 4, 4, 0]} maxBarSize={22}>
                <LabelList dataKey="total_closed" position="right" style={{ fontSize: 12, fill: '#475569', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

export function EvolutionChart({ data }: { data: EvolutionPoint[] }) {
  const hasData = data.some((d) => d.entradas > 0 || d.fechamentos > 0)
  // Mais de ~15 pontos (ex: período de 6 meses em dias) fica ilegível — pula rótulos do eixo.
  const tickInterval = data.length > 15 ? Math.ceil(data.length / 10) : 0
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução no período</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyChart label="Nenhum dado neste período" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ left: -16, right: 16, top: 8, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" interval={tickInterval} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend
                verticalAlign="top"
                align="right"
                height={32}
                iconType="circle"
                formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
              />
              <Line type="monotone" dataKey="entradas" name="Entradas na loja" stroke={COLOR_ENTRADAS} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="fechamentos" name="Vendas fechadas" stroke={COLOR_FECHAMENTOS} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
