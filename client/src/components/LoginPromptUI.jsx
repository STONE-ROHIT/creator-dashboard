import React from 'react';
import { useNavigate } from 'react-router-dom';

export const LoginPromptUI = ({ onBackClick }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">🔐</div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Login Required
        </h1>

        <p className="text-gray-600 mb-8">
          This is premium content. Please log in to view and subscribe.
        </p>

        <button
          onClick={() => navigate('/login')}
          className="w-full py-3 bg-blue-600 text-white font-bold text-lg rounded-lg hover:bg-blue-700 transition mb-3"
        >
          Login
        </button>

        <button
          onClick={() => navigate('/register')}
          className="w-full py-3 border-2 border-blue-600 text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition mb-3"
        >
          Create Account
        </button>

        {onBackClick && (
          <button
            onClick={onBackClick}
            className="w-full py-2 text-gray-600 font-medium hover:text-gray-900"
          >
            Go Back
          </button>
        )}
      </div>
    </div>
  );
};