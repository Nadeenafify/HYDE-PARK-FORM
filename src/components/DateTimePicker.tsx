import { useState } from 'react'

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

function sameDay(a: Date | null, b: Date | null) {
  if (!a || !b) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

type Props = {
  selectedDate: Date | null
  onSelectDate: (d: Date) => void
  selectedTime: string | null
  onSelectTime: (t: string) => void
}

export default function DateTimePicker({
  selectedDate,
  onSelectDate,
  selectedTime,
  onSelectTime,
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

  return (
    <div className="flex flex-col gap-6 md:flex-row" dir="ltr">
      {/* Calendar */}
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`e-${idx}`} />
            const cellDate = new Date(viewYear, viewMonth, day)
            const isPast = cellDate < today
            const isSelected = sameDay(cellDate, selectedDate)
            const isToday = sameDay(cellDate, today)
            return (
              <div key={day} className="flex items-center justify-center">
                <button
                  type="button"
                  disabled={isPast}
                  onClick={() => onSelectDate(cellDate)}
                  className={[
                    'flex h-9 w-9 items-center justify-center rounded-full transition',
                    isSelected
                      ? 'bg-[#222a4d] font-semibold text-white shadow-sm'
                      : isPast
                        ? 'cursor-not-allowed text-slate-300'
                        : 'text-slate-700 hover:bg-[#222a4d]/8',
                    isToday && !isSelected ? 'ring-1 ring-[#222a4d]/30' : '',
                  ].join(' ')}
                >
                  {day}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Time slots */}
      <div className="flex-1">
        <div className="mb-3 flex items-center gap-2 text-[#2d3e50]">
          <span className="text-sm font-semibold">{headerLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {TIME_SLOTS.map((slot) => {
            const active = selectedTime === slot
            return (
              <button
                key={slot}
                type="button"
                disabled={!selectedDate}
                onClick={() => onSelectTime(slot)}
                className={[
                  'rounded-xl border py-2.5 text-sm font-medium transition',
                  active
                    ? 'border-[#222a4d] bg-[#222a4d] text-white shadow-sm'
                    : 'border-slate-200 text-[#2d3e50] hover:border-[#222a4d]/40 hover:bg-[#222a4d]/5',
                  !selectedDate ? 'cursor-not-allowed opacity-50' : '',
                ].join(' ')}
              >
                {slot}
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
