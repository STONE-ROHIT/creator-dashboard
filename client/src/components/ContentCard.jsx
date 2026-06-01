import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatNumber } from '../utils/api.js';

export default function ContentCard({ content }) {
  const navigate = useNavigate();
  const price = parseFloat(content.price);

  return (
    <div
      onClick={() => navigate(`/content/${content.id}`)}
      className="card overflow-hidden cursor-pointer transition-all duration-200 hover:border-white/[0.14] hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/40 flex flex-col"
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gradient-to-br from-[#1e1e30] to-[#2a2a42] flex items-center justify-center relative overflow-hidden">
        <span className="text-4xl opacity-25 select-none">▶</span>

        {/* Price badge */}
        <div className="absolute top-3 right-3">
          {content.is_free ? (
            <span className="badge-free">Free</span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-bg-primary/80 text-brand border border-brand/30 font-display">
              {formatCurrency(price)}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-display font-semibold text-ink-primary text-[15px] leading-snug mb-1.5 line-clamp-2">
          {content.title}
        </h3>

        {content.description && (
          <p className="text-xs text-ink-muted leading-relaxed mb-3 line-clamp-2 flex-1">
            {content.description}
          </p>
        )}

        <div className="flex items-center justify-between text-[11px] text-ink-dim pt-3 border-t border-white/[0.07] mt-auto">
          <span className="flex items-center gap-1">
            <span className="opacity-60">👁</span>
            {formatNumber(content.views_count)} views
          </span>
          {content.creator_display_name && (
            <span className="text-ink-muted truncate max-w-[120px]">
              {content.creator_display_name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
