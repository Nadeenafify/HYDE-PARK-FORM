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
  // The PNG already contains the wordmark, so render it on its own.
  return <HydeParkMark className="h-28 w-auto sm:h-32" />
}
