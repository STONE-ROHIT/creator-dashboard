import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { subscribeToContent } from '../utils/subscriptionService';

/**
 * SubscribeButton Component
 * 
 * Shows different states based on:
 * - Is content free?
 * - Is user creator?
 * - Does user have active subscription?
 * - Is subscription pending?
 */
export const SubscribeButton = ({
  contentId,
  price,
  isFree,
  isCreator,
  subscription,
  isDenied,
  userError,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Handle subscribe click
   * Creates pending subscription
   * Day 9 will handle payment
   */
  const handleSubscribe = async () => {
    setError(null);
    setIsSubscribing(true);

    const result = await subscribeToContent(contentId);

    if (result.success) {
      // Subscription created
      // Day 9: Open payment checkout here
      console.log('TODO Day 9: Open Razorpay checkout for subscription:', result.subscription.id);
      alert('Subscription created! Day 9 will add payment checkout.');
    } else {
      setError(result.error);
    }

    setIsSubscribing(false);
  };

  // Free content
  if (isFree) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
        <p className="text-green-800 font-medium">✓ This content is free</p>
      </div>
    );
  }

  // Creator viewing own content
  if (isCreator) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
        <p className="text-blue-800 font-medium">✓ You're the creator</p>
      </div>
    );
  }

  // User has active subscription
  if (subscription && subscription.status === 'active') {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
        <p className="text-green-800 font-medium">✓ You have access</p>
      </div>
    );
  }

  // User has pending subscription (payment processing)
  if (subscription && subscription.status === 'pending') {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
        <p className="text-yellow-800 font-medium mb-3">
          ⏳ Payment processing...
        </p>
        <p className="text-sm text-yellow-700">
          Your payment is being processed. Please wait or refresh the page.
        </p>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
        <p className="text-gray-800 font-medium mb-4">
          Login required to subscribe
        </p>
        <button
          onClick={() => navigate('/login')}
          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          Login to Subscribe
        </button>
      </div>
    );
  }

  // Error during subscription check
  if (error && !subscription) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
        <p className="text-red-800 font-medium mb-4">
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Default: Show subscribe button
  return (
    <button
      onClick={handleSubscribe}
      disabled={isSubscribing}
      className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {isSubscribing ? 'Creating subscription...' : `Subscribe Now (${formatCurrency(price)})`}
    </button>
  );
};