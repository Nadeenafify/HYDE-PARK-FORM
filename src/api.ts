// Thin API client for the NestJS backend.
// In dev, requests go through the Vite proxy (see vite.config.ts) so we can use
// relative URLs. Override with VITE_API_BASE_URL for other environments.
const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

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

export async function fetchUnits(): Promise<Unit[]> {
  const res = await fetch(`${BASE}/api/units`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
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

  const res = await fetch(`${BASE}/api/bookings`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}
