import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { isAuthenticated, isCreator, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate('/browse');
  };

  return (
    <nav className="sticky top-0 z-50 bg-bg-primary/90 backdrop-blur-xl border-b border-white/[0.07]">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-8">
        {/* Logo */}
        <Link to="/browse" className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-brand" />
          <span className="font-display font-bold text-[15px] tracking-tight text-ink-primary">
            CreatorHub
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <Link
            to="/browse"
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              isActive('/browse') || isActive('/content')
                ? 'text-ink-primary bg-white/[0.06]'
                : 'text-ink-muted hover:text-ink-primary hover:bg-white/[0.04]'
            }`}
          >
            Browse
          </Link>

          {isAuthenticated && (
            <>
              <Link
                to="/dashboard"
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isActive('/dashboard')
                    ? 'text-ink-primary bg-white/[0.06]'
                    : 'text-ink-muted hover:text-ink-primary hover:bg-white/[0.04]'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/subscriptions"
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isActive('/subscriptions')
                    ? 'text-ink-primary bg-white/[0.06]'
                    : 'text-ink-muted hover:text-ink-primary hover:bg-white/[0.04]'
                }`}
              >
                My Library
              </Link>
            </>
          )}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {/* Role badge */}
              <span className={isCreator ? 'badge-creator' : 'badge-free'}>
                {isCreator ? 'Creator' : 'Subscriber'}
              </span>

              <span className="text-sm text-ink-muted hidden sm:block">
                {user?.username}
              </span>

              <button
                onClick={handleLogout}
                className="btn-ghost btn-sm"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost btn-sm">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary btn-sm">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
