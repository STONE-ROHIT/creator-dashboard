import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, formatCurrency } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageLoader, LoadingSpinner } from '../components/ui.jsx';
import { loadRazorpay } from '../utils/razorpayLoader.js';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 12;

export default function CheckoutPage() {
  const { subscriptionId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const toast = useToast();

  const [pageState, setPageState] = useState('loading'); // loading | ready | paying | polling | success | error
  const [subscription, setSubscription] = useState(null);
  const [content, setContent] = useState(null);
  const [error, setError] = useState('');
  const [pollCount, setPollCount] = useState(0);
  const pollTimer = useRef(null);

  useEffect(() => {
    loadSubscriptionDetails();
    return () => clearTimeout(pollTimer.current);
  }, [subscriptionId]);

  async function loadSubscriptionDetails() {
    try {
      const data = await api.getSubscriptions(token);
      const sub = data.subscriptions?.find(s => s.id === parseInt(subscriptionId));
      if (!sub) {
        setError('Subscription not found');
        setPageState('error');
        return;
      }
      if (sub.status === 'active') {
        navigate(`/content/${sub.content_id}`, { replace: true });
        return;
      }
      if (sub.status === 'cancelled') {
        setError('This subscription has been cancelled.');
        setPageState('error');
        return;
      }
      setSubscription(sub);

      // Fetch content details for price display
      try {
        const contentData = await api.getContent(sub.content_id, token);
        setContent(contentData);
      } catch (err) {
        if (err.status === 403 && err.data?.content) {
          setContent(err.data.content);
        }
      }
      setPageState('ready');
    } catch (err) {
      setError(err.message);
      setPageState('error');
    }
  }

  async function handlePay() {
    setPageState('paying');
    setError('');

    try {
      // 1. Create Razorpay order from our backend
      const orderData = await api.createOrder(parseInt(subscriptionId), token);
      const { orderId, keyId, amount } = orderData.order;

      // 2. Load Razorpay SDK
      const Razorpay = await loadRazorpay();

      // 3. Open Razorpay checkout modal
      const options = {
        key: keyId,
        amount: Math.round(parseFloat(amount) * 100), // paise
        currency: 'INR',
        name: 'CreatorHub',
        description: content?.title || 'Content Access',
        order_id: orderId,
        prefill: {
          email: user?.email || '',
        },
        theme: { color: '#f59e0b' },
        handler: async () => {
          // Payment submitted — start polling for webhook confirmation
          toast.info('Payment received. Confirming access…');
          startPolling();
        },
        modal: {
          ondismiss: () => {
            setPageState('ready');
          },
        },
      };

      const rzp = new Razorpay(options);
      rzp.on('payment.failed', (response) => {
        toast.error(`Payment failed: ${response.error.description}`);
        setPageState('ready');
      });
      rzp.open();
    } catch (err) {
      setError(err.message);
      setPageState('ready');
    }
  }

  function startPolling() {
    setPageState('polling');
    setPollCount(0);
    poll(0);
  }

  async function poll(attempt) {
    if (attempt >= MAX_POLL_ATTEMPTS) {
      setError('Payment confirmation timed out. If you were charged, please contact support.');
      setPageState('ready');
      return;
    }

    try {
      const result = await api.verifyPayment(parseInt(subscriptionId), token);
      // 200 = active
      toast.success('Payment confirmed! You now have lifetime access.');
      setPageState('success');
      setTimeout(() => navigate(`/content/${subscription.content_id}`, { replace: true }), 2000);
    } catch (err) {
      if (err.status === 202) {
        // Still pending — keep polling
        setPollCount(attempt + 1);
        pollTimer.current = setTimeout(() => poll(attempt + 1), POLL_INTERVAL_MS);
      } else {
        setError(err.message);
        setPageState('ready');
      }
    }
  }

  async function handleSkipForTesting() {
    try {
      await fetch(`/api/subscriptions/${subscriptionId}/activate-testing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success('Subscription activated for testing!');
      navigate(`/content/${subscription?.content_id}`, { replace: true });
    } catch (err) {
      toast.error('Could not activate test subscription');
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────
  if (pageState === 'loading') return <PageLoader />;

  if (pageState === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 text-2xl mb-5">✓</div>
        <h2 className="font-display font-bold text-2xl mb-2">Access granted!</h2>
        <p className="text-ink-muted text-sm">Taking you to the content…</p>
      </div>
    );
  }

  if (pageState === 'error' && !subscription) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] text-center px-4">
        <p className="text-4xl mb-4 opacity-20">⚠️</p>
        <h2 className="font-display font-bold text-xl mb-2">Checkout unavailable</h2>
        <p className="text-sm text-ink-muted mb-6">{error}</p>
        <button onClick={() => navigate('/subscriptions')} className="btn-outline">
          My subscriptions
        </button>
      </div>
    );
  }

  const price = parseFloat(content?.price || 0);

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[480px]">
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-2xl tracking-tight mb-1.5">Complete checkout</h1>
          <p className="text-sm text-ink-muted">One-time payment · Lifetime access</p>
        </div>

        <div className="card p-7">
          {/* Content summary */}
          <div className="flex items-start gap-4 mb-6 pb-6 border-b border-white/[0.07]">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e1e30] to-[#2a2a42] flex items-center justify-center text-xl shrink-0">
              ▶
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-ink-primary text-[15px] leading-snug truncate">
                {content?.title || 'Loading…'}
              </p>
              <p className="text-xs text-ink-muted mt-1">
                {content?.creator_display_name || 'Creator content'}
              </p>
            </div>
          </div>

          {/* Amount */}
          <div className="flex items-center justify-between mb-6 p-4 rounded-xl bg-brand/[0.06] border border-brand/20">
            <span className="text-sm text-ink-muted">Total due today</span>
            <span className="font-display font-bold text-xl text-brand">
              {formatCurrency(price)}
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* CTA */}
          {pageState === 'polling' ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <LoadingSpinner size="md" />
              <p className="text-sm text-ink-muted">
                Confirming payment… ({pollCount}/{MAX_POLL_ATTEMPTS})
              </p>
            </div>
          ) : (
            <button
              onClick={handlePay}
              disabled={pageState === 'paying'}
              className="btn-primary w-full justify-center btn-lg mb-3"
            >
              {pageState === 'paying'
                ? <><LoadingSpinner size="sm" /> Opening Razorpay…</>
                : `Pay ${formatCurrency(price)} with Razorpay`
              }
            </button>
          )}

          <p className="text-xs text-ink-dim text-center mt-2">
            Powered by Razorpay · Your payment is secure
          </p>

          {/* Dev testing shortcut */}
          {import.meta.env.DEV && (
            <div className="mt-6 pt-5 border-t border-white/[0.07]">
              <p className="text-[10px] text-ink-dim text-center uppercase tracking-wider mb-3">Dev only</p>
              <button
                onClick={handleSkipForTesting}
                className="w-full text-center text-xs text-ink-dim hover:text-ink-muted transition-colors py-2 border border-white/[0.07] rounded-lg"
              >
                Skip payment (activate for testing)
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 mt-5">
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-ink-dim hover:text-ink-muted transition-colors"
          >
            ← Go back
          </button>
          <span className="text-ink-dim text-xs">·</span>
          <button
            onClick={() => navigate('/subscriptions')}
            className="text-xs text-ink-dim hover:text-ink-muted transition-colors"
          >
            My subscriptions
          </button>
        </div>
      </div>
    </div>
  );
}
