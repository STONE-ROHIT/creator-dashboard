import React, { useState, useEffect } from 'react';
import { ContentGrid } from '../components/ContentGrid';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { publicApiCall } from '../utils/api';

/**
 * BrowseContentPage
 * Shows all published content in a grid
 * Public page (no auth required to view)
 */
export const BrowseContentPage = () => {
  const [content, setContent] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchContent = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await publicApiCall('/content/browse');
      setContent(response.content || []);
    } catch (err) {
      console.error('Failed to fetch content:', err.message);
      setError(err.message || 'Failed to load content');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Discover Content
          </h1>
          <p className="text-xl text-gray-600">
            Browse all available courses and resources
          </p>
        </div>

        {isLoading ? (
          <LoadingSpinner message="Loading content..." />
        ) : error ? (
          <ErrorMessage error={error} onRetry={fetchContent} />
        ) : (
          <ContentGrid content={content} />
        )}
      </div>
    </div>
  );
};