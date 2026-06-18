/**
 * Hyde Park Developments brand lockup: the navy "H" monogram (served as a PNG
 * from /public) next to the "HYDE PARK / DEVELOPMENTS" wordmark.
 */

export function HydeParkMark({ className }: { className?: string }) {
  return (
    <img
      src="/HYDEPARK_ICON.png"
      alt="Hyde Park Developments"
      className={`object-contain ${className ?? ''}`}
    />
  )
}

export default function HydeParkLogo() {
  return (
    <div className="flex items-center justify-center gap-4 text-[#222a4d]">
      <HydeParkMark className="h-16 w-16 shrink-0" />

      <div dir="ltr" className="leading-none">
        <div className="text-3xl font-semibold tracking-[0.18em]">HYDE PARK</div>
        <div className="mt-1 text-[0.7rem] font-medium tracking-[0.55em] text-[#7b80a0]">
          DEVELOPMENTS
        </div>
      </div>
    </div>
  )
}
