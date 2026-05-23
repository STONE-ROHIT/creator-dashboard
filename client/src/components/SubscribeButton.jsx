import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/api';
import { useAuth } from '../context/AuthContext';

/**
 * SubscribeButton Component
 */
export const SubscribeButton = ({
  contentId,
  price,
  isFree,
  isCreator,
  hasSubscription,
  isDenied,
  userError,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (isFree) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
        <p className="text-green-800 font-medium">✓ This content is free</p>
      </div>
    );
  }

  if (isCreator) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
        <p className="text-blue-800 font-medium">✓ You're the creator</p>
      </div>
    );
  }

  if (hasSubscription) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
        <p className="text-green-800 font-medium">✓ You have access</p>
      </div>
    );
  }

  if (isDenied) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
        <p className="text-red-800 font-medium mb-4">
          {userError || 'You need a subscription to view this content'}
        </p>

        {!isAuthenticated ? (
          <button
            onClick={() => navigate('/login')}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Login to Subscribe
          </button>
        ) : (
          <button
            onClick={() => {
              console.log('TODO Day 8: Subscribe to content', contentId);
            }}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold text-lg"
          >
            Subscribe Now ({formatCurrency(price)})
          </button>
        )}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
        <p className="text-gray-800 mb-4">Login required to subscribe</p>
        <button
          onClick={() => navigate('/login')}
          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        console.log('TODO Day 8: Subscribe to content', contentId);
      }}
      className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold text-lg"
    >
      Subscribe Now ({formatCurrency(price)})
    </button>
  );
};