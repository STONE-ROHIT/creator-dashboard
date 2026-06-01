import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { LoadingSpinner } from '../components/ui.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '', username: '', password: '', passwordConfirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.passwordConfirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(form.email, form.username, form.password, form.passwordConfirm);
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">

        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-2xl tracking-tight mb-2">Create account</h1>
          <p className="text-sm text-ink-muted">Join CreatorHub as a subscriber or creator</p>
        </div>

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
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5 tracking-wide">
                Username
              </label>
              <input
                type="text"
                className="input"
                placeholder="yourname"
                value={form.username}
                onChange={set('username')}
                required
                minLength={3}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5 tracking-wide">
                Password
              </label>
              <input
                type="password"
                className="input"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={set('password')}
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5 tracking-wide">
                Confirm password
              </label>
              <input
                type="password"
                className="input"
                placeholder="Repeat password"
                value={form.passwordConfirm}
                onChange={set('passwordConfirm')}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-ink-muted mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-brand hover:text-brand-hover transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
