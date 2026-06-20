import { useEffect, useRef, useState } from 'react'
import DateTimePicker from './DateTimePicker'
import { fetchBookedSlots, fetchClosedDays, fetchUnits, submitBooking } from '../api'

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

type Errors = Partial<
  Record<
    'unit' | 'firstName' | 'lastName' | 'mobile' | 'receipt' | 'datetime' | 'agree',
    string
  >
>

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
  'w-full rounded-xl border bg-slate-50/60 px-4 py-3.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-300 focus:bg-white focus:ring-4'
const ERR_BORDER = 'border-red-300 focus:border-red-400 focus:ring-red-400/15'
const OK_BORDER = 'border-slate-200 focus:border-[#222a4d] focus:ring-[#222a4d]/12'

function fieldClass(hasError: boolean, extra = '') {
  return `${INPUT_BASE} ${hasError ? ERR_BORDER : OK_BORDER} ${extra}`.trim()
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

  function handleFile(files: FileList | null) {
    if (files && files.length > 0) {
      setReceipt(files[0])
      setErrors((e) => ({ ...e, receipt: undefined }))
    }
  }

  function validate(): Errors {
    const next: Errors = {}
    if (!unit) next.unit = 'برجاء اختيار رقم الوحدة'
    if (!firstName.trim()) next.firstName = 'مطلوب'
    if (!lastName.trim()) next.lastName = 'مطلوب'
    if (!/^[0-9]{8,15}$/.test(mobile)) next.mobile = 'برجاء إدخال رقم تلفون صحيح'
    if (!receipt) next.receipt = 'برجاء ارفاق صورة ايصال الدفع'
    if (!date || !time) next.datetime = 'برجاء اختيار معاد التركيب'
    if (!agree) next.agree = 'يجب الموافقة على شروط تقديم الخدمة'
    return next
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return

    // validate() guarantees these are set by this point.
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
      setSubmitError(
        err instanceof Error ? err.message : 'تعذّر إرسال الطلب، حاول مرة أخرى',
      )
      // The slot may have just been taken by someone else — refresh availability
      // and clear the chosen time if it is no longer free.
      fetchBookedSlots()
        .then((slots) => {
          const set = new Set(slots.map((s) => `${s.date}|${s.time}`))
          setTakenSlots(set)
          if (date && time && set.has(`${toISODate(date)}|${time}`)) {
            setTime(null)
          }
        })
        .catch(() => {})
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
    <form onSubmit={handleSubmit} noValidate className="px-6 py-8 sm:px-10 sm:py-9">
      {/* Unit Number */}
      <Field label={<Label ar="رقم الوحدة" en="Unit Number" icon="unit" />} error={errors.unit}>
        <select
          value={unit}
          aria-invalid={!!errors.unit}
          onChange={(e) => {
            setUnit(e.target.value)
            setErrors((er) => ({ ...er, unit: undefined }))
          }}
          className={fieldClass(!!errors.unit, 'cursor-pointer')}
        >
          <option value="" disabled>
            Please select
          </option>
          {units.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </Field>

      {/* Owner Name */}
      <Field
        label={<Label ar="اسم مالك الوحدة" en="Owner Name" icon="user" />}
        error={errors.firstName || errors.lastName}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <input
              value={firstName}
              aria-invalid={!!errors.firstName}
              onChange={(e) => {
                setFirstName(e.target.value)
                setErrors((er) => ({ ...er, firstName: undefined }))
              }}
              className={fieldClass(!!errors.firstName)}
            />
            <span className="mt-1.5 block text-xs text-[#b58b5a]">الاسم الاول</span>
          </div>
          <div>
            <input
              value={lastName}
              aria-invalid={!!errors.lastName}
              onChange={(e) => {
                setLastName(e.target.value)
                setErrors((er) => ({ ...er, lastName: undefined }))
              }}
              className={fieldClass(!!errors.lastName)}
            />
            <span className="mt-1.5 block text-xs text-[#b58b5a]">الاسم الاخر</span>
          </div>
        </div>
      </Field>

      {/* Mobile Number */}
      <Field label={<Label ar="رقم التلفون" en="Mobile Number" icon="phone" />} error={errors.mobile}>
        <input
          inputMode="numeric"
          value={mobile}
          aria-invalid={!!errors.mobile}
          onChange={(e) => {
            setMobile(e.target.value.replace(/[^0-9]/g, ''))
            setErrors((er) => ({ ...er, mobile: undefined }))
          }}
          placeholder="00000000000"
          dir="ltr"
          className={fieldClass(!!errors.mobile, 'text-right')}
        />
      </Field>

      {/* HPD Receipt upload */}
      <Field
        label={
          <Label
            ar="صورة ايصال تعاقد الخدمه مع هايد بارك"
            en="HPD Receipt"
            icon="receipt"
          />
        }
        error={errors.receipt}
        hint="برجاء ارفاق صوره ايصال الدفع"
      >
        <div
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
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files)}
          />
        </div>
      </Field>

      {/* Installation Date */}
      <Field
        label={<Label ar="معاد التركيب" en="Installation Date" icon="calendar" />}
        error={errors.datetime}
      >
        <DateTimePicker
          selectedDate={date}
          onSelectDate={(d) => {
            setDate(d)
            setErrors((er) => ({ ...er, datetime: undefined }))
          }}
          selectedTime={time}
          onSelectTime={(t) => {
            setTime(t)
            setErrors((er) => ({ ...er, datetime: undefined }))
          }}
          takenSlots={takenSlots}
          closedDays={closedDays}
        />
      </Field>

      {/* Terms */}
      <div className="mb-6 mt-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
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
      <div className="mb-8">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => {
              setAgree(e.target.checked)
              setErrors((er) => ({ ...er, agree: undefined }))
            }}
            className="h-4 w-4 rounded border-slate-300 text-[#222a4d] focus:ring-[#222a4d]/30"
          />
          <span className="text-sm font-medium text-[#3a4a5a]">
            <span className="text-[#b58b5a]">*</span> اوافق على شروط تقديم الخدمة
          </span>
        </label>
        {errors.agree && <p className="mt-1.5 text-xs font-medium text-red-500">{errors.agree}</p>}
      </div>

      {/* Submit */}
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
    </form>
  )
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: React.ReactNode
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-6">
      <div className="mb-2.5">{label}</div>
      {children}
      {hint && <p className="mt-1.5 text-xs text-[#b58b5a]">{hint}</p>}
      {error && <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>}
    </div>
  )
}
