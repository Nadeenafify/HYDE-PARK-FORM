import HydeParkLogo from './components/HydeParkLogo'
import BookingForm from './components/BookingForm'

function App() {
  return (
    <div className="min-h-screen bg-[#eef0f7] px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex justify-center">
          <HydeParkLogo />
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {/* Card header */}
          <div className="border-b border-gray-100 px-6 py-6 text-right sm:px-10">
            <h1 className="text-2xl font-semibold text-[#2d3e50]">
              حجز HPD Triple Play
            </h1>
            <p className="mt-1 text-sm text-[#b58b5a]">من فضلك قم بملء النموذج</p>
          </div>

          <BookingForm />
        </div>
      </div>
    </div>
  )
}

export default App
