type Props = {
  ready: boolean;
  playing: boolean;
  playbackSpeed: number;
  positionLabel: string;
  loopLabel: string;
  onPlayPause: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  onSetLoopStart: () => void;
  onSetLoopEnd: () => void;
  onClearLoop: () => void;
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function PlayerControls({
  ready,
  playing,
  playbackSpeed,
  positionLabel,
  loopLabel,
  onPlayPause,
  onStop,
  onSpeedChange,
  onSetLoopStart,
  onSetLoopEnd,
  onClearLoop,
}: Props) {
  return (
    <section className="player-controls" aria-label="Playback controls">
      <div className="player-controls__group">
        <button type="button" disabled={!ready} onClick={onStop}>
          Stop
        </button>
        <button type="button" disabled={!ready} onClick={onPlayPause}>
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>

      <div className="player-controls__group">
        <span className="player-controls__label">{positionLabel}</span>
        <label className="player-controls__speed">
          Speed
          <select value={playbackSpeed} onChange={(event) => onSpeedChange(Number(event.target.value))}>
            {SPEEDS.map((speed) => (
              <option key={speed} value={speed}>
                {speed}x
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="player-controls__group">
        <span className="player-controls__label">{loopLabel}</span>
        <button type="button" className="ghost" disabled={!ready} onClick={onSetLoopStart}>
          Set A
        </button>
        <button type="button" className="ghost" disabled={!ready} onClick={onSetLoopEnd}>
          Set B
        </button>
        <button type="button" className="ghost" disabled={!ready} onClick={onClearLoop}>
          Clear Loop
        </button>
      </div>
    </section>
  );
}
