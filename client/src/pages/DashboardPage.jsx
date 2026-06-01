import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, formatCurrency, formatDate, formatNumber } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageLoader, LoadingSpinner, EmptyState } from '../components/ui.jsx';

export default function DashboardPage() {
  const { isCreator } = useAuth();
  return isCreator ? <CreatorDashboard /> : <SubscriberDashboard />;
}

// ── Subscriber view ────────────────────────────────────────────────────────
function SubscriberDashboard() {
  const { becomeCreator, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleBecomeCreator(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await becomeCreator(displayName);
      toast.success('You are now a creator!');
      // Component re-renders with creator dashboard after isCreator updates
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="font-display font-bold text-3xl tracking-tight mb-1">
          Welcome, {user?.username}
        </h1>
        <p className="text-ink-muted">You're currently a subscriber.</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
        <Link to="/browse" className="card p-6 hover:border-white/[0.14] transition-colors group block">
          <div className="text-2xl mb-3">🔍</div>
          <h3 className="font-display font-semibold text-ink-primary mb-1 group-hover:text-brand transition-colors">
            Browse content
          </h3>
          <p className="text-sm text-ink-muted">Discover courses and tutorials from creators.</p>
        </Link>

        <Link to="/subscriptions" className="card p-6 hover:border-white/[0.14] transition-colors group block">
          <div className="text-2xl mb-3">📚</div>
          <h3 className="font-display font-semibold text-ink-primary mb-1 group-hover:text-brand transition-colors">
            My library
          </h3>
          <p className="text-sm text-ink-muted">View and manage your content subscriptions.</p>
        </Link>
      </div>

      {/* Become creator CTA */}
      <div className="card p-7 border-brand/20 bg-brand/[0.03]">
        <div className="flex items-start gap-5">
          <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-2xl shrink-0">
            ✦
          </div>
          <div className="flex-1">
            <h2 className="font-display font-bold text-xl tracking-tight mb-1.5">
              Become a creator
            </h2>
            <p className="text-sm text-ink-muted mb-4 leading-relaxed">
              Share your knowledge. Upload courses, tutorials, and resources. Get paid for every subscriber.
            </p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              Start creating →
            </button>
          </div>
        </div>
      </div>

      {/* Become creator modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="w-full max-w-[420px] bg-bg-card border border-white/[0.1] rounded-2xl p-7 shadow-2xl">
            <h2 className="font-display font-bold text-xl tracking-tight mb-1">Choose your creator name</h2>
            <p className="text-sm text-ink-muted mb-6">This is how subscribers will see you.</p>

            {error && (
              <div className="mb-4 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleBecomeCreator}>
              <label className="block text-xs font-medium text-ink-muted mb-1.5 tracking-wide">
                Display name
              </label>
              <input
                type="text"
                className="input mb-5"
                placeholder="e.g. Alex the Developer"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
                minLength={3}
                autoFocus
              />
              <div className="flex gap-3">
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? <LoadingSpinner size="sm" /> : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setError(''); }}
                  className="btn-outline"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Creator view ───────────────────────────────────────────────────────────
function CreatorDashboard() {
  const { token, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('content');
  const [creator, setCreator] = useState(null);
  const [myContent, setMyContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [creatorData, contentData] = await Promise.all([
        api.getMyCreator(token),
        api.getMyContent(token),
      ]);
      setCreator(creatorData);
      setMyContent(contentData.content || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(contentId) {
    if (!confirm('Delete this content? This cannot be undone.')) return;
    setDeleting(contentId);
    try {
      await api.deleteContent(contentId, token);
      setMyContent(prev => prev.filter(c => c.id !== contentId));
      toast.success('Content deleted.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return <PageLoader />;

  const totalViews = myContent.reduce((sum, c) => sum + (parseInt(c.views_count) || 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight mb-1">
            {creator?.display_name || 'Creator Dashboard'}
          </h1>
          <p className="text-ink-muted text-sm">@{user?.username}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total earnings" value={formatCurrency(creator?.total_earnings || 0)} accent />
        <StatCard label="Content pieces" value={myContent.length} />
        <StatCard label="Published" value={myContent.filter(c => c.status === 'published').length} />
        <StatCard label="Total views" value={formatNumber(totalViews)} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.07] mb-7">
        {[
          { key: 'content', label: 'My Content' },
          { key: 'upload', label: '+ Upload' },
          { key: 'profile', label: 'Profile' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-brand text-brand'
                : 'border-transparent text-ink-muted hover:text-ink-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'content' && (
        <ContentTab
          content={myContent}
          onDelete={handleDelete}
          deleting={deleting}
          navigate={navigate}
        />
      )}
      {tab === 'upload' && (
        <UploadTab
          token={token}
          onSuccess={(newContent) => {
            setMyContent(prev => [newContent, ...prev]);
            setTab('content');
            toast.success('Content uploaded!');
          }}
        />
      )}
      {tab === 'profile' && (
        <ProfileTab
          creator={creator}
          token={token}
          onUpdate={(updated) => {
            setCreator(updated);
            toast.success('Profile updated!');
          }}
        />
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ label, value, accent }) {
  return (
    <div className="stat-card">
      <p className="text-[11px] font-medium uppercase tracking-widest text-ink-dim mb-2">{label}</p>
      <p className={`font-display font-bold text-2xl ${accent ? 'text-brand' : 'text-ink-primary'}`}>
        {value}
      </p>
    </div>
  );
}

function ContentTab({ content, onDelete, deleting, navigate }) {
  if (content.length === 0) {
    return (
      <EmptyState
        icon="📦"
        title="No content yet"
        description="Upload your first course or tutorial to start earning."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.07]">
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-dim px-4 py-3">Title</th>
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-dim px-4 py-3 hidden sm:table-cell">Price</th>
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-dim px-4 py-3 hidden md:table-cell">Views</th>
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-dim px-4 py-3 hidden lg:table-cell">Added</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {content.map(item => (
            <tr key={item.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-3.5">
                <div>
                  <p className="text-ink-primary font-medium leading-snug line-clamp-1">{item.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.is_free ? <span className="badge-free">Free</span> : <span className="badge-creator">Paid</span>}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3.5 text-ink-muted hidden sm:table-cell">
                {item.is_free ? '—' : formatCurrency(item.price)}
              </td>
              <td className="px-4 py-3.5 text-ink-muted hidden md:table-cell">
                {formatNumber(item.views_count)}
              </td>
              <td className="px-4 py-3.5 text-ink-muted text-xs hidden lg:table-cell">
                {formatDate(item.created_at)}
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => navigate(`/content/${item.id}`)}
                    className="btn-ghost btn-sm text-xs"
                  >
                    View
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    disabled={deleting === item.id}
                    className="btn-danger btn-sm text-xs"
                  >
                    {deleting === item.id ? '…' : 'Delete'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UploadTab({ token, onSuccess }) {
  const [form, setForm] = useState({ title: '', description: '', fileUrl: '', price: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      setError('Price must be 0 or a positive number.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.uploadContent({ ...form, price }, token);
      onSuccess(data.content);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <div className="card p-6">
        <h2 className="font-display font-semibold text-lg mb-5">Upload new content</h2>

        {error && (
          <div className="mb-4 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5 tracking-wide">Title *</label>
            <input type="text" className="input" placeholder="e.g. React for Beginners" value={form.title} onChange={set('title')} required />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5 tracking-wide">Description</label>
            <textarea className="input" rows={3} placeholder="What will subscribers learn?" value={form.description} onChange={set('description')} />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5 tracking-wide">Content URL</label>
            <input type="url" className="input" placeholder="https://..." value={form.fileUrl} onChange={set('fileUrl')} />
            <p className="text-[11px] text-ink-dim mt-1">Link to your video, PDF, or course resource.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5 tracking-wide">Price (₹)</label>
            <input type="number" className="input" placeholder="0 for free content" value={form.price} onChange={set('price')} min="0" step="1" required />
            <p className="text-[11px] text-ink-dim mt-1">Set to 0 to make this content free.</p>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <LoadingSpinner size="sm" /> : 'Upload content'}
            </button>
            <button type="button" onClick={() => setForm({ title: '', description: '', fileUrl: '', price: '' })} className="btn-ghost">
              Clear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProfileTab({ creator, token, onUpdate }) {
  const [form, setForm] = useState({
    displayName: creator?.display_name || '',
    bio: creator?.bio || '',
    bankAccount: creator?.bank_account || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.updateCreator(creator.id, {
        displayName: form.displayName,
        bio: form.bio,
        bankAccount: form.bankAccount,
      }, token);
      onUpdate(data.creator);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const initials = (creator?.display_name || 'C').substring(0, 2).toUpperCase();

  return (
    <div className="max-w-xl">
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/[0.07]">
          <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center font-display font-bold text-xl text-brand shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-display font-semibold text-ink-primary">{creator?.display_name}</p>
            <p className="text-sm text-ink-muted">Creator since {formatDate(creator?.created_at)}</p>
          </div>
        </div>

        {/* Earnings highlight */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-brand/[0.06] border border-brand/20 mb-6">
          <span className="text-2xl">💰</span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">Total earnings</p>
            <p className="font-display font-bold text-2xl text-brand">
              {formatCurrency(creator?.total_earnings || 0)}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5 tracking-wide">Display name *</label>
            <input type="text" className="input" value={form.displayName} onChange={set('displayName')} required minLength={3} />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5 tracking-wide">Bio</label>
            <textarea className="input" rows={3} placeholder="Tell subscribers about yourself…" value={form.bio} onChange={set('bio')} />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5 tracking-wide">Bank account (for payouts)</label>
            <input type="text" className="input" placeholder="Account details for withdrawals" value={form.bankAccount} onChange={set('bankAccount')} />
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <LoadingSpinner size="sm" /> : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
