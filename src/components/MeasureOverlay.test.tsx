import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Annotation, MeasurePosition } from '../types';
import { MeasureOverlay } from './MeasureOverlay';

const annotations: Annotation[] = [
  {
    id: 'a1',
    scoreHash: 'hash',
    measureIndex: 2,
    content: 'Note one',
    createdAt: '2026-04-18T00:00:00.000Z',
    updatedAt: '2026-04-18T00:00:00.000Z',
  },
];

const positions: MeasurePosition[] = [
  { measureIndex: 2, x: 10, y: 20, width: 100, height: 40 },
];

describe('MeasureOverlay', () => {
  it('renders hit areas and annotation bubbles', () => {
    render(
      <MeasureOverlay
        annotations={annotations}
        measurePositions={positions}
        activeMeasureIndex={2}
        onMeasureClick={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Measure 2')).toBeInTheDocument();
    expect(screen.getByText('M2')).toBeInTheDocument();
    expect(screen.getByText('Note one')).toBeInTheDocument();
  });
});

