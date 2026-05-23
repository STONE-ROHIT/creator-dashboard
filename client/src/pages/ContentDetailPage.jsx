import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SubscribeButton } from '../components/SubscribeButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { apiCall, formatCurrency, formatDate, formatNumber } from '../utils/api';

/**
 * ContentDetailPage
 * Shows full details of a single content item
 * Separate GET (fetch) from POST (view recording)
 */
export const ContentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [content, setContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  /**
   * Fetch content data (no side effects)
   */
  const fetchContent = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setAccessDenied(false);

      const response = await apiCall(`/content/${id}`);
      setContent(response);
    } catch (err) {
      console.error('Failed to fetch content:', err.message);

      if (err.message.includes('Must subscribe')) {
        setAccessDenied(true);
        setError('You need a subscription to view this content');
      } else if (err.message.includes('Login required')) {
        setError('Login required to view paid content');
      } else if (err.message.includes('not found')) {
        setError('Content not found');
      } else if (err.message.includes('Unauthorized')) {
        setError('Login required');
      } else {
        setError(err.message || 'Failed to load content');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Record view (separate from fetch)
   */
  const recordView = async () => {
    try {
      await apiCall(`/content/${id}/view`, 'POST');
    } catch (err) {
      console.error('Failed to record view:', err.message);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchContent();
  }, [id]);

  useEffect(() => {
    if (!id || isLoading) return;

    const timer = setTimeout(() => {
      recordView();
    }, 100);

    return () => clearTimeout(timer);
  }, [id, isLoading]);

  const isCreator = content && user && content.creator_id === user.id;
  const hasSubscription = false;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <LoadingSpinner message="Loading content..." />
        </div>
      </div>
    );
  }

  if (error && !content) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-red-800 mb-4">
              {error}
            </h2>
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

  if (!content) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <p className="text-gray-600">No content</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate('/browse')}
          className="text-blue-600 hover:text-blue-700 mb-6 flex items-center gap-2"
        >
          ← Back to Browse
        </button>

        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {content.title}
          </h1>

          <p className="text-lg text-gray-600 mb-6 leading-relaxed">
            {content.description}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 py-6 border-y border-gray-200">
            <div>
              <p className="text-sm text-gray-500 mb-1">Creator</p>
              <p className="font-semibold text-gray-900">
                Creator #{content.creator_id}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Price</p>
              <p className="font-semibold text-gray-900">
                {content.is_free ? 'Free' : formatCurrency(content.price)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Views</p>
              <p className="font-semibold text-gray-900">
                {formatNumber(content.views_count)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Published</p>
              <p className="font-semibold text-gray-900">
                {formatDate(content.created_at)}
              </p>
            </div>
          </div>
        </div>

        <SubscribeButton
          contentId={content.id}
          price={content.price}
          isFree={content.is_free}
          isCreator={isCreator}
          hasSubscription={hasSubscription}
          isDenied={accessDenied}
          userError={error}
        />
      </div>
    </div>
  );
};