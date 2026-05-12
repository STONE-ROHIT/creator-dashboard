import { useState, useEffect } from 'react';

function App() {
  const [apiResponse, setApiResponse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/health')
      .then(res => res.json())
      .then(data => {
        setApiResponse(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
        <div className="flex items-center justify-center mb-6">
          <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">CD</span>
          </div>
          <h1 className="text-3xl font-bold ml-3 text-gray-900">Creator Dashboard</h1>
        </div>

        <div className="space-y-4">
          {loading && (
            <div className="text-center py-4">
              <div className="inline-block">
                <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
              </div>
              <p className="text-gray-600 mt-2">Checking backend connection...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-semibold">✗ Connection Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}

          {apiResponse && !loading && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-bold flex items-center">
                <span className="text-lg mr-2">✓</span>
                Connected to Backend!
              </p>
              <pre className="text-xs mt-3 bg-green-100 p-3 rounded overflow-auto text-green-900 font-mono">
                {JSON.stringify(apiResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Both backend and frontend are working correctly.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;