export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4 border', md: 'w-6 h-6 border-2', lg: 'w-10 h-10 border-2' };
  return (
    <span
      className={`inline-block rounded-full border-white/10 border-t-brand animate-spin ${sizes[size]} ${className}`}
    />
  );
}

export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-ink-muted">
      <LoadingSpinner size="lg" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function ErrorMessage({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 text-xl">!</div>
      <div>
        <p className="text-ink-primary font-medium mb-1">Something went wrong</p>
        <p className="text-sm text-ink-muted">{error}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-outline btn-sm">Try again</button>
      )}
    </div>
  );
}

export function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <span className="text-4xl opacity-30">{icon}</span>
      <div>
        <p className="font-display font-semibold text-ink-primary mb-1.5">{title}</p>
        {description && <p className="text-sm text-ink-muted max-w-xs">{description}</p>}
      </div>
      {action}
    </div>
  );
}
