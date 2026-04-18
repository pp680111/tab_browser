import type { Annotation, MeasurePosition } from '../types';
import { AnnotationBubble } from './AnnotationBubble';

type Props = {
  annotations: Annotation[];
  measurePositions: MeasurePosition[];
  activeMeasureIndex: number | null;
  onMeasureClick: (measureIndex: number) => void;
};

export function MeasureOverlay({ annotations, measurePositions, activeMeasureIndex, onMeasureClick }: Props) {
  const positionedAnnotations = annotations
    .map((annotation, index) => {
      const position = measurePositions.find((item) => item.measureIndex === annotation.measureIndex);
      if (!position) return null;

      const stackOffset = (annotations.filter((item) => item.measureIndex === annotation.measureIndex).indexOf(annotation) * 28);
      return {
        annotation,
        left: position.x + 8,
        top: position.y - 18 - stackOffset,
      };
    })
    .filter(Boolean) as Array<{ annotation: Annotation; left: number; top: number }>;

  return (
    <div className="measure-overlay">
      {measurePositions.map((position) => {
        const active = position.measureIndex === activeMeasureIndex;
        return (
          <button
            key={position.measureIndex}
            type="button"
            className={`measure-hit ${active ? 'active' : ''}`}
            style={{
              left: position.x,
              top: position.y,
              width: position.width,
              height: position.height,
            }}
            onClick={() => onMeasureClick(position.measureIndex)}
            aria-label={`Measure ${position.measureIndex}`}
          />
        );
      })}

      {positionedAnnotations.map(({ annotation, left, top }) => {
        const active = annotation.measureIndex === activeMeasureIndex;
        return (
          <AnnotationBubble
            key={annotation.id}
            annotation={annotation}
            left={left}
            top={top}
            active={active}
            onClick={() => onMeasureClick(annotation.measureIndex)}
          />
        );
      })}
    </div>
  );
}
