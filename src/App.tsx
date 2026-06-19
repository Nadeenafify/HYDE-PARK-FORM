import HydeParkLogo from './components/HydeParkLogo'
import BookingForm from './components/BookingForm'

function App() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-b from-[#eef1f8] via-[#e9edf6] to-[#e1e6f2] px-4 py-10 sm:py-14">
      {/* Decorative blurred brand glows in the background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-24 h-80 w-80 rounded-full bg-[#222a4d]/10 blur-3xl" />
        <div className="absolute top-1/2 -left-28 h-80 w-80 rounded-full bg-[#b58b5a]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-2xl">
        {/* Brand lockup */}
        <div className="mb-8 flex justify-center">
          <HydeParkLogo />
        </div>

        {/* Form card */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_24px_70px_-24px_rgba(34,42,77,0.45)] ring-1 ring-[#222a4d]/5">
          {/* Branded hero header */}
          <div className="relative overflow-hidden bg-linear-to-br from-[#2c3660] via-[#222a4d] to-[#1a2140] px-6 py-9 text-right sm:px-10 sm:py-11">
            {/* soft glows inside the header */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 -left-10 h-48 w-48 rounded-full bg-white/5 blur-2xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 right-0 h-48 w-48 rounded-full bg-[#b58b5a]/15 blur-2xl"
            />

            <div className="relative">
              <span
                dir="ltr"
                className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium tracking-wide text-white/85 ring-1 ring-white/15"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#d6b78c]" />
                Hyde Park Developments
              </span>
              <h1 className="text-[26px] font-bold leading-tight text-white sm:text-3xl">
                حجز خدمة HPD Triple Play
              </h1>
              <p className="mt-2 text-sm text-[#d6b78c]">
                من فضلك قم بملء النموذج لحجز موعد التركيب
              </p>
            </div>
          </div>

          {/* Gold accent divider */}
          <div className="h-1 bg-linear-to-r from-[#b58b5a] via-[#d6b78c] to-[#b58b5a]" />

          <BookingForm />
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          © Hyde Park Developments — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  )
}

export default App
