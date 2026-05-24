import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate, formatCurrency } from '../utils/api';
import { cancelSubscription } from '../utils/subscriptionService';

/**
 * SubscriptionCard Component
 * 
 * Shows subscription details
 * Allows cancelling subscription
 */
export const SubscriptionCard = ({ subscription, onCancelled }) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState(null);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this subscription?')) {
      return;
    }

    setError(null);
    setIsCancelling(true);

    const result = await cancelSubscription(subscription.id);

    if (result.success) {
      // Notify parent to remove from list
      onCancelled(subscription.id);
    } else {
      setError(result.error);
    }

    setIsCancelling(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          {/* Content Link */}
          <Link
            to={`/content/${subscription.content_id}`}
            className="text-2xl font-bold text-blue-600 hover:text-blue-700"
          >
            {subscription.title}
          </Link>

          {/* Creator Name */}
          <p className="text-gray-600 mt-1">
            By {subscription.creator_name}
          </p>
        </div>

        {/* Price Badge */}
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(subscription.price)}
          </div>
          {subscription.is_free && (
            <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
              Free
            </span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 py-4 border-t border-b border-gray-200">
        <div>
          <p className="text-sm text-gray-500">Subscribed</p>
          <p className="font-semibold text-gray-900">
            {formatDate(subscription.created_at)}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Status</p>
          <p className="font-semibold text-green-600 capitalize">
            {subscription.status}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Type</p>
          <p className="font-semibold text-gray-900 capitalize">
            Lifetime
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          to={`/content/${subscription.content_id}`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          View Content
        </Link>

        <button
          onClick={handleCancel}
          disabled={isCancelling}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
        </button>
      </div>
    </div>
  );
};