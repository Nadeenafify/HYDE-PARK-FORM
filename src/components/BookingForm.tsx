import { useEffect, useMemo, useRef, useState } from 'react'
import DateTimePicker from './DateTimePicker'
import { ApiError, fetchBookedSlots, fetchClosedDays, fetchUnits, submitBooking } from '../api'

// Fallback list used only if the backend can't be reached. The live list is
// loaded from GET /api/units on mount.
const UNIT_OPTIONS = [
  'A-101', 'A-102', 'A-201', 'A-202',
  'B-101', 'B-102', 'B-201', 'B-202',
  'Villa-01', 'Villa-02', 'Villa-03',
]

// Format a Date as a local YYYY-MM-DD string (avoids a UTC off-by-one).
function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Validation rules kept in lock-step with the backend (create-booking.dto.ts /
// multer.config.ts) so the client surfaces problems before the round-trip while
// the server stays the source of truth.
const NAME_MAX = 80
const MOBILE_RE = /^[0-9]{8,15}$/
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024 // 10 MB
const ACCEPTED_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

type FieldName = 'unit' | 'firstName' | 'lastName' | 'mobile' | 'receipt' | 'datetime' | 'agree'

type Errors = Partial<Record<FieldName, string>>

type FieldValues = {
  unit: string
  firstName: string
  lastName: string
  mobile: string
  receipt: File | null
  date: Date | null
  time: string | null
  agree: boolean
}

// Order errors are surfaced / focused in — matches the visual top-to-bottom flow.
const FIELD_ORDER: FieldName[] = [
  'unit',
  'mobile',
  'firstName',
  'lastName',
  'receipt',
  'datetime',
  'agree',
]

// Pure, single-field validator reused by blur, live re-validation, and submit.
function fieldError(field: FieldName, v: FieldValues): string | undefined {
  switch (field) {
    case 'unit':
      return v.unit ? undefined : 'برجاء اختيار رقم الوحدة'
    case 'firstName':
    case 'lastName': {
      const name = (field === 'firstName' ? v.firstName : v.lastName).trim()
      if (!name) return 'مطلوب'
      if (name.length > NAME_MAX) return `الاسم يجب ألا يتجاوز ${NAME_MAX} حرفاً`
      return undefined
    }
    case 'mobile':
      return MOBILE_RE.test(v.mobile) ? undefined : 'برجاء إدخال رقم تلفون صحيح'
    case 'receipt':
      return v.receipt ? undefined : 'برجاء ارفاق صورة ايصال الدفع'
    case 'datetime':
      return v.date && v.time ? undefined : 'برجاء اختيار معاد التركيب'
    case 'agree':
      return v.agree ? undefined : 'يجب الموافقة على شروط تقديم الخدمة'
  }
}

function validateAll(v: FieldValues): Errors {
  const next: Errors = {}
  for (const field of FIELD_ORDER) {
    const msg = fieldError(field, v)
    if (msg) next[field] = msg
  }
  return next
}

/* ------------------------------------------------------------------ icons -- */

const ICON_PATHS = {
  unit: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.75A.75.75 0 0 1 9.75 16.5h4.5a.75.75 0 0 1 .75.75V21',
  user: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z',
  phone: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z',
  receipt: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
  calendar: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
  send: 'M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5',
} as const

type IconName = keyof typeof ICON_PATHS

function Icon({ name, className = 'h-[18px] w-[18px]' }: { name: IconName; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d={ICON_PATHS[name]} />
    </svg>
  )
}

function Label({ ar, en, icon }: { ar: string; en: string; icon: IconName }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#2a3358] to-[#222a4d] text-white shadow-sm shadow-[#222a4d]/25">
        <Icon name={icon} />
      </span>
      <span className="flex flex-wrap items-baseline gap-x-1.5 text-[15px] font-semibold text-[#2d3e50]">
        {ar}
        <span dir="ltr" className="text-xs font-normal text-slate-400">
          / {en}
        </span>
        <span className="text-[#b58b5a]">*</span>
      </span>
    </span>
  )
}

