import type { MeasurePosition } from '../types';

type Props = {
  measurePositions: MeasurePosition[];
  activeMeasureIndex: number | null;
  onMeasureClick: (measureIndex: number) => void;
};

export function MeasureOverlay({ measurePositions, activeMeasureIndex, onMeasureClick }: Props) {
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
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onMeasureClick(position.measureIndex)}
            aria-label={`Measure ${position.measureIndex}`}
          />
        );
      })}
    </div>
  );
}
