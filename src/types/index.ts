export type CreditCheckResult = 'approved' | 'restriction' | 'denied' | 'pending'
export type ReminderStatus = 'pending' | 'completed' | 'overdue'

export interface Seller {
  id: string
  name: string
  whatsapp: string
  active: boolean
  created_at: string
  user_id?: string | null
}

export interface MotorcycleType {
  id: string
  model: string
  price: number | null
  active: boolean
  created_at: string
}

export interface Status {
  id: string
  description: string
  generates_reminder: boolean
  is_closed: boolean
  is_lost: boolean
  active: boolean
  sort_order: number
  created_at: string
}

export interface LossReason {
  id: string
  description: string
  active: boolean
  created_at: string
}

export interface CustomerChannel {
  id: string
  description: string
  active: boolean
  created_at: string
}

export interface CustomerService {
  id: string
  name: string
  cpf: string
  phone: string | null
  entry_date: string
  seller_id: string | null
  motorcycle_type_id: string | null
  status_id: string | null
  loss_reason_id: string | null
  channel_id: string | null
  notes: string | null
  reminder_active: boolean
  next_consultation_date: string | null
  created_at: string
  updated_at: string
  // joins
  seller?: Seller
  motorcycle_type?: MotorcycleType
  status?: Status
  loss_reason?: LossReason
  channel?: CustomerChannel
  credit_checks?: CreditCheck[]
}

export interface CreditCheck {
  id: string
  customer_service_id: string
  check_date: string
  result: CreditCheckResult
  file_url: string | null
  file_name: string | null
  notes: string | null
  next_check_date: string | null
  created_by: string | null
  created_at: string
}

export interface Reminder {
  id: string
  customer_service_id: string
  credit_check_id: string | null
  seller_id: string | null
  due_date: string
  type: string
  status: ReminderStatus
  created_at: string
  // joins
  customer_service?: CustomerService
  seller?: Seller
}

export interface DashboardStats {
  total_entries: number
  total_attended: number
  total_consultations: number
  total_approved: number
  total_restriction: number
  total_closed: number
  total_lost: number
  total_pending_reminders: number
  conversion_rate: number
  consultation_rate: number
  approval_rate: number
  closing_rate: number
  restriction_rate: number
}
