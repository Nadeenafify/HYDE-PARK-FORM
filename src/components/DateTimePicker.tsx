import { useMemo, useState } from 'react'

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const TIME_SLOTS = [
  '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM',
  '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM',
]

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// Local YYYY-MM-DD (avoids a UTC off-by-one), matching the booking payload.
function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function sameDay(a: Date | null, b: Date | null) {
  if (!a || !b) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// Minutes since midnight for a slot label like "1:00 PM" — used to hide slots
// whose start time has already passed when today is selected.
function slotMinutes(slot: string): number {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(slot.trim())
  if (!m) return 0
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  if (h === 12) h = 0
  if (m[3].toUpperCase() === 'PM') h += 12
  return h * 60 + min
}

type Props = {
  selectedDate: Date | null
  onSelectDate: (d: Date) => void
  selectedTime: string | null
  onSelectTime: (t: string) => void
  /** Booked slots keyed as "YYYY-MM-DD|10:00 AM" — these are disabled. */
  takenSlots?: Set<string>
  /** Admin-declared closed days, "YYYY-MM-DD" -> reason — these are disabled. */
  closedDays?: Map<string, string>
}

export default function DateTimePicker({
  selectedDate,
  onSelectDate,
  selectedTime,
  onSelectTime,
  takenSlots,
  closedDays,
}: Props) {
  const today = startOfDay(new Date())
  const initial = selectedDate ?? today
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  // Dates whose every time slot is already booked — disabled in the calendar.
  const fullDates = useMemo(() => {
    if (!takenSlots) return new Set<string>()
    const counts = new Map<string, number>()
    for (const key of takenSlots) {
      const date = key.split('|')[0]
      counts.set(date, (counts.get(date) ?? 0) + 1)
    }
    const full = new Set<string>()
    for (const [date, count] of counts) {
      if (count >= TIME_SLOTS.length) full.add(date)
    }
    return full
  }, [takenSlots])

  function goMonth(delta: number) {
    const m = viewMonth + delta
    const date = new Date(viewYear, m, 1)
    setViewYear(date.getFullYear())
    setViewMonth(date.getMonth())
  }

  const headerLabel = selectedDate
    ? selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : 'Select a date'

  const selectedISO = selectedDate ? toISO(selectedDate) : null

  // When today is selected, slots whose start time has already passed are dead.
  const selectedIsToday = sameDay(selectedDate, today)
  const nowMinutes = (() => {
    const n = new Date()
    return n.getHours() * 60 + n.getMinutes()
  })()

  return (
    <div className="flex flex-col gap-6 md:flex-row" dir="ltr">
      {/* Calendar */}
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => goMonth(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#222a4d]"
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-[#2d3e50]">
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={() => goMonth(1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#222a4d]"
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 text-center text-[0.7rem] font-semibold text-slate-400">
          {WEEKDAYS.map((d, i) => (
            <div key={d} className={`py-1 ${i >= 5 ? 'text-slate-300' : ''}`}>
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`e-${idx}`} />
            const cellDate = new Date(viewYear, viewMonth, day)
            const weekday = cellDate.getDay() // 5 = Friday, 6 = Saturday
            const isWeekend = weekday === 5 || weekday === 6
            // Admin-declared closed day (holiday), if any.
            const holiday = closedDays?.get(toISO(cellDate))
            const isClosed = isWeekend || !!holiday
            const isPast = cellDate < today
            const isFull = fullDates.has(toISO(cellDate))
            const disabled = isPast || isFull || isClosed
            const isSelected = sameDay(cellDate, selectedDate)
            const isToday = sameDay(cellDate, today)
            return (
              <div key={day} className="flex items-center justify-center">
                <button
                  type="button"
                  disabled={disabled}
                  title={
                    holiday
                      ? `عطلة رسمية — ${holiday}`
                      : isWeekend
                        ? 'عطلة رسمية — الجمعة والسبت'
                        : isFull
                          ? 'كل المواعيد محجوزة'
                          : undefined
                  }
                  onClick={() => onSelectDate(cellDate)}
                  className={[
                    'flex aspect-square w-full max-w-9 items-center justify-center rounded-full text-sm transition',
                    isSelected
                      ? 'bg-[#222a4d] font-semibold text-white shadow-sm'
                      : disabled
                        ? 'cursor-not-allowed text-slate-300'
                        : 'text-slate-700 hover:bg-[#222a4d]/8',
                    isFull && !isSelected ? 'line-through' : '',
                    isToday && !isSelected && !disabled ? 'ring-1 ring-[#222a4d]/30' : '',
                  ].join(' ')}
                >
                  {day}
                </button>
              </div>
            )
          })}
        </div>

        <p className="mt-3 text-center text-[11px] text-slate-400">
          الجمعة والسبت والأعياد الرسمية إجازة
        </p>
      </div>

      {/* Time slots */}
      <div className="flex-1">
        <div className="mb-3 flex items-center gap-2 text-[#2d3e50]">
          <span className="text-sm font-semibold">{headerLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {TIME_SLOTS.map((slot) => {
            const taken = selectedISO
              ? (takenSlots?.has(`${selectedISO}|${slot}`) ?? false)
              : false
            const past = selectedIsToday && slotMinutes(slot) <= nowMinutes
            const active = selectedTime === slot
            const disabled = !selectedDate || taken || past
            return (
              <button
                key={slot}
                type="button"
                disabled={disabled}
                onClick={() => onSelectTime(slot)}
                aria-label={
                  taken ? `${slot} — محجوز` : past ? `${slot} — فات الوقت` : slot
                }
                className={[
                  'flex h-12 flex-col items-center justify-center rounded-xl border text-sm font-medium transition',
                  taken
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                    : past
                      ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300 line-through'
                      : active
                        ? 'border-[#222a4d] bg-[#222a4d] text-white shadow-sm'
                        : 'border-slate-200 text-[#2d3e50] hover:border-[#222a4d]/40 hover:bg-[#222a4d]/5',
                  !selectedDate && !taken && !past ? 'cursor-not-allowed opacity-50' : '',
                ].join(' ')}
              >
                <span className={taken ? 'text-[13px] leading-none' : 'leading-none'}>
                  {slot}
                </span>
                {past && !taken && (
                  <span className="mt-0.5 text-[10px] font-medium text-slate-400">
                    فات الوقت
                  </span>
                )}
                {taken && (
                  <span className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-rose-400">
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 0h10.5a2.25 2.25 0 0 1 2.25 2.25v6A2.25 2.25 0 0 1 17.25 21H6.75A2.25 2.25 0 0 1 4.5 18.75v-6a2.25 2.25 0 0 1 2.25-2.25Z"
                      />
                    </svg>
                    محجوز
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <span>🕐</span>
          <span>Africa/Cairo</span>
        </div>
      </div>
    </div>
  )
}
