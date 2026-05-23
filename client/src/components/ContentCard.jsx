import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate, formatNumber } from '../utils/api';

/**
 * ContentCard Component
 * Displays content preview in a card format
 */
export const ContentCard = ({ content }) => {
  const {
    id,
    title,
    creator_name,
    price,
    is_free,
    views_count,
    created_at,
  } = content;

  return (
    <Link to={`/content/${id}`} className="block hover:shadow-lg transition">
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition cursor-pointer">
        <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
          <div className="text-white text-4xl">▶</div>
        </div>

        <div className="p-4">
          <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
            {title}
          </h3>

          <p className="text-sm text-gray-600 mb-3">By {creator_name}</p>

          <div className="flex items-center gap-2 mb-3">
            {is_free ? (
              <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                Free
              </span>
            ) : (
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                {formatCurrency(price)}
              </span>
            )}
          </div>

          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatNumber(views_count)} views</span>
            <span>{formatDate(created_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};