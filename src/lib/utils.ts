import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, addDays, startOfMonth, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null | undefined, pattern = 'dd/MM/yyyy') {
  if (!date) return '—'
  try {
    return format(parseISO(date), pattern, { locale: ptBR })
  } catch {
    return '—'
  }
}

export function formatDateTime(date: string | null | undefined) {
  return formatDate(date, "dd/MM/yyyy 'às' HH:mm")
}

// Início (inclusive) e fim (exclusivo) do mês, em ISO — usar com .gte()/.lt() no Supabase.
export function monthRange(year: number, month: number) {
  const base = new Date(year, month - 1, 1)
  const start = startOfMonth(base)
  const end = addMonths(startOfMonth(base), 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

export function monthLabel(year: number, month: number) {
  return format(new Date(year, month - 1, 1), "MMMM 'de' yyyy", { locale: ptBR })
}

export function maskCPF(cpf: string) {
  const clean = cpf.replace(/\D/g, '')
  if (clean.length !== 11) return cpf
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.***.${clean.slice(9)}`
}

export function formatCPF(cpf: string) {
  const clean = cpf.replace(/\D/g, '')
  if (clean.length !== 11) return cpf
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`
}

export function formatWhatsApp(number: string) {
  const clean = number.replace(/\D/g, '')
  if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`
  if (clean.length === 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`
  return number
}

export function nextConsultationDate(fromDate: string): string | null {
  if (!fromDate) return null
  try {
    const d = parseISO(fromDate)
    if (isNaN(d.getTime())) return null
    return addDays(d, 21).toISOString().split('T')[0]
  } catch {
    return null
  }
}

// Prazo para cobrar o fechamento de uma venda com crédito já aprovado.
// Lead mais quente que existe — não pode esfriar.
// Retorna null se fromDate for inválido (evita crash no render de preview).
export function saleFollowupDate(fromDate: string, days = 5): string | null {
  if (!fromDate) return null
  try {
    const d = parseISO(fromDate)
    if (isNaN(d.getTime())) return null
    return addDays(d, days).toISOString().split('T')[0]
  } catch {
    return null
  }
}

export function formatPhone(phone: string | null | undefined) {
  if (!phone) return '—'
  return formatWhatsApp(phone)
}

// Link wa.me com DDI 55 implícito para números nacionais
export function whatsappHref(phone: string, message?: string) {
  const clean = phone.replace(/\D/g, '')
  const withCountry = clean.startsWith('55') && clean.length > 11 ? clean : `55${clean}`
  const q = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${withCountry}${q}`
}

export function reminderTypeLabel(type: string) {
  const map: Record<string, string> = {
    reconsultation: 'Reconsulta',
    sale_followup: 'Cobrar fechamento',
    pending_check: 'Cobrar resultado',
  }
  return map[type] ?? 'Lembrete'
}

export function creditResultLabel(result: string) {
  const map: Record<string, string> = {
    approved: 'Aprovado',
    restriction: 'Restrição',
    denied: 'Negado',
    pending: 'Pendente',
  }
  return map[result] ?? '(Desconhecido)'
}

export function creditResultColor(result: string) {
  const map: Record<string, string> = {
    approved: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    restriction: 'text-amber-600 bg-amber-50 border-amber-200',
    denied: 'text-red-600 bg-red-50 border-red-200',
    pending: 'text-slate-600 bg-slate-50 border-slate-200',
  }
  return map[result] ?? 'text-slate-600 bg-slate-50 border-slate-200'
}

export function validateCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '')
  if (clean.length !== 11) return false
  if (/^(\d)\1{10}$/.test(clean)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i]) * (10 - i)
  let check = 11 - (sum % 11)
  if (check >= 10) check = 0
  if (check !== parseInt(clean[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i)
  check = 11 - (sum % 11)
  if (check >= 10) check = 0
  return check === parseInt(clean[10])
}
