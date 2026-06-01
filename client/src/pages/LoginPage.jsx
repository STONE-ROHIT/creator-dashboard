import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { LoadingSpinner } from '../components/ui.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/dashboard';

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-2xl tracking-tight mb-2">Welcome back</h1>
          <p className="text-sm text-ink-muted">Sign in to your CreatorHub account</p>
        </div>

        {/* Form card */}
        <div className="card p-7">
          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5 tracking-wide">
                Email address
              </label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={set('email')}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5 tracking-wide">
                Password
              </label>
              <input
                type="password"
                className="input"
                placeholder="Your password"
                value={form.password}
                onChange={set('password')}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-ink-muted mt-5">
            No account?{' '}
            <Link to="/register" className="text-brand hover:text-brand-hover transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
