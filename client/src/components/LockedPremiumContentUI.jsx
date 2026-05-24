import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, formatNumber } from '../utils/api';
import { subscribeToContent } from '../utils/subscriptionService';
import { Toast } from './Toast';

export const LockedPremiumContentUI = ({ content, error, onBackClick }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState(null);
  const [toast, setToast] = useState(null);

  if (!content || !content.id) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-red-800 mb-4">
              Unable to Load Content
            </h2>
            <p className="text-red-700 mb-6">
              {error || 'Content information unavailable'}
            </p>
            <button
              onClick={onBackClick}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Back to Browse
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubscribe = async () => {
    setSubscribeError(null);
    setIsSubscribing(true);

    const result = await subscribeToContent(content.id);

    if (result.success) {
      // Show toast confirmation
      setToast({
        type: 'success',
        message: '✓ Subscription created! Redirecting to checkout...',
        duration: 2000
      });

      // Redirect after delay
      setTimeout(() => {
        navigate(`/checkout/${result.subscription.id}`);
      }, 1500);
    } else {
      setSubscribeError(result.error);
      setToast({
        type: 'error',
        message: `✗ ${result.error}`,
        duration: 4000
      });
    }

    setIsSubscribing(false);
  };

  return (
    <>
      {/* Toast Notification */}
      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}

      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
        {/* Back Button */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={onBackClick}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
          >
            ← Back to Browse
          </button>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Left: Content Preview */}
            <div className="md:col-span-2">
              {/* Premium Badge */}
              <div className="inline-block mb-6">
                <span className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-full">
                  💎 PREMIUM CONTENT
                </span>
              </div>

              {/* Title */}
              <h1 className="text-5xl font-bold text-gray-900 mb-4 leading-tight">
                {content.title}
              </h1>

              {/* Creator Info */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">👤</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">By Creator</p>
                  <p className="font-semibold text-gray-900">
                    Creator #{content.creator_id}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="bg-white rounded-lg shadow-md p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  What You'll Learn
                </h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  {content.description}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                  <p className="text-2xl font-bold text-blue-600 mb-2">
                    {formatNumber(content.views_count)}
                  </p>
                  <p className="text-sm text-gray-600">People Viewed</p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                  <p className="text-lg text-gray-600 mb-2">Published</p>
                  <p className="font-semibold text-gray-900">
                    {formatDate(content.created_at)}
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                  <p className="text-lg text-gray-600 mb-2">Access</p>
                  <p className="font-semibold text-gray-900">Lifetime</p>
                </div>
              </div>
            </div>

            {/* Right: Subscribe CTA */}
            <div>
              {/* Price Card */}
              <div className="bg-white rounded-lg shadow-lg p-8 sticky top-8">
                {/* Price */}
                <div className="mb-8 text-center">
                  <p className="text-gray-600 text-sm mb-2">Unlock for</p>
                  <p className="text-5xl font-bold text-blue-600">
                    {formatCurrency(content.price)}
                  </p>
                  <p className="text-gray-600 text-sm mt-2">One-time payment</p>
                </div>

                {/* Benefits */}
                <div className="mb-8 pb-8 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">You get:</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="text-green-600 text-xl mt-1">✓</span>
                      <span className="text-gray-700">Full lifetime access</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-600 text-xl mt-1">✓</span>
                      <span className="text-gray-700">Never expires</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-600 text-xl mt-1">✓</span>
                      <span className="text-gray-700">Download access</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-600 text-xl mt-1">✓</span>
                      <span className="text-gray-700">No ads or interruptions</span>
                    </li>
                  </ul>
                </div>

                {/* Errors */}
                {subscribeError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm font-medium">{subscribeError}</p>
                  </div>
                )}

                {error && !subscribeError && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-700 text-sm">{error}</p>
                  </div>
                )}

                {/* CTA Button */}
                {!isAuthenticated ? (
                  <>
                    <button
                      onClick={() => navigate('/login')}
                      className="w-full py-3 bg-blue-600 text-white font-bold text-lg rounded-lg hover:bg-blue-700 transition mb-3"
                    >
                      Login to Subscribe
                    </button>
                    <p className="text-center text-sm text-gray-600 mb-3">
                      Don't have an account?{' '}
                      <button
                        onClick={() => navigate('/register')}
                        className="text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        Sign up free
                      </button>
                    </p>
                  </>
                ) : (
                  <button
                    onClick={handleSubscribe}
                    disabled={isSubscribing}
                    className="w-full py-3 bg-blue-600 text-white font-bold text-lg rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isSubscribing ? 'Creating subscription...' : 'Subscribe Now'}
                  </button>
                )}

                {/* Secondary CTA */}
                <button
                  onClick={onBackClick}
                  className="w-full mt-3 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-gray-400 transition"
                >
                  Continue Browsing
                </button>

                {/* Trust Elements */}
                <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
                  <p className="mb-2">🔒 Secure payment by Razorpay</p>
                  <p>💰 Instant access after payment</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};