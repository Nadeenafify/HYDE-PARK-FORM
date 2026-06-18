import { useEffect, useRef, useState } from 'react'
import DateTimePicker from './DateTimePicker'
import { fetchUnits, submitBooking } from '../api'

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

function Label({ ar, en }: { ar: string; en: string }) {
  return (
    <span className="text-[15px] font-medium text-[#3a4a5a]">
      <span className="text-red-500">*</span> {ar} /{' '}
      <span className="text-[#3a4a5a]">{en}</span>
    </span>
  )
}

// Border styles toggled by a field's validation state.
const ERR_BORDER = 'border-red-400 focus:border-red-500 focus:ring-red-500'
const OK_BORDER = 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'

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
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="px-8 py-16 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
          ✓
        </div>
        <h2 className="text-2xl font-semibold text-[#2d3e50]">تم إرسال طلبك بنجاح</h2>
        <p className="mt-2 text-gray-500">سنتواصل معك لتأكيد معاد التركيب.</p>
        <p className="mt-1 text-sm text-gray-400">
          {date?.toLocaleDateString('en-GB')} — {time}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="px-6 py-8 sm:px-10">
      {/* Unit Number */}
      <Field label={<Label ar="رقم الوحدة" en="Unit Number" />} error={errors.unit}>
        <select
          value={unit}
          aria-invalid={!!errors.unit}
          onChange={(e) => {
            setUnit(e.target.value)
            setErrors((er) => ({ ...er, unit: undefined }))
          }}
          className={`w-full rounded-md border bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:ring-1 ${
            errors.unit ? ERR_BORDER : OK_BORDER
          }`}
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
        label={<Label ar="اسم مالك الوحدة" en="Owner Name" />}
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
              className={`w-full rounded-md border px-3 py-2.5 text-sm outline-none focus:ring-1 ${
                errors.firstName ? ERR_BORDER : OK_BORDER
              }`}
            />
            <span className="mt-1 block text-xs text-[#b58b5a]">الاسم الاول</span>
          </div>
          <div>
            <input
              value={lastName}
              aria-invalid={!!errors.lastName}
              onChange={(e) => {
                setLastName(e.target.value)
                setErrors((er) => ({ ...er, lastName: undefined }))
              }}
              className={`w-full rounded-md border px-3 py-2.5 text-sm outline-none focus:ring-1 ${
                errors.lastName ? ERR_BORDER : OK_BORDER
              }`}
            />
            <span className="mt-1 block text-xs text-[#b58b5a]">الاسم الاخر</span>
          </div>
        </div>
      </Field>

      {/* Mobile Number */}
      <Field label={<Label ar="رقم التلفون" en="Mobile Number" />} error={errors.mobile}>
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
          className={`w-full rounded-md border px-3 py-2.5 text-right text-sm outline-none placeholder:text-gray-300 focus:ring-1 ${
            errors.mobile ? ERR_BORDER : OK_BORDER
          }`}
        />
      </Field>

      {/* HPD Receipt upload */}
      <Field
        label={
          <Label
            ar="صورة ايصال تعاقد الخدمه مع هايد بارك"
            en="HPD Receipt"
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
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-10 text-center transition',
            dragOver
              ? 'border-indigo-500 bg-indigo-50'
              : errors.receipt
                ? 'border-red-400 bg-red-50/40'
                : 'border-gray-300 bg-gray-50/50',
          ].join(' ')}
        >
          <svg
            className="h-9 w-9 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 7.5 12 3m0 0L7.5 7.5M12 3v13.5"
            />
          </svg>
          {receipt ? (
            <span className="text-sm font-medium text-indigo-600">{receipt.name}</span>
          ) : (
            <span className="text-sm text-gray-500">إسحب الملفات وأتركها هنا</span>
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
        label={<Label ar="معاد التركيب" en="Installation Date" />}
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
        />
      </Field>

      {/* Terms */}
      <div className="mb-6 mt-2">
        <h3 className="mb-3 font-semibold text-red-600 underline">
          شروط تقديم وتفعيل الخدمة
        </h3>
        <ol className="space-y-2 text-sm leading-relaxed text-[#3a4a5a]">
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
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => {
              setAgree(e.target.checked)
              setErrors((er) => ({ ...er, agree: undefined }))
            }}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-[#3a4a5a]">
            <span className="text-red-500">*</span> اوافق على شروط تقديم الخدمة
          </span>
        </label>
        {errors.agree && <p className="mt-1 text-xs text-red-500">{errors.agree}</p>}
      </div>

      {/* Submit */}
      {submitError && (
        <p className="mb-4 text-center text-sm text-red-600">{submitError}</p>
      )}
      <div className="flex justify-center">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-indigo-600 px-10 py-2.5 font-medium text-white shadow-sm transition hover:bg-indigo-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? '...جارٍ الإرسال' : 'إرسال / Submit'}
        </button>
      </div>
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
    <div className="mb-7">
      <div className="mb-2">{label}</div>
      {children}
      {hint && <p className="mt-1.5 text-xs text-[#b58b5a]">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
