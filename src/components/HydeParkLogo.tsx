/**
 * Hyde Park Developments full logo lockup (monogram + "HYDE PARK / DEVELOPMENTS"
 * wordmark in one transparent PNG), served from /public.
 */

export function HydeParkMark({ className }: { className?: string }) {
  return (
    <img
      src="/HYDAPARK.png"
      alt="Hyde Park Developments"
      className={`object-contain ${className ?? ''}`}
    />
  )
}

export default function HydeParkLogo() {
  // The PNG is the full lockup, tightly cropped to the artwork (no padding).
  // It's a wide lockup, so on mobile max-w-full caps the width and the height
  // follows; the h-* values mainly drive the larger-screen size.
  return <HydeParkMark className="h-16 w-auto max-w-full sm:h-24" />
}
