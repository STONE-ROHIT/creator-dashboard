import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { SubscriptionCard } from '../components/SubscriptionCard';
import { getUserSubscriptions } from '../utils/subscriptionService';

/**
 * MySubscriptionsPage
 * 
 * Shows all subscriptions:
 * - Active (you have access)
 * - Pending (payment processing)
 * - Cancelled (previously cancelled)
 */
export const MySubscriptionsPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSubscriptions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await getUserSubscriptions();

      if (result.error) {
        setError(result.error);
        setSubscriptions([]);
      } else {
        setSubscriptions(result.subscriptions || []);
        
        // Count by status
        const active = result.subscriptions?.filter(s => s.status === 'active') || [];
        const pending = result.subscriptions?.filter(s => s.status === 'pending') || [];
        
        setActiveCount(active.length);
        setPendingCount(pending.length);
      }
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
      setError(err.message || 'Failed to load subscriptions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleSubscriptionCancelled = (subscriptionId) => {
    setSubscriptions(
      subscriptions.filter((sub) => sub.id !== subscriptionId)
    );
    setActiveCount(Math.max(0, activeCount - 1));
  };

  // Separate subscriptions by status
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const pendingSubscriptions = subscriptions.filter(s => s.status === 'pending');
  const cancelledSubscriptions = subscriptions.filter(s => s.status === 'cancelled');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            My Subscriptions
          </h1>
          <p className="text-xl text-gray-600">
            Manage your active and pending subscriptions
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-3xl font-bold text-green-600 mb-2">
              {activeCount}
            </p>
            <p className="text-gray-600">Active</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-3xl font-bold text-yellow-600 mb-2">
              {pendingCount}
            </p>
            <p className="text-gray-600">Pending</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-3xl font-bold text-gray-600 mb-2">
              {cancelledSubscriptions.length}
            </p>
            <p className="text-gray-600">Cancelled</p>
          </div>
        </div>

        {/* Loading */}
        {isLoading ? (
          <LoadingSpinner message="Loading subscriptions..." />
        ) : error ? (
          <ErrorMessage error={error} onRetry={fetchSubscriptions} />
        ) : activeSubscriptions.length === 0 && pendingSubscriptions.length === 0 ? (
          // No subscriptions
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg mb-6">
              You don't have any active subscriptions yet
            </p>
            <Link
              to="/browse"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Browse Content
            </Link>
          </div>
        ) : (
          <div>
            {/* Active Subscriptions */}
            {activeSubscriptions.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Active Subscriptions
                </h2>

                <div className="space-y-4">
                  {activeSubscriptions.map((subscription) => (
                    <SubscriptionCard
                      key={subscription.id}
                      subscription={subscription}
                      onCancelled={handleSubscriptionCancelled}
                      status="active"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pending Subscriptions */}
            {pendingSubscriptions.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="text-yellow-600">⏳</span>
                  Payment Processing
                </h2>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                  <p className="text-yellow-800">
                    Your subscription is awaiting payment confirmation. Complete payment in the checkout page to activate access.
                  </p>
                </div>

                <div className="space-y-4">
                  {pendingSubscriptions.map((subscription) => (
                    <SubscriptionCard
                      key={subscription.id}
                      subscription={subscription}
                      onCancelled={handleSubscriptionCancelled}
                      status="pending"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Cancelled Subscriptions */}
            {cancelledSubscriptions.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="text-gray-600">✗</span>
                  Cancelled
                </h2>

                <div className="space-y-4">
                  {cancelledSubscriptions.map((subscription) => (
                    <SubscriptionCard
                      key={subscription.id}
                      subscription={subscription}
                      status="cancelled"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};