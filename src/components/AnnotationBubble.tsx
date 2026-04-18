import type { Annotation } from '../types';

type Props = {
  annotation: Annotation;
  left: number;
  top: number;
  active?: boolean;
  onClick?: () => void;
};

export function AnnotationBubble({ annotation, left, top, active = false, onClick }: Props) {
  const summary = annotation.content.length > 24 ? `${annotation.content.slice(0, 24)}...` : annotation.content;

  return (
    <button
      type="button"
      className={`annotation-bubble ${active ? 'active' : ''}`}
      style={{ left, top }}
      onClick={onClick}
      title={annotation.content}
    >
      <span className="annotation-bubble__measure">M{annotation.measureIndex}</span>
      <span className="annotation-bubble__content">{summary}</span>
    </button>
  );
}

