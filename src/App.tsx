import HydeParkLogo from './components/HydeParkLogo'
import BookingForm from './components/BookingForm'

const DOTS_DARK = {
  backgroundImage:
    'radial-gradient(circle, rgba(34,42,77,0.05) 1px, transparent 1px)',
  backgroundSize: '22px 22px',
}
const DOTS_LIGHT = {
  backgroundImage:
    'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
  backgroundSize: '18px 18px',
}

function App() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-b from-[#f1f3fa] via-[#eaeef7] to-[#dfe4f0] px-4 py-5 sm:py-6">
      {/* Faint dot grid across the whole page */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={DOTS_DARK} />

      {/* Drifting brand glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-20 h-96 w-96 rounded-full bg-[#3a4790]/20 blur-3xl animate-[float-slow_9s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 -left-28 h-96 w-96 rounded-full bg-[#b58b5a]/15 blur-3xl animate-[float-slow-2_11s_ease-in-out_infinite]" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-[#222a4d]/10 blur-3xl animate-[float-slow_13s_ease-in-out_infinite]" />
      </div>

      <div className="relative mx-auto max-w-4xl">
        {/* Brand lockup */}
        <div className="mb-12 mt-8 flex justify-center animate-[rise_0.5s_ease-out]">
          <HydeParkLogo />
        </div>

        {/* Glass form card */}
        <div className="overflow-hidden rounded-[28px] bg-white/90 shadow-[0_30px_80px_-30px_rgba(34,42,77,0.5)] ring-1 ring-white/60 backdrop-blur-xl animate-[rise_0.6s_ease-out]">
          {/* Branded hero */}
          <div className="relative overflow-hidden bg-linear-to-br from-[#2c3766] via-[#222a4d] to-[#171d36] px-5 py-5 text-right sm:px-8 sm:py-6">
            {/* dot grid */}
            <div aria-hidden className="absolute inset-0" style={DOTS_LIGHT} />
            {/* inner glows */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-20 -left-10 h-56 w-56 rounded-full bg-[#5566b8]/25 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 right-0 h-56 w-56 rounded-full bg-[#b58b5a]/25 blur-3xl"
            />
            {/* top sheen */}
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent"
            />

            <div className="relative">
              <span
                dir="ltr"
                className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-white/90 ring-1 ring-white/20 backdrop-blur-sm"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#d6b78c] shadow-[0_0_8px_2px_rgba(214,183,140,0.6)]" />
                Hyde Park Developments
              </span>
              <h1 className="text-[28px] font-bold leading-tight text-white sm:text-[34px]">
                حجز خدمة HPD Home Connect
              </h1>
              <p className="mt-2.5 text-sm leading-relaxed text-white/60">
                أكمل النموذج بالتفاصيل المطلوبة لحجز موعد تركيب الخدمة.
              </p>
            </div>
          </div>

          {/* Gold accent divider */}
          <div className="h-1 bg-linear-to-r from-[#b58b5a] via-[#e6c79b] to-[#b58b5a]" />

          <BookingForm />
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          © Hyde Park Developments — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  )
}

export default App
