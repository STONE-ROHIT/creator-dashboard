import React from 'react';

/**
 * ErrorPage
 * 
 * Generic error component with retry option
 */
export const ErrorPage = ({ error, onRetry, onBackClick }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>

          <h2 className="text-3xl font-bold text-red-800 mb-4">
            Something Went Wrong
          </h2>

          <p className="text-red-700 mb-8 text-lg">
            {error || 'An unexpected error occurred'}
          </p>

          <div className="flex gap-4 justify-center">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
              >
                Try Again
              </button>
            )}

            {onBackClick && (
              <button
                onClick={onBackClick}
                className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition"
              >
                Go Back
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};