/* ------------------------------------------------------------------ inputs -- */

// Shared input styling, with border/ring colors swapped on validation state.
const INPUT_BASE =
  'w-full rounded-xl border bg-slate-50/60 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-300 focus:bg-white focus:ring-4'
const ERR_BORDER = 'border-red-300 focus:border-red-400 focus:ring-red-400/15'
const OK_BORDER = 'border-slate-200 focus:border-[#222a4d] focus:ring-[#222a4d]/12'

function fieldClass(hasError: boolean, extra = '') {
  return `${INPUT_BASE} ${hasError ? ERR_BORDER : OK_BORDER} ${extra}`.trim()
}

/* -------------------------------------------------------- searchable select -- */

// Type-to-filter combobox that replaces the native <select> for the unit list,
// which can grow long. Fully keyboard-navigable. Selecting an option keeps the
// input focused — option mousedown is prevented so the click lands before the
// input would otherwise blur and close the menu. Closing/validation happen on
// blur, matching the rest of the form.
function SearchableSelect({
  value,
  options,
  onChange,
  onBlur,
  hasError,
  inputRef,
  describedBy,
  placeholder = 'Please select',
}: {
  value: string
  options: string[]
  onChange: (value: string) => void
  onBlur: () => void
  hasError: boolean
  /** Forwarded to the inner input so a failed submit can focus this field. */
  inputRef: (el: HTMLInputElement | null) => void
  describedBy?: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const optionRefs = useRef<(HTMLLIElement | null)[]>([])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options
  }, [options, query])

  // Keep the highlighted option in view while navigating with the keyboard.
  useEffect(() => {
    if (open) optionRefs.current[active]?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  function openMenu() {
    if (open) return
    setQuery('')
    const idx = options.indexOf(value)
    setActive(idx >= 0 ? idx : 0)
    setOpen(true)
  }

  function choose(option: string) {
    onChange(option)
    setOpen(false)
    setQuery('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!open) return openMenu()
        setActive((a) => Math.min(a + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!open) return openMenu()
        setActive((a) => Math.max(a - 1, 0))
        break
      case 'Enter':
        if (open) {
          e.preventDefault()
          const pick = filtered[active]
          if (pick) choose(pick)
        }
        break
      case 'Escape':
        if (open) {
          e.preventDefault()
          setOpen(false)
          setQuery('')
        }
        break
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="unit-listbox"
        aria-autocomplete="list"
        aria-activedescendant={open && filtered[active] ? `unit-opt-${active}` : undefined}
        aria-invalid={hasError}
        aria-describedby={describedBy}
        autoComplete="off"
        value={open ? query : value}
        placeholder={placeholder}
        onFocus={openMenu}
        onClick={openMenu}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setOpen(false)
          setQuery('')
          onBlur()
        }}
        className={fieldClass(hasError, 'cursor-text pe-10')}
      />
      <svg
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 end-3 my-auto h-4 w-4 text-slate-400 transition-transform ${
          open ? 'rotate-180' : ''
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
      </svg>

      {open && (
        <ul
          id="unit-listbox"
          role="listbox"
          className="absolute z-20 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg shadow-slate-900/5"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-slate-400">لا توجد نتائج مطابقة</li>
          ) : (
            filtered.map((option, i) => {
              const selected = option === value
              const isActive = i === active
              return (
                <li
                  key={option}
                  id={`unit-opt-${i}`}
                  role="option"
                  aria-selected={selected}
                  ref={(el) => {
                    optionRefs.current[i] = el
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(option)}
                  className={[
                    'flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm transition',
                    isActive ? 'bg-[#222a4d]/8 text-[#222a4d]' : 'text-slate-700',
                    selected ? 'font-semibold' : '',
                  ].join(' ')}
                >
                  <span>{option}</span>
                  {selected && (
                    <svg
                      className="h-4 w-4 text-[#b58b5a]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}

export default function BookingForm() {
  const [unit, setUnit] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [mobile, setMobile] = useState('')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [date, setDate] = useState<Date | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [agree, setAgree] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)
  const [units, setUnits] = useState<string[]>(UNIT_OPTIONS)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Already-booked installation slots, keyed as "YYYY-MM-DD|10:00 AM".
  const [takenSlots, setTakenSlots] = useState<Set<string>>(new Set())
  // Admin-declared closed days, mapped "YYYY-MM-DD" -> reason.
  const [closedDays, setClosedDays] = useState<Map<string, string>>(new Map())

  const fileInputRef = useRef<HTMLInputElement>(null)
  // Maps each field to its focusable element so a failed submit can jump to the
  // first problem.
  const fieldRefs = useRef<Partial<Record<FieldName, HTMLElement | null>>>({})

  // Snapshot of the current field values for the validators.
  const values: FieldValues = { unit, firstName, lastName, mobile, receipt, date, time, agree }

  // Show a field's error on blur (first feedback for that field).
  function handleBlur(field: FieldName) {
    setErrors((er) => ({ ...er, [field]: fieldError(field, values) }))
  }

  // Re-validate a single field as the user types, but only once it already has
  // an error showing — so the message clears the moment the input becomes valid
  // without nagging mid-typing.
  function liveValidate(field: FieldName, override: Partial<FieldValues>) {
    setErrors((er) =>
      er[field] ? { ...er, [field]: fieldError(field, { ...values, ...override }) } : er,
    )
  }

  function focusFirstError(errs: Errors) {
    const first = FIELD_ORDER.find((f) => errs[f])
    if (!first) return
    const el = fieldRefs.current[first]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.focus({ preventScroll: true })
  }

  // Load the live unit list from the backend; keep the fallback on failure.
  useEffect(() => {
    fetchUnits()
      .then((list) => {
        if (list.length > 0) setUnits(list.map((u) => u.code))
      })
      .catch(() => {
        /* backend offline — keep UNIT_OPTIONS fallback */
      })
  }, [])

  // Load already-booked slots so taken date/time options are disabled.
  useEffect(() => {
    fetchBookedSlots()
      .then((slots) => setTakenSlots(new Set(slots.map((s) => `${s.date}|${s.time}`))))
      .catch(() => {
        /* availability unknown — server still enforces it on submit */
      })
  }, [])

  // Load admin-declared closed days (holidays) so they're disabled too.
  useEffect(() => {
    fetchClosedDays()
      .then((days) =>
        setClosedDays(new Map(days.map((d) => [d.date, d.reason ?? 'إجازة']))),
      )
      .catch(() => {
        /* closed days unknown — server still enforces it on submit */
      })
  }, [])

  // Validate the receipt against the same rules the server enforces (type +
  // size) so an oversized or wrong-format file fails instantly instead of after
  // a 10 MB round-trip. A rejected file keeps any previously valid selection.
  function handleFile(files: FileList | null) {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!ACCEPTED_RECEIPT_TYPES.includes(file.type)) {
      setErrors((e) => ({
        ...e,
        receipt: 'صيغة الملف غير مدعومة — برجاء رفع صورة JPG أو PNG أو WEBP أو ملف PDF',
      }))
      return
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      setErrors((e) => ({
        ...e,
        receipt: 'حجم الملف كبير جداً — الحد الأقصى ١٠ ميجابايت',
      }))
      return
    }
    setReceipt(file)
    setErrors((e) => ({ ...e, receipt: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    const next = validateAll(values)
    setErrors(next)
    if (Object.keys(next).length > 0) {
      focusFirstError(next)
      return
    }

    // validateAll() guarantees these are set by this point.
    setSubmitting(true)
    try {
      await submitBooking({
        unitCode: unit,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        mobile,
        installationDate: toISODate(date!),
        installationTime: time!,
        agreedToTerms: agree,
        receipt: receipt!,
      })
      setSubmitted(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Someone booked this slot between page load and submit. Show a clear
        // localized message, refresh availability, and drop the now-taken time.
        setSubmitError('هذا الموعد لم يعد متاحاً — تم حجزه للتو، برجاء اختيار موعد آخر')
        fetchBookedSlots()
          .then((slots) => {
            const set = new Set(slots.map((s) => `${s.date}|${s.time}`))
            setTakenSlots(set)
            if (date && time && set.has(`${toISODate(date)}|${time}`)) {
              setTime(null)
            }
          })
          .catch(() => {})
      } else {
        setSubmitError(
          err instanceof Error ? err.message : 'تعذّر إرسال الطلب، حاول مرة أخرى',
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="px-8 py-16 text-center animate-[rise_0.5s_ease-out]">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 ring-8 ring-emerald-50">
          <svg
            className="h-10 w-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-[#222a4d]">تم إرسال طلبك بنجاح</h2>
        <p className="mt-2 text-sm text-slate-500">
          سنتواصل معك قريباً لتأكيد موعد التركيب.
        </p>
        <div
          dir="ltr"
          className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-sm font-semibold text-[#222a4d] ring-1 ring-slate-100"
        >
          <Icon name="calendar" className="h-4 w-4 text-[#b58b5a]" />
          {date?.toLocaleDateString('en-GB')} — {time}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="px-4 py-5 sm:px-6 sm:py-5">
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
      {/* Unit Number */}
      <Field
        label={<Label ar="رقم الوحدة" en="Unit Number" icon="unit" />}
        error={errors.unit}
        errorId="unit-error"
      >
        <SearchableSelect
          inputRef={(el) => {
            fieldRefs.current.unit = el
          }}
          value={unit}
          options={units}
          hasError={!!errors.unit}
          describedBy={errors.unit ? 'unit-error' : undefined}
          onChange={(v) => {
            setUnit(v)
            setErrors((er) => ({ ...er, unit: undefined }))
          }}
          onBlur={() => handleBlur('unit')}
        />
      </Field>

      {/* Mobile Number */}
      <Field
        label={<Label ar="رقم التلفون" en="Mobile Number" icon="phone" />}
        error={errors.mobile}
        errorId="mobile-error"
      >
        <input
          ref={(el) => {
            fieldRefs.current.mobile = el
          }}
          inputMode="numeric"
          maxLength={15}
          value={mobile}
          aria-invalid={!!errors.mobile}
          aria-describedby={errors.mobile ? 'mobile-error' : undefined}
          onChange={(e) => {
            // Strip non-digits and hard-cap at 15 (the server max) so the field
            // can't run away even on paste.
            const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 15)
            setMobile(digits)
            liveValidate('mobile', { mobile: digits })
          }}
          onBlur={() => handleBlur('mobile')}
          placeholder="00000000000"
          dir="ltr"
          className={fieldClass(!!errors.mobile, 'text-right')}
        />
      </Field>

      {/* Owner Name */}
      <Field wide label={<Label ar="اسم مالك الوحدة" en="Owner Name" icon="user" />}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <input
              ref={(el) => {
                fieldRefs.current.firstName = el
              }}
              value={firstName}
              maxLength={NAME_MAX}
              aria-invalid={!!errors.firstName}
              aria-describedby={errors.firstName ? 'firstName-error' : undefined}
              onChange={(e) => {
                const v = e.target.value
                setFirstName(v)
                liveValidate('firstName', { firstName: v })
              }}
              onBlur={() => handleBlur('firstName')}
              className={fieldClass(!!errors.firstName)}
            />
            {errors.firstName ? (
              <span id="firstName-error" role="alert" className="mt-1.5 block text-xs font-medium text-red-500">
                {errors.firstName}
              </span>
            ) : (
              <span className="mt-1.5 block text-xs text-[#b58b5a]">الاسم الاول</span>
            )}
          </div>
          <div>
            <input
              ref={(el) => {
                fieldRefs.current.lastName = el
              }}
              value={lastName}
              maxLength={NAME_MAX}
              aria-invalid={!!errors.lastName}
              aria-describedby={errors.lastName ? 'lastName-error' : undefined}
              onChange={(e) => {
                const v = e.target.value
                setLastName(v)
                liveValidate('lastName', { lastName: v })
              }}
              onBlur={() => handleBlur('lastName')}
              className={fieldClass(!!errors.lastName)}
            />
            {errors.lastName ? (
              <span id="lastName-error" role="alert" className="mt-1.5 block text-xs font-medium text-red-500">
                {errors.lastName}
              </span>
            ) : (
              <span className="mt-1.5 block text-xs text-[#b58b5a]">الاسم الاخر</span>
            )}
          </div>
        </div>
      </Field>

      {/* HPD Receipt upload */}
      <Field
        wide
        label={
          <Label
            ar="صورة ايصال تعاقد الخدمه مع هايد بارك"
            en="HPD Receipt"
            icon="receipt"
          />
        }
        error={errors.receipt}
        errorId="receipt-error"
        hint="برجاء ارفاق صوره ايصال الدفع"
      >
        <div
          ref={(el) => {
            fieldRefs.current.receipt = el
          }}
          role="button"
          tabIndex={0}
          aria-invalid={!!errors.receipt}
          aria-describedby={errors.receipt ? 'receipt-error' : undefined}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              fileInputRef.current?.click()
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFile(e.dataTransfer.files)
          }}
          className={[
            'group flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed px-6 py-9 text-center transition',
            dragOver
              ? 'border-[#222a4d] bg-[#222a4d]/5'
              : errors.receipt
                ? 'border-red-300 bg-red-50/40'
                : receipt
                  ? 'border-[#b58b5a]/60 bg-[#b58b5a]/5'
                  : 'border-slate-300 bg-slate-50/50 hover:border-[#222a4d]/40 hover:bg-slate-50',
          ].join(' ')}
        >
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 transition group-hover:scale-105 ${
              receipt ? 'ring-[#b58b5a]/30' : 'ring-slate-100 group-hover:ring-[#222a4d]/20'
            }`}
          >
            {receipt ? (
              <svg
                className="h-5 w-5 text-[#b58b5a]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            ) : (
              <svg
                className="h-5 w-5 text-[#222a4d]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 7.5 12 3m0 0L7.5 7.5M12 3v13.5"
                />
              </svg>
            )}
          </span>
          {receipt ? (
            <span dir="ltr" className="text-sm font-semibold text-[#222a4d]">
              {receipt.name}
            </span>
          ) : (
            <>
              <span className="text-sm font-medium text-slate-600">
                إسحب صورة الإيصال هنا أو اضغط للرفع
              </span>
              <span dir="ltr" className="text-xs text-slate-400">
                PNG · JPG · PDF
              </span>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files)}
          />
        </div>
      </Field>

      {/* Installation Date */}
      <Field
        wide
        label={<Label ar="معاد التركيب" en="Installation Date" icon="calendar" />}
        error={errors.datetime}
        errorId="datetime-error"
      >
        <div
          ref={(el) => {
            fieldRefs.current.datetime = el
          }}
          tabIndex={-1}
          aria-describedby={errors.datetime ? 'datetime-error' : undefined}
          className="outline-none"
        >
          <DateTimePicker
            selectedDate={date}
            onSelectDate={(d) => {
              setDate(d)
              setErrors((er) => ({ ...er, datetime: fieldError('datetime', { ...values, date: d }) }))
            }}
            selectedTime={time}
            onSelectTime={(t) => {
              setTime(t)
              setErrors((er) => ({ ...er, datetime: fieldError('datetime', { ...values, time: t }) }))
            }}
            takenSlots={takenSlots}
            closedDays={closedDays}
          />
        </div>
      </Field>

      {/* Terms */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:col-span-2">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-[#222a4d]">
          <span className="h-4 w-1 rounded-full bg-[#b58b5a]" />
          شروط تقديم وتفعيل الخدمة
        </h3>
        <ol className="space-y-2 text-sm leading-relaxed text-slate-600">
          <li>
            ١- على العميل أو مقدم هذا الطلب التأكد من وجود المسار الذى يربط بواط التجميع
            الداخلى للكهرباء بوحدة الألياف الضوئية المتواجدة خارج الوحدة ( شقة / فيلا ).
          </li>
          <li>
            ٢- لا يمكن توصيل وتشغيل خدمة التربل بلاي بالوحدة ( شقة / فيلا ) في حالة وجود اي
            زاويه قائمة ( زاويه ٩٠ درجه ) فالمسار المخصص لتلك الخدمة.
          </li>
          <li>
            ٣- على العميل أو مقدم هذا الطلب تحديد موعد المعاينة لإتمام إجراءات ربط الوحدة على
            الشبكة الرئيسية.
          </li>
          <li>
            ٤- لا يحق للعميل أو مقدم هذا الطلب الرجوع على الشركة بأية إدعاءات قانونية بشأن عدم
            تركيب هذة الخدمة فى الوحدة ( شقة / فيلا ).
          </li>
        </ol>
      </div>

      {/* Agreement */}
      <div className="sm:col-span-2">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            ref={(el) => {
              fieldRefs.current.agree = el
            }}
            type="checkbox"
            checked={agree}
            aria-invalid={!!errors.agree}
            aria-describedby={errors.agree ? 'agree-error' : undefined}
            onChange={(e) => {
              setAgree(e.target.checked)
              setErrors((er) => ({ ...er, agree: e.target.checked ? undefined : er.agree }))
            }}
            className="h-4 w-4 rounded border-slate-300 text-[#222a4d] focus:ring-[#222a4d]/30"
          />
          <span className="text-sm font-medium text-[#3a4a5a]">
            <span className="text-[#b58b5a]">*</span> اوافق على شروط تقديم الخدمة
          </span>
        </label>
        {errors.agree && (
          <p id="agree-error" role="alert" className="mt-1.5 text-xs font-medium text-red-500">
            {errors.agree}
          </p>
        )}
      </div>

      {/* Submit */}
      <div className="sm:col-span-2">
      {submitError && (
        <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
          {submitError}
        </div>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="group relative w-full overflow-hidden rounded-xl bg-linear-to-r from-[#2c3660] to-[#222a4d] px-8 py-4 text-[15px] font-semibold text-white shadow-lg shadow-[#222a4d]/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#222a4d]/30 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {/* shimmer sweep on hover */}
        <span
          aria-hidden
          className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        />
        <span className="relative flex items-center justify-center gap-2">
          {submitting ? (
            '...جارٍ الإرسال'
          ) : (
            <>
              إرسال الطلب / Submit
              <Icon name="send" className="h-4 w-4" />
            </>
          )}
        </span>
      </button>
      </div>
      </div>
    </form>
  )
}

function Field({
  label,
  hint,
  error,
  errorId,
  wide,
  children,
}: {
  label: React.ReactNode
  hint?: string
  error?: string
  /** id for the error message, so the input can reference it via aria-describedby. */
  errorId?: string
  /** Span both columns of the form grid (full width). */
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <div className="mb-2">{label}</div>
      {children}
      {hint && <p className="mt-1.5 text-xs text-[#b58b5a]">{hint}</p>}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-red-500">
          {error}
        </p>
      )}
    </div>
  )
}
