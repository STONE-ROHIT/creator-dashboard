import React from 'react';

export const NotFoundPage = ({ onBackClick }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">😕</div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Content Not Found
        </h1>

        <p className="text-gray-600 mb-8">
          This content doesn't exist or has been removed.
        </p>

        {onBackClick && (
          <button
            onClick={onBackClick}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
          >
            Browse All Content
          </button>
        )}
      </div>
    </div>
  );
};