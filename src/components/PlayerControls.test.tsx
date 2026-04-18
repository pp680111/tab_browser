import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlayerControls } from './PlayerControls';

describe('PlayerControls', () => {
  it('renders play controls and forwards speed changes', () => {
    const onSpeedChange = vi.fn();
    render(
      <PlayerControls
        ready
        playing={false}
        playbackSpeed={1}
        positionLabel="00:10 / 01:30"
        onPlayPause={vi.fn()}
        onStop={vi.fn()}
        onSpeedChange={onSpeedChange}
      />
    );

    expect(screen.getByText('Play')).toBeEnabled();
    expect(screen.getByText('00:10 / 01:30')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1.5' } });
    expect(onSpeedChange).toHaveBeenCalledWith(1.5);
  });
});

