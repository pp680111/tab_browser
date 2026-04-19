import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MeasurePosition } from '../types';
import { MeasureOverlay } from './MeasureOverlay';

const positions: MeasurePosition[] = [
  { measureIndex: 2, x: 10, y: 20, width: 100, height: 40 },
];

describe('MeasureOverlay', () => {
  it('renders hit areas', () => {
    render(
      <MeasureOverlay
        measurePositions={positions}
        activeMeasureIndex={2}
        onMeasureClick={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Measure 2')).toBeInTheDocument();
  });
});

