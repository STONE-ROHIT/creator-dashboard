import React from 'react';
import { formatCurrency, formatDate, formatNumber } from '../utils/api';
import { LoadingSpinner } from './LoadingSpinner';

/**
 * AccessibleContentUI
 * 
 * Shows content that user has access to:
 * - Free content
 * - Creator's own content
 * - Subscribed content
 */
export const AccessibleContentUI = ({
  content,
  subscription,
  user,
  isCheckingAccess,
  onBackClick,
}) => {
  const isCreator = content && user && content.creator_id === user.id;
  const hasSubscription = subscription && subscription.status === 'active';

  return (
    <div className="min-h-screen bg-gray-50">
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
        {/* Access Badge */}
        {isCheckingAccess ? (
          <div className="mb-6">
            <LoadingSpinner message="Verifying access..." />
          </div>
        ) : isCreator ? (
          <div className="inline-block mb-6 px-4 py-2 bg-purple-100 text-purple-800 font-semibold rounded-full">
            ✨ You're the Creator
          </div>
        ) : content.is_free ? (
          <div className="inline-block mb-6 px-4 py-2 bg-green-100 text-green-800 font-semibold rounded-full">
            ✓ Free Content
          </div>
        ) : hasSubscription ? (
          <div className="inline-block mb-6 px-4 py-2 bg-green-100 text-green-800 font-semibold rounded-full">
            ✓ You Have Access
          </div>
        ) : null}

        {/* Title */}
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
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
            Description
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            {content.description}
          </p>
        </div>

        {/* Content Area (Placeholder) */}
        <div className="bg-gradient-to-b from-gray-200 to-gray-300 rounded-lg p-12 mb-8 text-center">
          <p className="text-gray-700 text-xl">
            📺 Content would be displayed here
          </p>
          <p className="text-gray-600 mt-2 text-sm">
            (File URL: {content.file_url})
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-2xl font-bold text-blue-600 mb-2">
              {formatNumber(content.views_count)}
            </p>
            <p className="text-sm text-gray-600">Views</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-lg text-gray-600 mb-2">Price</p>
            <p className="font-semibold text-gray-900">
              {content.is_free ? 'Free' : formatCurrency(content.price)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-lg text-gray-600 mb-2">Published</p>
            <p className="font-semibold text-gray-900">
              {formatDate(content.created_at)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};