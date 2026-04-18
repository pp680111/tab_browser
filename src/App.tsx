import { useEffect, useMemo, useRef, useState } from 'react';
import { AnnotationDrawer } from './components/AnnotationDrawer';
import { ScoreViewer } from './components/ScoreViewer';
import { createAnnotationBundle, parseAnnotationBundle } from './lib/annotationTransfer';
import { hashFile } from './lib/fileHash';
import { isSupportedScoreFile } from './lib/fileTypes';
import { loadAnnotations, saveAnnotations } from './lib/storage';
import type { Annotation, ScoreDocument, ViewMode } from './types';

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

export default function App() {
  const scoreImportRef = useRef<HTMLInputElement | null>(null);
  const annotationImportRef = useRef<HTMLInputElement | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [score, setScore] = useState<ScoreDocument | null>(null);
  const [measureCount, setMeasureCount] = useState(0);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedMeasureIndex, setSelectedMeasureIndex] = useState<number | null>(1);
  const [message, setMessage] = useState('Choose a Guitar Pro or MusicXML file to begin.');
  const [viewMode, setViewMode] = useState<ViewMode>('tab');

  const sortedAnnotations = useMemo(
    () =>
      [...annotations].sort(
        (a, b) => a.measureIndex - b.measureIndex || a.createdAt.localeCompare(b.createdAt)
      ),
    [annotations]
  );

  useEffect(() => {
    if (!score) return;
    saveAnnotations(score.fileHash, annotations);
  }, [annotations, score]);

  useEffect(() => {
    if (!score) return;
    setScore((current) => (current && current.viewMode !== viewMode ? { ...current, viewMode } : current));
  }, [score, viewMode]);

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
      const restored = loadAnnotations(fileHash);

      setCurrentFile(file);
      setFileBytes(bytes);
      setAnnotations(restored);
      setSelectedMeasureIndex(1);
      setScore({
        id: createId(),
        fileName: file.name,
        fileHash,
        viewMode,
        measureCount: 0,
      });
      setMeasureCount(0);
      setMessage(`Loaded ${file.name}. Parsing score...`);
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

      if (key === 't') {
        event.preventDefault();
        setViewMode((current) => (current === 'tab' ? 'standard' : 'tab'));
        return;
      }

      if (event.shiftKey && key === 'e') {
        event.preventDefault();
        handleExportAnnotations();
        return;
      }

      if (event.shiftKey && key === 'i') {
        event.preventDefault();
        annotationImportRef.current?.click();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [score, viewMode, annotations]);

  const fileLabel = currentFile?.name ?? 'No file imported';

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">GuitarTabs</p>
          <h1>Score Notes</h1>
          <p className="subtle" aria-live="polite" role="status">
            {message}
          </p>
        </div>
        <div className="actions">
          <label className="file-button">
            Import Score
            <input
              ref={scoreImportRef}
              type="file"
              accept=".gp3,.gp4,.gp5,.gtp,.xml,.musicxml"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleImport(file);
              }}
            />
          </label>
          <button
            type="button"
            className="ghost"
            onClick={() => setViewMode((current) => (current === 'tab' ? 'standard' : 'tab'))}
            aria-label="Toggle score view"
          >
            Switch to {viewMode === 'tab' ? 'standard notation' : 'tablature'}
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
        </div>
        <p className="shortcut-hint">
          Shortcuts: <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>O</kbd> import score,{' '}
          <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>T</kbd> switch view, <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd>{' '}
          export notes, <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd> import notes
        </p>
      </header>

      <section className="workspace">
        <ScoreViewer
          fileBytes={fileBytes}
          fileName={fileLabel}
          annotations={sortedAnnotations}
          activeMeasureIndex={selectedMeasureIndex}
          onMeasureClick={(measureIndex) => {
            setSelectedMeasureIndex(measureIndex);
            setMessage(`Selected measure ${measureIndex}`);
          }}
          onPlayerMeasureChange={(measureIndex) => {
            setSelectedMeasureIndex(measureIndex);
          }}
          onScoreLoaded={({ measureCount: nextMeasureCount, title, artist }) => {
            setMeasureCount(nextMeasureCount);
            setScore((current) =>
              current
                ? {
                    ...current,
                    measureCount: nextMeasureCount,
                    title,
                    artist,
                    viewMode,
                  }
                : current
            );
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
          onSelectMeasure={(measureIndex) => setSelectedMeasureIndex(Math.max(1, measureIndex))}
          onCreate={handleCreateAnnotation}
          onUpdate={handleUpdateAnnotation}
          onDelete={handleDeleteAnnotation}
        />
      </section>
    </main>
  );
}
