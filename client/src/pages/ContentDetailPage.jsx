import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, formatCurrency, formatDate, formatNumber } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageLoader, LoadingSpinner } from '../components/ui.jsx';

export default function ContentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, isAuthenticated, isCreator, user } = useAuth();
  const toast = useToast();

  // State machine
  const [viewState, setViewState] = useState('loading');
  const [content, setContent] = useState(null);       // Full content (accessible)
  const [lockedData, setLockedData] = useState(null);  // Metadata on 403
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    loadContent();
  }, [id, token]);

  async function loadContent() {
    setViewState('loading');
    try {
      const data = await api.getContent(id, token);
      setContent(data);
      setViewState('accessible');
      // Record view (fire-and-forget)
      api.recordView(id).catch(() => {});
    } catch (err) {
      if (err.status === 401) {
        setViewState('requires_auth');
      } else if (err.status === 403) {
        setViewState('locked');
        setLockedData(err.data?.content || null);
      } else if (err.status === 404) {
        setViewState('not_found');
      } else {
        setViewState('error');
      }
    }
  }

  async function handleSubscribe() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/content/${id}` } } });
      return;
    }
    setSubscribing(true);
    try {
      const result = await api.subscribe(id, token);
      toast.info('Subscription created — proceeding to checkout.');
      navigate(`/checkout/${result.subscription.id}`);
    } catch (err) {
      toast.error(err.message);
      setSubscribing(false);
    }
  }

  if (viewState === 'loading') return <PageLoader />;

  if (viewState === 'not_found') {
    return (
      <div className="max-w-6xl mx-auto px-6 py-20 text-center">
        <p className="text-5xl mb-4 opacity-20">🔍</p>
        <h2 className="font-display font-bold text-xl mb-2">Content not found</h2>
        <p className="text-sm text-ink-muted mb-6">This content may have been removed.</p>
        <Link to="/browse" className="btn-outline">Back to browse</Link>
      </div>
    );
  }

  if (viewState === 'error') {
    return (
      <div className="max-w-6xl mx-auto px-6 py-20 text-center">
        <p className="text-4xl mb-4 opacity-20">⚠️</p>
        <h2 className="font-display font-bold text-xl mb-2">Something went wrong</h2>
        <p className="text-sm text-ink-muted mb-6">Couldn't load this content.</p>
        <button onClick={loadContent} className="btn-primary">Try again</button>
      </div>
    );
  }

  // ── Requires auth ──────────────────────────────────────────────────────────
  if (viewState === 'requires_auth') {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12">
        <BackButton />
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center text-2xl mx-auto mb-5">🔒</div>
          <h2 className="font-display font-bold text-2xl tracking-tight mb-2">Sign in to view</h2>
          <p className="text-ink-muted text-sm mb-7">
            You need an account to access this content.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/login"
              state={{ from: { pathname: `/content/${id}` } }}
              className="btn-primary"
            >
              Sign in
            </Link>
            <Link to="/register" className="btn-outline">Create account</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Locked (authenticated, no subscription) ────────────────────────────────
  if (viewState === 'locked') {
    const previewContent = lockedData;
    const price = parseFloat(previewContent?.price || 0);

    return (
      <div className="max-w-6xl mx-auto px-6 py-12">
        <BackButton />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 items-start">
          {/* Left */}
          <div>
            <h1 className="font-display font-bold text-3xl lg:text-4xl tracking-tight leading-tight mb-4">
              {previewContent?.title || 'Premium Content'}
            </h1>
            <div className="flex items-center gap-3 text-sm text-ink-muted mb-6">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                Locked
              </span>
              {previewContent?.views_count !== undefined && (
                <span>{formatNumber(previewContent.views_count)} views</span>
              )}
            </div>

            {previewContent?.description && (
              <p className="text-ink-muted leading-relaxed mb-8 text-[15px]">
                {previewContent.description}
              </p>
            )}

            {/* What you get */}
            <div className="card p-5 space-y-3">
              <p className="font-display font-semibold text-sm text-ink-muted uppercase tracking-wide mb-1">
                What's included
              </p>
              {['Lifetime access', 'View on any device', 'Learn at your own pace', 'No subscription required'].map(item => (
                <div key={item} className="flex items-center gap-2.5 text-sm">
                  <span className="text-brand font-bold">✓</span>
                  <span className="text-ink-muted">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Sticky purchase card */}
          <div className="card p-6 lg:sticky lg:top-20">
            <div className="text-3xl font-display font-bold text-brand tracking-tight mb-1">
              {formatCurrency(price)}
            </div>
            <p className="text-xs text-ink-muted mb-5">One-time payment · Lifetime access</p>

            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              className="btn-primary w-full justify-center btn-lg mb-3"
            >
              {subscribing ? <LoadingSpinner size="sm" /> : `Get access for ${formatCurrency(price)}`}
            </button>

            <p className="text-xs text-ink-dim text-center">
              Secure payment via Razorpay
            </p>

            <hr className="border-white/[0.07] my-5" />
            <p className="text-xs font-medium text-ink-dim uppercase tracking-wide mb-3">
              About the creator
            </p>
            <p className="text-sm text-ink-muted">
              {previewContent?.creator_display_name || 'Creator'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Accessible ─────────────────────────────────────────────────────────────
  const isOwnContent = content.creator_id === user?.id;
  const price = parseFloat(content.price);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <BackButton />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10 items-start">
        {/* Main content */}
        <div>
          {/* Status badge */}
          <div className="flex items-center gap-2 mb-4">
            {content.is_free ? (
              <span className="badge-free">Free</span>
            ) : isOwnContent ? (
              <span className="badge-creator">Your content</span>
            ) : (
              <span className="badge-active">Subscribed ✓</span>
            )}
          </div>

          <h1 className="font-display font-bold text-3xl lg:text-4xl tracking-tight leading-tight mb-4">
            {content.title}
          </h1>

          <div className="flex items-center gap-4 text-sm text-ink-muted mb-6">
            <span>{formatNumber(content.views_count)} views</span>
            <span>·</span>
            <span>Added {formatDate(content.created_at)}</span>
          </div>

          {content.description && (
            <p className="text-ink-muted leading-relaxed text-[15px] mb-8">
              {content.description}
            </p>
          )}

          {/* Content placeholder */}
          <div className="card p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center text-3xl mx-auto mb-4">
              ▶
            </div>
            <h3 className="font-display font-semibold text-ink-primary mb-2">Content viewer</h3>
            <p className="text-sm text-ink-muted">
              {content.file_url
                ? <a href={content.file_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">Open content →</a>
                : 'The creator has not yet uploaded the content file.'}
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="card p-5 lg:sticky lg:top-20 space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-dim mb-2">Price</p>
            <p className="font-display font-bold text-xl text-ink-primary">
              {content.is_free ? 'Free' : formatCurrency(price)}
            </p>
          </div>
          <hr className="border-white/[0.07]" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-dim mb-2">Creator</p>
            <p className="text-sm font-medium text-ink-primary">{content.creator_display_name || 'Unknown creator'}</p>
            {content.creator_bio && (
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">{content.creator_bio}</p>
            )}
          </div>
          <hr className="border-white/[0.07]" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-dim mb-2">Stats</p>
            <p className="text-sm text-ink-muted">{formatNumber(content.views_count)} total views</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BackButton() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(-1)}
      className="flex items-center gap-1.5 text-ink-muted text-sm hover:text-ink-primary transition-colors mb-8"
    >
      ← Back
    </button>
  );
}
