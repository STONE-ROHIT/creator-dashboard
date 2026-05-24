import { apiCall } from './api.js';

/**
 * Check if user has access to content
 */
export const checkContentAccess = async (contentId) => {
  try {
    if (!contentId) {
      throw new Error('contentId is required');
    }

    const response = await apiCall(`/subscriptions/check/${contentId}`);
    
    return {
      hasAccess: response.hasAccess,
      isFree: response.isFree,
      subscription: response.subscription,
      error: null
    };
  } catch (err) {
    console.error('checkContentAccess error:', err.message);
    
    return {
      hasAccess: false,
      isFree: false,
      subscription: null,
      error: err.message
    };
  }
};

/**
 * Subscribe user to content
 * Creates pending subscription
 */
export const subscribeToContent = async (contentId) => {
  try {
    if (!contentId) {
      throw new Error('contentId is required');
    }

    const response = await apiCall('/subscriptions', 'POST', {
      contentId
    });

    return {
      success: true,
      subscription: response.subscription,
      error: null
    };
  } catch (err) {
    console.error('subscribeToContent error:', err.message);
    
    return {
      success: false,
      subscription: null,
      error: err.message
    };
  }
};

/**
 * Get user's subscriptions
 * Returns all status: active, pending, cancelled
 */
export const getUserSubscriptions = async () => {
  try {
    const response = await apiCall('/subscriptions', 'GET');
    
    return {
      subscriptions: response.subscriptions || [],
      summary: response.summary || {},
      error: null
    };
  } catch (err) {
    console.error('getUserSubscriptions error:', err.message);
    
    return {
      subscriptions: [],
      summary: {},
      error: err.message
    };
  }
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (subscriptionId) => {
  try {
    if (!subscriptionId) {
      throw new Error('subscriptionId is required');
    }

    const response = await apiCall(
      `/subscriptions/${subscriptionId}`,
      'DELETE'
    );

    return {
      success: true,
      subscription: response.subscription,
      error: null
    };
  } catch (err) {
    console.error('cancelSubscription error:', err.message);
    
    return {
      success: false,
      subscription: null,
      error: err.message
    };
  }
};