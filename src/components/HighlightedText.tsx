import React, { useMemo } from 'react';

interface HighlightedTextProps {
  text: string;
  query?: string;
  className?: string;
  highlightClassName?: string;
}

/**
 * Visually emphasizes portions of text that match the active search query.
 * Supports multi-word queries, case-insensitivity, and safe regex escaping.
 */
export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  query = '',
  className = '',
  highlightClassName = 'bg-[#E31B23]/25 text-[#FF6B6B] font-bold rounded px-0.5 border border-[#E31B23]/40 shadow-sm',
}) => {
  const elements = useMemo(() => {
    if (!text) return null;
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return text;
    }

    // Split query by whitespace to support multi-term searches
    const terms = trimmedQuery
      .split(/\s+/)
      .filter((term) => term.length > 0)
      .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    if (terms.length === 0) {
      return text;
    }

    try {
      const regex = new RegExp(`(${terms.join('|')})`, 'gi');
      const parts = text.split(regex);

      return parts.map((part, index) => {
        // If this part matches any of the query terms (case-insensitive)
        const isMatch = terms.some(
          (term) => part.toLowerCase() === term.toLowerCase().replace(/\\/g, '')
        );

        if (isMatch) {
          return (
            <mark key={index} className={highlightClassName}>
              {part}
            </mark>
          );
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      });
    } catch {
      return text;
    }
  }, [text, query, highlightClassName]);

  return <span className={className}>{elements}</span>;
};
