import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { Annotation } from '../types';

type Props = {
  annotations: Annotation[];
  measureCount: number;
  selectedMeasureIndex: number | null;
  activeMeasureIndex: number | null;
  onSelectMeasure: (measureIndex: number) => void;
  onCreate: (measureIndex: number, content: string) => void;
  onUpdate: (annotationId: string, content: string) => void;
  onDelete: (annotationId: string) => void;
};

export function AnnotationDrawer({
  annotations,
  measureCount,
  selectedMeasureIndex,
  activeMeasureIndex,
  onSelectMeasure,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const activeAnnotations = useMemo(
    () => annotations.filter((annotation) => annotation.measureIndex === activeMeasureIndex),
    [annotations, activeMeasureIndex]
  );

  useEffect(() => {
    if (!activeMeasureIndex || activeAnnotations.length === 0) return;
    const target = listRef.current?.querySelector<HTMLElement>(
      `[data-measure-index="${activeMeasureIndex}"]`
    );
    if (!target || !listRef.current) return;

    const container = listRef.current;
    const targetTop = target.offsetTop - container.offsetTop;
    const nextScrollTop = Math.max(0, targetTop - container.clientHeight / 2 + target.clientHeight / 2);
    container.scrollTo({ top: nextScrollTop, behavior: 'smooth' });
  }, [activeMeasureIndex, activeAnnotations.length]);

  return (
    <aside className="drawer" aria-label="Annotation drawer">
      <div className="drawer-header">
        <div>
          <p className="eyebrow">Annotation manager</p>
          <h2>Measure notes</h2>
        </div>
      </div>

      <div className="drawer-create">
        <label>
          Current measure
          <input
            type="number"
            min={1}
            max={Math.max(1, measureCount)}
            value={selectedMeasureIndex ?? 1}
            onChange={(event) => {
              const next = Number(event.target.value);
              onSelectMeasure(Number.isFinite(next) ? next : 1);
            }}
          />
        </label>
        <AnnotationComposer measureIndex={selectedMeasureIndex ?? 1} onCreate={onCreate} />
      </div>

      <div className="annotation-list" ref={listRef}>
        {annotations.length === 0 ? (
          <p className="empty-state">No notes yet. Create one for the current measure.</p>
        ) : (
          annotations.map((annotation) => (
            <AnnotationCard
              key={annotation.id}
              annotation={annotation}
              active={annotation.measureIndex === activeMeasureIndex}
              onSelectMeasure={onSelectMeasure}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function AnnotationComposer({
  measureIndex,
  onCreate,
}: {
  measureIndex: number;
  onCreate: (measureIndex: number, content: string) => void;
}) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const content = String(formData.get('content') ?? '').trim();
    if (!content) return;
    onCreate(measureIndex, content);
    form.reset();
  };

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <textarea
        name="content"
        rows={4}
        placeholder="Write a practice hint, fingering note, or reminder."
      />
      <button type="submit">Add note</button>
    </form>
  );
}

function AnnotationCard({
  annotation,
  active = false,
  onSelectMeasure,
  onUpdate,
  onDelete,
}: {
  annotation: Annotation;
  active?: boolean;
  onSelectMeasure: (measureIndex: number) => void;
  onUpdate: (annotationId: string, content: string) => void;
  onDelete: (annotationId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(annotation.content);

  useEffect(() => {
    setValue(annotation.content);
  }, [annotation.content]);

  return (
    <article
      className={`annotation-card${active ? ' active' : ''}`}
      data-measure-index={annotation.measureIndex}
      onClick={() => onSelectMeasure(annotation.measureIndex)}
    >
      <div className="annotation-meta">
        <span>Measure {annotation.measureIndex}</span>
        <time>{new Date(annotation.updatedAt).toLocaleString('zh-CN')}</time>
      </div>
      {editing ? (
        <div className="annotation-edit">
          <textarea value={value} onChange={(event) => setValue(event.target.value)} rows={4} />
          <div className="row">
            <button
              type="button"
              onClick={() => {
                onUpdate(annotation.id, value.trim());
                setEditing(false);
              }}
            >
              Save
            </button>
            <button type="button" className="ghost" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="annotation-content">{annotation.content}</p>
      )}
      <div className="row">
        <button type="button" className="ghost" onClick={() => setEditing((current) => !current)}>
          {editing ? 'Close' : 'Edit'}
        </button>
        <button type="button" className="ghost danger" onClick={() => onDelete(annotation.id)}>
          Delete
        </button>
      </div>
    </article>
  );
}

