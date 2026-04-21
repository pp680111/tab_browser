import { useEffect, useMemo, useRef, useState } from 'react';
import { AnnotationDrawer } from './components/AnnotationDrawer';
import { ScoreLibrary, type ScoreShelfFilter } from './components/ScoreLibrary';
import { ScoreViewer } from './components/ScoreViewer';
import { createAnnotationBundle, parseAnnotationBundle } from './lib/annotationTransfer';
import { hashBytes, hashFile } from './lib/fileHash';
import { isSupportedScoreFile } from './lib/fileTypes';
import {
  getScoreLibraryEntryId,
  loadCachedScoreBytes,
  loadScoreLibrary,
  saveCachedScoreBytes,
  saveScoreLibrary,
  updateScoreLibraryEntry,
  upsertScoreLibraryEntry,
  type ScoreLibraryEntry,
} from './lib/scoreStorage';
import { loadAnnotations, saveAnnotations } from './lib/storage';
import type { Annotation, ScoreDocument, TrackControlState, TrackSummary } from './types';

function createId() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

function isShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function createDefaultTrackControls(trackCount: number): TrackControlState[] {
  return Array.from({ length: trackCount }, () => ({
    muted: false,
    solo: false,
    volume: 1,
  }));
}

export default function App() {
  const scoreImportRef = useRef<HTMLInputElement | null>(null);
  const annotationImportRef = useRef<HTMLInputElement | null>(null);
  const [library, setLibrary] = useState<ScoreLibraryEntry[]>(() => loadScoreLibrary());
  const [screen, setScreen] = useState<'library' | 'reader'>('library');
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [loadingEntryId, setLoadingEntryId] = useState<string | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [score, setScore] = useState<ScoreDocument | null>(null);
  const [measureCount, setMeasureCount] = useState(0);
  const [trackSummaries, setTrackSummaries] = useState<TrackSummary[]>([]);
  const [selectedTrackIndexes, setSelectedTrackIndexes] = useState<number[]>([]);
  const [trackControls, setTrackControls] = useState<TrackControlState[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedMeasureIndex, setSelectedMeasureIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ScoreShelfFilter>('all');
  const [message, setMessage] = useState('Choose a Guitar Pro or MusicXML file to begin.');

  const sortedAnnotations = useMemo(
    () =>
      [...annotations].sort(
        (a, b) => a.measureIndex - b.measureIndex || a.createdAt.localeCompare(b.createdAt)
      ),
    [annotations]
  );

  useEffect(() => {
    saveScoreLibrary(library);
  }, [library]);

  useEffect(() => {
    if (!score) return;
    saveAnnotations(score.fileHash, annotations);
  }, [annotations, score]);

  const persistActiveScoreMetadata = (
    patch: Partial<Pick<ScoreLibraryEntry, 'title' | 'artist' | 'measureCount' | 'fileHash'>>
  ) => {
    if (!activeEntryId) return;
    setLibrary((current) => updateScoreLibraryEntry(current, activeEntryId, patch));
  };

  const readScoreBytes = async (entry: ScoreLibraryEntry) => {
    if (entry.filePath && window.guitarTabs?.readFile) {
      try {
        const buffer = await window.guitarTabs.readFile(entry.filePath);
        return new Uint8Array(buffer);
      } catch {
        // Fall back to the cached copy when the recorded path is unavailable.
      }
    }

    const cached = loadCachedScoreBytes(entry.id);
    if (cached) return cached;

    throw new Error(
      entry.filePath
        ? 'The recorded file path could not be read and no cached copy exists.'
        : 'No cached copy exists for this score.'
    );
  };

  const openEntry = async (entry: ScoreLibraryEntry) => {
    setLoadingEntryId(entry.id);

    try {
      const bytes = await readScoreBytes(entry);
      const resolvedHash = await hashBytes(bytes);
      const nextEntry = {
        ...entry,
        fileHash: resolvedHash,
        lastOpenedAt: now(),
      };

      setLibrary((current) => upsertScoreLibraryEntry(current, nextEntry));
      saveCachedScoreBytes(nextEntry.id, bytes);
      setActiveEntryId(nextEntry.id);
      setFileBytes(bytes);
      setAnnotations(loadAnnotations(resolvedHash));
      setSelectedMeasureIndex(1);
      setTrackSummaries([]);
      setSelectedTrackIndexes([]);
      setTrackControls([]);
      setMeasureCount(nextEntry.measureCount);
      setScore({
        id: createId(),
        filePath: nextEntry.filePath,
        fileName: nextEntry.fileName,
        fileHash: resolvedHash,
        viewMode: nextEntry.viewMode,
        measureCount: nextEntry.measureCount,
        title: nextEntry.title,
        artist: nextEntry.artist,
      });
      setScreen('reader');
      setMessage(`Opened ${nextEntry.fileName}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setMessage(`Failed to open ${entry.fileName}: ${message}`);
    } finally {
      setLoadingEntryId(null);
    }
  };

  const handleImport = async (file: File) => {
    if (!isSupportedScoreFile(file.name)) {
      setMessage('This file format is not supported.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setMessage('This file is too large to load comfortably in the current build.');
      return;
    }

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const fileHash = await hashFile(file);
      const filePath = (file as File & { path?: string }).path ?? null;
      const id = getScoreLibraryEntryId(filePath, fileHash);

      saveCachedScoreBytes(id, bytes);
      setLibrary((current) =>
        upsertScoreLibraryEntry(current, {
          id,
          filePath,
          fileName: file.name,
          fileHash,
          viewMode: score?.viewMode ?? 'tab',
          measureCount: 0,
        })
      );

      if (screen === 'reader' && activeEntryId === id) {
        setFileBytes(bytes);
        setAnnotations(loadAnnotations(fileHash));
        setScore((current) =>
          current
            ? {
                ...current,
                filePath,
                fileName: file.name,
                fileHash,
                viewMode: current.viewMode,
              }
            : current
        );
      }

      setMessage(`Imported ${file.name}. Click it in your library to open it.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setMessage(`Failed to load ${file.name}: ${message}`);
    }
  };

  const handleCreateAnnotation = (measureIndex: number, content: string) => {
    if (!score) return;

    const timestamp = now();
    const next: Annotation = {
      id: createId(),
      scoreHash: score.fileHash,
      measureIndex,
      content,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    setAnnotations((current) => [...current, next]);
  };

  const handleUpdateAnnotation = (annotationId: string, content: string) => {
    setAnnotations((current) =>
      current.map((annotation) =>
        annotation.id === annotationId
          ? { ...annotation, content, updatedAt: now() }
          : annotation
      )
    );
  };

  const handleDeleteAnnotation = (annotationId: string) => {
    setAnnotations((current) => current.filter((annotation) => annotation.id !== annotationId));
  };

  function handleExportAnnotations() {
    if (!score) {
      setMessage('Load a score before exporting annotations.');
      return;
    }

    const bundle = createAnnotationBundle(score.fileHash, annotations);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${score.fileName.replace(/\.[^.]+$/, '') || 'annotations'}.annotations.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setMessage('Annotations exported.');
  }

  const handleImportAnnotations = async (file: File) => {
    if (!score) {
      setMessage('Load a score before importing annotations.');
      return;
    }

    try {
      const parsed = parseAnnotationBundle(await file.text());
      if (!parsed) {
        setMessage('Invalid annotation bundle.');
        return;
      }

      if (parsed.scoreHash !== score.fileHash) {
        setMessage('This annotation bundle belongs to a different score.');
        return;
      }

      setAnnotations(parsed.annotations);
      saveAnnotations(score.fileHash, parsed.annotations);
      setMessage('Annotations imported.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setMessage(`Failed to import annotations: ${message}`);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isShortcutTarget(event.target)) return;
      if (!(event.metaKey || event.ctrlKey)) return;

      const key = event.key.toLowerCase();
      if (key === 'o') {
        event.preventDefault();
        scoreImportRef.current?.click();
        return;
      }

      if (event.shiftKey && key === 'e' && score) {
        event.preventDefault();
        handleExportAnnotations();
        return;
      }

      if (event.shiftKey && key === 'i' && score) {
        event.preventDefault();
        annotationImportRef.current?.click();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [score, annotations]);

  const fileLabel = score?.fileName ?? 'No file selected';

  const handleBackToLibrary = () => {
    setScreen('library');
    setActiveEntryId(null);
    setLoadingEntryId(null);
    setFileBytes(null);
    setScore(null);
    setMeasureCount(0);
    setTrackSummaries([]);
    setSelectedTrackIndexes([]);
    setTrackControls([]);
    setAnnotations([]);
    setSelectedMeasureIndex(null);
    setMessage('Choose a score from your library.');
  };

  const handleSelectAllTracks = () => {
    setSelectedTrackIndexes([]);
  };

  const handleSelectSingleTrack = (trackIndex: number) => {
    setSelectedTrackIndexes([trackIndex]);
  };

  const updateTrackControl = (trackIndex: number, patch: Partial<TrackControlState>) => {
    setTrackControls((current) =>
      current.map((control, index) => (index === trackIndex ? { ...control, ...patch } : control))
    );
  };

  return (
    <main className={`app-shell${screen === 'reader' ? ' app-shell--reader' : ' app-shell--library'}`}>
      <aside className="app-rail" aria-label="Navigation">
        <button type="button" className="rail-brand" onClick={() => setScreen('library')}>
          <span className="rail-brand__logo" aria-hidden="true">
            GT
          </span>
          <span className="rail-brand__text">
            <strong>GuitarTabs</strong>
            <span>Local library</span>
          </span>
        </button>

        <nav className="rail-nav">
          <button
            type="button"
            className={`rail-link${screen === 'library' ? ' is-active' : ''}`}
            onClick={() => setScreen('library')}
          >
            <span className="rail-link__icon" aria-hidden="true" />
            <span>Browse</span>
          </button>
          <button
            type="button"
            className={`rail-link${screen === 'reader' ? ' is-active' : ''}`}
            onClick={() => {
              if (score) setScreen('reader');
            }}
            disabled={!score}
          >
            <span className="rail-link__icon rail-link__icon--book" aria-hidden="true" />
            <span>Reader</span>
          </button>
          <button type="button" className="rail-link" onClick={() => setSearchQuery('')}>
            <span className="rail-link__icon rail-link__icon--spark" aria-hidden="true" />
            <span>Clear</span>
          </button>
          <button type="button" className="rail-link" onClick={() => annotationImportRef.current?.click()}>
            <span className="rail-link__icon rail-link__icon--note" aria-hidden="true" />
            <span>Notes</span>
          </button>
        </nav>

        <div className="rail-footer">
          <button type="button" className="rail-action" onClick={() => scoreImportRef.current?.click()}>
            Import score
          </button>
          <p className="rail-footer__hint">{library.length} stored scores</p>
        </div>

        <input
          ref={scoreImportRef}
          type="file"
          accept=".gp3,.gp4,.gp5,.gtp,.xml,.musicxml"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleImport(file);
            event.target.value = '';
          }}
        />
      </aside>

      <section className="app-stage">
        {screen === 'reader' ? (
          <header className="reader-hero card-surface">
            <div>
              <p className="eyebrow">Reader</p>
              <h1>{score?.title ?? score?.fileName ?? 'Score Notes'}</h1>
              <p className="subtle" aria-live="polite" role="status">
                {message}
              </p>
            </div>
            <div className="reader-hero__actions">
              <button type="button" className="ghost" onClick={handleBackToLibrary}>
                Back to library
              </button>
              <button type="button" disabled={!score} onClick={handleExportAnnotations}>
                Export Notes
              </button>
              <button
                type="button"
                className="ghost"
                disabled={!score}
                onClick={() => annotationImportRef.current?.click()}
              >
                Import Notes
              </button>
            </div>
            <p className="shortcut-hint">
              Shortcuts: <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>O</kbd> import score,{' '}
              <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd> export notes,{' '}
              <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd> import notes
            </p>
          </header>
        ) : null}

        {screen === 'library' ? (
          <ScoreLibrary
            entries={library}
            activeEntryId={activeEntryId}
            loadingEntryId={loadingEntryId}
            searchQuery={searchQuery}
            activeFilter={activeFilter}
            onSearchQueryChange={setSearchQuery}
            onFilterChange={setActiveFilter}
            onOpenEntry={(entry) => {
              void openEntry(entry);
            }}
          />
        ) : (
          <section className="workspace workspace--reader">
            <ScoreViewer
              fileBytes={fileBytes}
              fileName={fileLabel}
              activeMeasureIndex={selectedMeasureIndex}
              tracks={trackSummaries}
              selectedTrackIndexes={selectedTrackIndexes}
              trackControls={trackControls}
              onShowAllTracks={handleSelectAllTracks}
              onSelectTrack={handleSelectSingleTrack}
              onToggleTrackMute={(trackIndex) => {
                const nextMuted = !trackControls[trackIndex]?.muted;
                updateTrackControl(trackIndex, { muted: nextMuted });
              }}
              onToggleTrackSolo={(trackIndex) => {
                const nextSolo = !trackControls[trackIndex]?.solo;
                updateTrackControl(trackIndex, { solo: nextSolo });
              }}
              onChangeTrackVolume={(trackIndex, volume) => {
                updateTrackControl(trackIndex, { volume });
              }}
              onMeasureClick={(measureIndex) => {
                setSelectedMeasureIndex(measureIndex);
                setMessage(`Selected measure ${measureIndex}`);
              }}
              onPlayerMeasureChange={(measureIndex) => {
                setSelectedMeasureIndex(measureIndex);
              }}
              onScoreLoaded={({ measureCount: nextMeasureCount, title, artist, tracks = [] }) => {
                setMeasureCount(nextMeasureCount);
                setTrackSummaries(tracks);
                setTrackControls(createDefaultTrackControls(tracks.length));
                setSelectedTrackIndexes([]);
                setScore((current) =>
                  current
                    ? {
                        ...current,
                        measureCount: nextMeasureCount,
                        title,
                        artist,
                      }
                    : current
                );
                persistActiveScoreMetadata({
                  measureCount: nextMeasureCount,
                  title,
                  artist,
                });
                setMessage([artist, title].filter(Boolean).join(' - ') || `Loaded ${fileLabel}`);
              }}
              onRenderReady={() => {
                setMessage(`Score ready: ${fileLabel}`);
              }}
              onError={(error) => setMessage(`Load failed: ${error}`)}
            />

            <AnnotationDrawer
              annotations={sortedAnnotations}
              measureCount={Math.max(measureCount, 1)}
              selectedMeasureIndex={selectedMeasureIndex}
              activeMeasureIndex={selectedMeasureIndex}
              onSelectMeasure={(measureIndex) =>
                setSelectedMeasureIndex(Number.isFinite(measureIndex) ? Math.max(1, measureIndex) : 1)
              }
              onCreate={handleCreateAnnotation}
              onUpdate={handleUpdateAnnotation}
              onDelete={handleDeleteAnnotation}
            />
          </section>
        )}

        <input
          ref={annotationImportRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleImportAnnotations(file);
              event.target.value = '';
            }
          }}
        />
      </section>
    </main>
  );
}
