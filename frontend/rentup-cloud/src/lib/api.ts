import axios from 'axios'
import { supabase } from './supabase'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5154',
})

// Attach Supabase JWT to every request automatically
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

export default api

// ── Typed API helpers ──────────────────────────────────────────────────────

export const productsApi = {
  getAll: (includeInactive = false) =>
    api.get<Product[]>(`/api/products?includeInactive=${includeInactive}`),
  create: (data: CreateProductRequest) =>
    api.post<Product>('/api/products', data),
  update: (id: string, data: UpdateProductRequest) =>
    api.put<Product>(`/api/products/${id}`, data),
  delete: (id: string) =>
    api.delete(`/api/products/${id}`),
  validateFormula: (formula: string) =>
    api.post<{ valid: boolean; error?: string }>('/api/products/validate-formula', JSON.stringify(formula), {
      headers: { 'Content-Type': 'application/json' },
    }),
}

export const aumApi = {
  getSnapshots: () =>
    api.get<AumSnapshot[]>('/api/aum/snapshots'),
  getSummary: () =>
    api.get<AumSummary | null>('/api/aum/summary'),
  getProjections: (years = 10) =>
    api.get<ProjectionsResponse>(`/api/aum/projections?years=${years}`),
  previewCsv: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<CsvPreviewResult>('/api/aum/import/preview', form)
  },
  commitImport: (rows: CsvPreviewRow[]) =>
    api.post<{ committed: number }>('/api/aum/import/commit', rows),
}

export const settingsApi = {
  get: () => api.get<UserSettings>('/api/usersettings'),
  update: (data: UpdateSettingsRequest) => api.put<UserSettings>('/api/usersettings', data),
}

// ── API types ──────────────────────────────────────────────────────────────

export type ProductCategory =
  | 'InvestmentFund' | 'BuildingSavings' | 'LifeInsurance'
  | 'PensionSavings' | 'Bonds' | 'Commodities' | 'RealEstate' | 'Other'

export type ProductCompany =
  | 'ZfpInvestments' | 'WoodAndCo' | 'Avant' | 'Conseq'
  | 'GeneraliInvestments' | 'ZfpFinance' | 'ZfpGold' | 'NnInvestments' | 'Amundi' | 'Other'

export interface Product {
  id: string
  name: string
  category: ProductCategory
  company: ProductCompany
  colorHex: string
  averageYield: number
  monthlyDeposit: number
  commissionFormula: string
  order: number
  isActive: boolean
}

export interface CreateProductRequest extends Omit<Product, 'id' | 'isActive'> {}
export interface UpdateProductRequest extends Omit<Product, 'id'> {}

export interface AumSnapshot {
  id: string
  date: string
  totalAum: number
  totalMonthlyDeposit: number
  pointsPerYear: number
}

export interface AumSummary {
  date: string
  totalAum: number
  totalMonthlyDeposit: number
  pointsPerYear: number
  estimatedCommissionCzk: number
}

export interface ProjectionPoint {
  date: string
  totalAum: number
  totalMonthlyDeposit: number
  pointsPerYear: number
  estimatedCommissionCzk: number
}

export interface ProjectionsResponse {
  points: ProjectionPoint[]
  basePointValue: number
  yearsProjected: number
}

export interface CsvPreviewRow {
  date: string
  productName: string
  aum: number
  monthlyDeposit: number
  warning?: string
}

export interface CsvPreviewResult {
  rows: CsvPreviewRow[]
  warnings: string[]
  validCount: number
  skippedCount: number
}

export interface UserSettings {
  userId: string
  basePointValue: number
  monthlyGoalPoints: number
  theme: string
}

export interface UpdateSettingsRequest {
  basePointValue: number
  monthlyGoalPoints: number
  theme: string
}

// ── Deals ──────────────────────────────────────────────────────────────────

export type DealStatus = 'Pending' | 'Active' | 'Completed' | 'Cancelled'

export interface Deal {
  id: string
  clientName: string
  date: string
  category: string
  company: string
  productName: string
  depositAmount: number
  calculatedPoints: number
  estimatedCommission: number
  status: DealStatus
  note: string
}

export interface CreateDealRequest {
  clientName: string
  date: string
  category: string
  company: string
  productName: string
  depositAmount: number
  commissionFormula: string
  status: DealStatus
  note: string
}

export interface DealsStats {
  totalCount: number
  totalDepositAmount: number
  totalPoints: number
  totalCommissionCzk: number
  pendingCount: number
  activeCount: number
}

export const dealsApi = {
  getAll: (params?: { from?: string; to?: string; status?: DealStatus }) =>
    api.get<Deal[]>('/api/deals', { params }),
  getById: (id: string) =>
    api.get<Deal>(`/api/deals/${id}`),
  getStats: (params?: { from?: string; to?: string }) =>
    api.get<DealsStats>('/api/deals/stats', { params }),
  create: (data: CreateDealRequest) =>
    api.post<Deal>('/api/deals', data),
  update: (id: string, data: CreateDealRequest) =>
    api.put<Deal>(`/api/deals/${id}`, data),
  delete: (id: string) =>
    api.delete(`/api/deals/${id}`),
}
