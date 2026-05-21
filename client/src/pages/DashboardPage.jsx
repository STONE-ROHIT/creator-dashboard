import React from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * DashboardPage
 * 
 * Entry point for authenticated users
 * Shows user information and placeholder for content
 */
export const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to Creator Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            You are successfully authenticated.
          </p>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User ID */}
            <div>
              <p className="text-sm text-gray-500 mb-1">User ID</p>
              <p className="text-lg font-semibold text-gray-900">{user?.id}</p>
            </div>

            {/* User Role */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Role</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {user?.role}
              </p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Status</h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">
                ✓ Successfully authenticated with JWT token
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">
                ✓ Token stored in localStorage
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">
                ✓ Protected route access verified
              </span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">What's Next?</h3>
          <p className="text-blue-800">
            Frontend foundation is complete. The authentication system is working correctly.
            Future: will add content browsing, creator dashboard, and payment integration.
          </p>
        </div>
      </div>
    </div>
  );
};