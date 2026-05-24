import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiCall, formatCurrency } from '../utils/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

/**
 * CheckoutPage
 * 
 * Displays subscription confirmation
 * Two options:
 * 1. "Complete Payment" → Razorpay modal (Day 9)
 * 2. "Skip for Testing" → Manual activation (dev testing)
 */
export const CheckoutPage = () => {
  const { subscriptionId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [subscription, setSubscription] = useState(null);
  const [content, setContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState(null);

  /**
   * Load subscription details
   */
  const loadSubscriptionDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch from backend (we'd need an endpoint for this)
      // For now, we'll reconstruct from local state
      // This is a limitation we should address

      // Fetch subscriptions to find this one
      const response = await apiCall('/subscriptions', 'GET');
      
      const sub = response.subscriptions?.find(s => s.id === parseInt(subscriptionId));

      if (!sub) {
        setError('Subscription not found');
        setIsLoading(false);
        return;
      }

      setSubscription(sub);
      setContent({
        id: sub.content_id,
        title: sub.title,
        price: sub.price,
        creator: sub.creator_name
      });

    } catch (err) {
      console.error('Failed to load subscription:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle skip for testing
   * Manually activates subscription (dev only)
   */
  const handleSkipForTesting = async () => {
    try {
      setProcessError(null);
      setIsProcessing(true);

      // Call dev-only endpoint
      const response = await apiCall(
        `/subscriptions/${subscriptionId}/activate-testing`,
        'POST'
      );

      // Success
      console.log('Subscription activated:', response.subscription);

      // Show success message
      alert('✓ Subscription activated! (Testing mode)');

      // Redirect to content
      navigate(`/content/${subscription.content_id}`);

    } catch (err) {
      console.error('Failed to activate:', err);
      setProcessError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle real payment
   * Day 9: Opens Razorpay modal
   */
  const handleCompletePayment = async () => {
    alert('TODO :Razorpay payment modal will open here');
    // Implementation
  };

  /**
   * Load on mount
   */
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    loadSubscriptionDetails();
  }, [subscriptionId, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <LoadingSpinner message="Loading subscription details..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-red-800 mb-4">Error</h2>
            <p className="text-red-700 mb-6">{error}</p>
            <button
              onClick={() => navigate('/browse')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Back to Browse
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!subscription || !content) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <p className="text-gray-600">Subscription not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
      {/* Header */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/browse')}
          className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 mb-8"
        >
          ← Back to Browse
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Complete Your Subscription
            </h1>
            <p className="text-gray-600">
              You're almost there! One more step to unlock full access.
            </p>
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>

            {/* Content Details */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {content.title}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    By {content.creator}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-600">
                    {formatCurrency(content.price)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">One-time payment</p>
                </div>
              </div>
            </div>

            {/* What You Get */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">What you get:</h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-gray-700">
                  <span className="text-green-600">✓</span>
                  Lifetime access to {content.title}
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <span className="text-green-600">✓</span>
                  Never expires
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <span className="text-green-600">✓</span>
                  Download and offline access
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <span className="text-green-600">✓</span>
                  Full HD quality
                </li>
              </ul>
            </div>
          </div>

          {/* Errors */}
          {processError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 font-medium">{processError}</p>
            </div>
          )}

          {/* Payment Options */}
          <div className="space-y-4">
            {/* Production Payment Button */}
            <button
              onClick={handleCompletePayment}
              disabled={isProcessing}
              className="w-full py-3 bg-blue-600 text-white font-bold text-lg rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : '💳 Complete Payment'}
            </button>

            {/* Dev Testing Button */}
            {process.env.NODE_ENV === 'development' || import.meta.env.DEV ? (
              <button
                onClick={handleSkipForTesting}
                disabled={isProcessing}
                className="w-full py-3 border-2 border-amber-400 text-amber-700 font-bold rounded-lg hover:bg-amber-50 transition disabled:bg-gray-100 disabled:border-gray-300 disabled:text-gray-400"
              >
                {isProcessing ? 'Activating...' : '🔄 Skip for Testing (Dev Only)'}
              </button>
            ) : null}

            {/* Back Button */}
            <button
              onClick={() => navigate('/content/' + content.id)}
              disabled={isProcessing}
              className="w-full py-3 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition disabled:text-gray-400"
            >
              Continue Without Payment
            </button>
          </div>

          {/* Trust Elements */}
          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
            <p className="mb-2">🔒 Powered by Razorpay (Day 9)</p>
            <p className="mb-2">Your payment information is secure and encrypted</p>
            <p>Questions? Contact support@creatordashboard.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};