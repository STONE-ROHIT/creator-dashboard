import React from 'react';
import { ContentCard } from './ContentCard';

/**
 * ContentGrid Component
 * Responsive grid of content cards
 */
export const ContentGrid = ({ content }) => {
  if (!content || content.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">No content available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {content.map((item) => (
        <ContentCard key={item.id} content={item} />
      ))}
    </div>
  );
};