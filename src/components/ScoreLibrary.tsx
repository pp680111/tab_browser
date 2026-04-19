import { useMemo } from 'react';
import { getFileExtension } from '../lib/fileTypes';
import type { ScoreLibraryEntry } from '../lib/scoreStorage';

export type ScoreShelfFilter = 'all' | 'gp' | 'musicxml' | 'recent';

type Props = {
  entries: ScoreLibraryEntry[];
  activeEntryId: string | null;
  loadingEntryId: string | null;
  searchQuery: string;
  activeFilter: ScoreShelfFilter;
  onSearchQueryChange: (value: string) => void;
  onFilterChange: (filter: ScoreShelfFilter) => void;
  onOpenEntry: (entry: ScoreLibraryEntry) => void;
};

const FILTER_LABELS: Array<{ filter: ScoreShelfFilter; label: string }> = [
  { filter: 'all', label: 'All' },
  { filter: 'gp', label: 'Guitar Pro' },
  { filter: 'musicxml', label: 'MusicXML' },
  { filter: 'recent', label: 'Recent' },
];

function formatTimestamp(value: string) {
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatRelativeDate(value: string) {
  const diffDays = Math.floor((Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Opened today';
  if (diffDays === 1) return 'Opened yesterday';
  if (diffDays < 7) return `Opened ${diffDays} days ago`;
  return `Opened ${formatTimestamp(value)}`;
}

function getEntryKind(entry: ScoreLibraryEntry) {
  const ext = getFileExtension(entry.fileName);
  if (ext === 'xml' || ext === 'musicxml') return 'MusicXML';
  return 'Guitar Pro';
}

function isRecent(entry: ScoreLibraryEntry) {
  const ageDays = (Date.now() - new Date(entry.lastOpenedAt).getTime()) / (1000 * 60 * 60 * 24);
  return ageDays <= 30;
}

export function ScoreLibrary({
  entries,
  activeEntryId,
  loadingEntryId,
  searchQuery,
  activeFilter,
  onSearchQueryChange,
  onFilterChange,
  onOpenEntry,
}: Props) {
  const visibleEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return entries
      .filter((entry) => {
        if (!query) return true;
        const haystack = [entry.fileName, entry.title, entry.artist, entry.filePath]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
      .filter((entry) => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'recent') return isRecent(entry);
        const kind = getEntryKind(entry);
        return activeFilter === 'gp' ? kind === 'Guitar Pro' : kind === 'MusicXML';
      });
  }, [entries, activeFilter, searchQuery]);

  return (
    <section className="library-shell" aria-label="Score library">
      <div className="library-shell__hero">
        <div className="library-toolbar">
          <label className="search-field">
            <span className="search-field__icon" aria-hidden="true">
              Search
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Search scores, paths, or composers..."
              aria-label="Search scores"
            />
          </label>

          <div className="library-shell__filters" role="tablist" aria-label="Score filters">
            {FILTER_LABELS.map((item) => {
              const count =
                item.filter === 'all'
                  ? entries.length
                  : entries.filter((entry) => {
                      if (item.filter === 'recent') return isRecent(entry);
                      const kind = getEntryKind(entry);
                      return item.filter === 'gp' ? kind === 'Guitar Pro' : kind === 'MusicXML';
                    }).length;

              return (
                <button
                  key={item.filter}
                  type="button"
                  className={`chip${activeFilter === item.filter ? ' is-active' : ''}`}
                  onClick={() => onFilterChange(item.filter)}
                >
                  {item.label}
                  <span className="chip__count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {visibleEntries.length === 0 ? (
        <div className="library-empty card-surface">
          <p className="empty-state">No scores match the current search or filter.</p>
        </div>
      ) : (
        <div className="library-grid">
          {visibleEntries.map((entry) => {
            const isActive = entry.id === activeEntryId;
            const isLoading = entry.id === loadingEntryId;
            const kind = getEntryKind(entry);

            return (
              <button
                key={entry.id}
                type="button"
                className={`score-card${isActive ? ' is-active' : ''}`}
                onClick={() => onOpenEntry(entry)}
                disabled={isLoading}
                aria-label={`Open ${entry.fileName}`}
              >
                <div className="score-card__body">
                  <h3>{entry.fileName}</h3>
                  <p className="score-card__kind">{kind}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
