import React from "react"

const CompletionModal = ({ percent, open, onClose, onCompleteNow, onContinue }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-blue-800 to-indigo-500 flex items-center justify-center text-white text-xl font-bold">
              {percent}%
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800">Complete your profile</h3>
            <p className="mt-2 text-sm text-gray-600">
              {percent === 0
                ? "Welcome! Please fill your profile so recruiters can find you."
                : `Your profile is ${percent}% complete. Update it to improve your visibility to recruiters.`}
            </p>

            <div className="mt-4 flex gap-3">
              <button
                onClick={onCompleteNow}
                className="inline-flex items-center justify-center rounded-md bg-indigo-700 hover:bg-indigo-600 text-white px-4 py-2 text-sm font-medium shadow-sm"
              >
                Complete profile now
              </button>

              <button
                onClick={onContinue}
                className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Continue to jobs
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default CompletionModal
