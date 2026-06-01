import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, formatCurrency, formatDate } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageLoader, EmptyState } from '../components/ui.jsx';

export default function MySubscriptionsPage() {
  const { token } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => { loadSubscriptions(); }, []);

  async function loadSubscriptions() {
    setLoading(true);
    try {
      const res = await api.getSubscriptions(token);
      setData(res);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(subId) {
    if (!confirm('Cancel this subscription? You will lose access to the content.')) return;
    setCancelling(subId);
    try {
      await api.cancelSubscription(subId, token);
      toast.success('Subscription cancelled.');
      await loadSubscriptions();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancelling(null);
    }
  }

  if (loading) return <PageLoader />;

  const subscriptions = data?.subscriptions || [];
  const summary = data?.summary || {};

  const tabs = [
    { key: 'active',    label: 'Active',    count: summary.active    || 0 },
    { key: 'pending',   label: 'Pending',   count: summary.pending   || 0 },
    { key: 'cancelled', label: 'Cancelled', count: summary.cancelled || 0 },
  ];

  const filtered = subscriptions.filter(s => s.status === activeTab);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl tracking-tight mb-1">My Library</h1>
        <p className="text-ink-muted text-sm">Your subscriptions and content access</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {tabs.map(t => (
          <div key={t.key} className="stat-card">
            <p className="text-[11px] font-medium uppercase tracking-widest text-ink-dim mb-2">
              {t.label}
            </p>
            <p className={`font-display font-bold text-2xl ${
              t.key === 'active' ? 'text-green-400' :
              t.key === 'pending' ? 'text-brand' : 'text-ink-dim'
            }`}>
              {t.count}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.07] mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t.key
                ? 'border-brand text-brand'
                : 'border-transparent text-ink-muted hover:text-ink-primary'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                activeTab === t.key ? 'bg-brand/10 text-brand' : 'bg-white/5 text-ink-dim'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Subscription list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={activeTab === 'active' ? '📚' : activeTab === 'pending' ? '⏳' : '🗂️'}
          title={
            activeTab === 'active' ? 'No active subscriptions' :
            activeTab === 'pending' ? 'No pending payments' :
            'No cancelled subscriptions'
          }
          description={
            activeTab === 'active' ? 'Subscribe to content to get lifetime access.' : undefined
          }
          action={
            activeTab === 'active'
              ? <Link to="/browse" className="btn-primary">Browse content</Link>
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(sub => (
            <SubscriptionRow
              key={sub.id}
              sub={sub}
              onCancel={handleCancel}
              cancelling={cancelling === sub.id}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SubscriptionRow({ sub, onCancel, cancelling, navigate }) {
  const price = parseFloat(sub.paid_amount || sub.price || 0);

  return (
    <div className="card p-5 flex items-center gap-4">
      {/* Thumb placeholder */}
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1e1e30] to-[#2a2a42] flex items-center justify-center text-xl shrink-0">
        ▶
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-ink-primary text-[15px] truncate mb-0.5">
          {sub.content_title || `Content #${sub.content_id}`}
        </p>
        <div className="flex items-center gap-3 text-xs text-ink-muted">
          <StatusBadge status={sub.status} />
          <span>·</span>
          <span>Subscribed {formatDate(sub.created_at)}</span>
          {sub.paid_amount && (
            <>
              <span>·</span>
              <span className="text-brand">{formatCurrency(price)}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {sub.status === 'active' && (
          <>
            <button
              onClick={() => navigate(`/content/${sub.content_id}`)}
              className="btn-outline btn-sm"
            >
              View →
            </button>
            <button
              onClick={() => onCancel(sub.id)}
              disabled={cancelling}
              className="btn-danger btn-sm"
            >
              Cancel
            </button>
          </>
        )}

        {sub.status === 'pending' && (
          <>
            <button
              onClick={() => navigate(`/checkout/${sub.id}`)}
              className="btn-primary btn-sm"
            >
              Complete payment
            </button>
            <button
              onClick={() => onCancel(sub.id)}
              disabled={cancelling}
              className="btn-ghost btn-sm text-ink-dim"
            >
              Cancel
            </button>
          </>
        )}

        {sub.status === 'cancelled' && (
          <button
            onClick={() => navigate(`/content/${sub.content_id}`)}
            className="btn-ghost btn-sm text-ink-dim"
          >
            Re-subscribe
          </button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'active')    return <span className="badge-active">Active</span>;
  if (status === 'pending')   return <span className="badge-pending">Pending payment</span>;
  if (status === 'cancelled') return <span className="badge-cancelled">Cancelled</span>;
  return null;
}
