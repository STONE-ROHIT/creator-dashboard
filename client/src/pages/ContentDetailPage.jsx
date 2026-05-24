import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { NotFoundPage } from '../components/NotFoundPage';
import { LoginPromptUI } from '../components/LoginPromptUI';
import { LockedPremiumContentUI } from '../components/LockedPremiumContentUI';
import { AccessibleContentUI } from '../components/AccessibleContentUI';
import { ErrorPage } from '../components/ErrorPage';
import { checkContentAccess } from '../utils/subscriptionService';

/**
 * ContentDetailPage
 * 
 * COMPLETE REWRITE with proper state machine
 * No more "stuck loading" state
 * 
 * State machine: null (loading) → one of:
 * - 'accessible' (user can view)
 * - 'locked' (needs subscription)
 * - 'requires_auth' (needs login)
 * - 'not_found' (404)
 * - 'error' (server error)
 */
export const ContentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // ===== STATE =====
  const [content, setContent] = useState(null);
  const [accessState, setAccessState] = useState(null);  // null = loading
  const [error, setError] = useState(null);
  const [subscription, setSubscription] = useState(null);

  /**
   * Fetch content and determine access
   * 
   * CRITICAL:
   * - Always sets accessState to a final value (never leaves it null)
   * - Handles all HTTP status codes
   * - Extracts content from 403 response
   * - Never has unhandled states
   */
  const fetchContent = async () => {
    try {
      // Start loading
      setAccessState(null);
      setError(null);
      setContent(null);

      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/content/${id}`,
        { headers }
      );

      // Try to parse response
      let data = null;
      try {
        data = await response.json();
      } catch (e) {
        // Response is not JSON
        console.error('Non-JSON response:', e);
        setError('Invalid server response');
        setAccessState('error');
        return;
      }

      // ===== HANDLE BY STATUS CODE =====

      if (response.ok) {
        // 200: Content accessible
        console.log('[ContentDetailPage] 200 Accessible:', data);
        setContent(data);
        setAccessState('accessible');
        return;
      }

      if (response.status === 403) {
        // 403: Locked premium content
        console.log('[ContentDetailPage] 403 Locked:', data);
        
        // Extract content from response
        // Backend returns: { error, locked: true, content: {...} }
        const contentData = data.content || data;
        
        if (!contentData || !contentData.id) {
          // Malformed response
          console.error('403 response missing content:', data);
          setError('Unable to load content');
          setAccessState('error');
          return;
        }

        setContent(contentData);
        setAccessState('locked');
        return;
      }

      if (response.status === 401) {
        // 401: Not authenticated
        console.log('[ContentDetailPage] 401 Unauthorized');
        setAccessState('requires_auth');
        return;
      }

      if (response.status === 404) {
        // 404: Not found
        console.log('[ContentDetailPage] 404 Not Found');
        setAccessState('not_found');
        return;
      }

      // Other status codes
      console.error('[ContentDetailPage] Unhandled status:', response.status, data);
      setError(data.error || `Server error (${response.status})`);
      setAccessState('error');

    } catch (err) {
      // Network error, JSON parse error, etc.
      console.error('[ContentDetailPage] Fetch error:', err);
      setError(err.message || 'Network error');
      setAccessState('error');
    }
  };

  /**
   * Check subscription status for accessible content
   */
  const checkSubscription = async () => {
    // Only check if:
    // - User is authenticated
    // - Content is accessible (not locked)
    if (!isAuthenticated || accessState !== 'accessible') {
      return;
    }

    try {
      const result = await checkContentAccess(id);
      if (!result.error && result.subscription) {
        setSubscription(result.subscription);
      }
    } catch (err) {
      console.error('Subscription check error:', err);
      // Don't block on this
    }
  };

  /**
   * Record view for accessible content
   */
  const recordView = async () => {
    // Only record if content is accessible
    if (accessState !== 'accessible') {
      return;
    }

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/content/${id}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    } catch (err) {
      console.error('View recording error:', err);
      // Don't block on this
    }
  };

  /**
   * Load content on mount
   */
  useEffect(() => {
    if (!id) {
      setAccessState('error');
      setError('No content ID provided');
      return;
    }

    fetchContent();
  }, [id]);

  /**
   * Check subscription after content loads
   */
  useEffect(() => {
    checkSubscription();
  }, [accessState, isAuthenticated]);

  /**
   * Record view after content loads
   */
  useEffect(() => {
    recordView();
  }, [accessState]);

  // ===== RENDER BASED ON STATE MACHINE =====

  // Loading state
  if (accessState === null) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <LoadingSpinner message="Loading content..." />
        </div>
      </div>
    );
  }

  // Render by state
  switch (accessState) {
    case 'accessible':
      return (
        <AccessibleContentUI
          content={content}
          subscription={subscription}
          user={user}
          onBackClick={() => navigate('/browse')}
        />
      );

    case 'locked':
      return (
        <LockedPremiumContentUI
          content={content}
          error={error}
          onBackClick={() => navigate('/browse')}
        />
      );

    case 'requires_auth':
      return <LoginPromptUI onBackClick={() => navigate('/browse')} />;

    case 'not_found':
      return <NotFoundPage onBackClick={() => navigate('/browse')} />;

    case 'error':
      return (
        <ErrorPage
          error={error}
          onRetry={fetchContent}
          onBackClick={() => navigate('/browse')}
        />
      );

    default:
      // Should never reach here
      return (
        <ErrorPage
          error={`Unknown state: ${accessState}`}
          onRetry={fetchContent}
          onBackClick={() => navigate('/browse')}
        />
      );
  }
};