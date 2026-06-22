// Thin API client for the NestJS backend.
// In dev, requests go through the Vite proxy (see vite.config.ts) so we can use
// relative URLs. Override with VITE_API_BASE_URL for other environments.
const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

/** Error carrying the HTTP status so callers can branch (e.g. 409 → slot taken). */
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// Shown when fetch itself rejects (offline / CORS / server down) — fetch never
// reaches a Response in that case, so this is the message users actually see.
const NETWORK_ERROR =
  'تعذّر الاتصال بالخادم — تأكد من اتصالك بالإنترنت وحاول مرة أخرى'

export type Unit = {
  id: string
  code: string
  description: string | null
  isActive: boolean
}

export type BookingPayload = {
  unitCode: string
  firstName: string
  lastName: string
  mobile: string
  installationDate: string // YYYY-MM-DD
  installationTime: string
  agreedToTerms: boolean
  receipt: File
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    const msg = data?.message
    if (Array.isArray(msg)) return msg.join(', ')
    if (typeof msg === 'string') return msg
  } catch {
    // ignore — fall through to the status text
  }
  return `Request failed (${res.status})`
}

/** fetch + uniform error handling: network failure → ApiError(0), non-2xx →
 * ApiError(status, serverMessage). Returns the Response on success. */
async function request(path: string, init?: RequestInit): Promise<Response> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, init)
  } catch {
    throw new ApiError(0, NETWORK_ERROR)
  }
  if (!res.ok) throw new ApiError(res.status, await parseError(res))
  return res
}

export async function fetchUnits(): Promise<Unit[]> {
  return (await request('/api/units')).json()
}

export type TakenSlot = { date: string; time: string }

/** Installation slots already booked (date + time), so the form can hide them. */
export async function fetchBookedSlots(): Promise<TakenSlot[]> {
  return (await request('/api/bookings/availability')).json()
}

export type ClosedDay = { id: string; date: string; reason: string | null }

/** Admin-declared closed days (holidays), so the calendar can disable them. */
export async function fetchClosedDays(): Promise<ClosedDay[]> {
  return (await request('/api/closed-days')).json()
}

export async function submitBooking(payload: BookingPayload) {
  const form = new FormData()
  form.append('unitCode', payload.unitCode)
  form.append('firstName', payload.firstName)
  form.append('lastName', payload.lastName)
  form.append('mobile', payload.mobile)
  form.append('installationDate', payload.installationDate)
  form.append('installationTime', payload.installationTime)
  form.append('agreedToTerms', String(payload.agreedToTerms))
  form.append('receipt', payload.receipt)

  const res = await request('/api/bookings', { method: 'POST', body: form })
  return res.json()
}
