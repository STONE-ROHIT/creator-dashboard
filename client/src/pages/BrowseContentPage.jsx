import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ContentCard from '../components/ContentCard.jsx';
import { PageLoader, ErrorMessage } from '../components/ui.jsx';

export default function BrowseContentPage() {
  const { isAuthenticated } = useAuth();
  const [content, setContent] = useState([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const limit = 20;
  const totalPages = Math.ceil(totalCount / limit);

  useEffect(() => {
    loadContent(page);
  }, [page]);

  async function loadContent(p) {
    setLoading(true);
    setError('');
    try {
      const data = await api.browseContent(p);
      setContent(data.content || []);
      setTotalCount(data.content_count || data.content?.length || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-b from-brand/[0.06] to-transparent border-b border-white/[0.07]">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <h1 className="font-display font-bold text-4xl tracking-tight leading-tight mb-3">
            Discover <span className="text-brand">creator content</span>
          </h1>
          <p className="text-ink-muted text-base max-w-lg mb-6">
            Courses, tutorials, and knowledge from independent creators. Learn at your own pace.
          </p>
          {!isAuthenticated && (
            <div className="flex items-center gap-3">
              <Link to="/register" className="btn-primary">Get started free</Link>
              <Link to="/login" className="btn-outline">Sign in</Link>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        {loading ? (
          <PageLoader />
        ) : error ? (
          <ErrorMessage error={error} onRetry={() => loadContent(page)} />
        ) : content.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4 opacity-20">📦</p>
            <p className="font-display font-semibold text-ink-primary mb-1">No content yet</p>
            <p className="text-sm text-ink-muted">Check back soon — creators are uploading.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-semibold text-ink-primary">
                {content.length} {content.length === 1 ? 'course' : 'courses'} available
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {content.map(item => (
                <ContentCard key={item.id} content={item} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-outline btn-sm disabled:opacity-30"
                >
                  ← Prev
                </button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-all border ${
                        page === p
                          ? 'bg-brand/10 border-brand/30 text-brand'
                          : 'bg-transparent border-white/10 text-ink-muted hover:border-white/20 hover:text-ink-primary'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-outline btn-sm disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
