import { useMemo, useState } from 'react';
import type { TrackControlState, TrackSummary } from '../types';

type Props = {
  ready: boolean;
  playing: boolean;
  playbackSpeed: number;
  positionLabel: string;
  loopLabel: string;
  tracks: TrackSummary[];
  selectedTrackIndexes: number[];
  trackControls: TrackControlState[];
  onPlayPause: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  onSetLoopStart: () => void;
  onSetLoopEnd: () => void;
  onClearLoop: () => void;
  onShowAllTracks: () => void;
  onSelectTrack: (trackIndex: number) => void;
  onToggleTrackMute: (trackIndex: number) => void;
  onToggleTrackSolo: (trackIndex: number) => void;
  onChangeTrackVolume: (trackIndex: number, volume: number) => void;
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function PlayerControls({
  ready,
  playing,
  playbackSpeed,
  positionLabel,
  loopLabel,
  tracks,
  selectedTrackIndexes,
  trackControls,
  onPlayPause,
  onStop,
  onSpeedChange,
  onSetLoopStart,
  onSetLoopEnd,
  onClearLoop,
  onShowAllTracks,
  onSelectTrack,
  onToggleTrackMute,
  onToggleTrackSolo,
  onChangeTrackVolume,
}: Props) {
  const [tracksOpen, setTracksOpen] = useState(false);
  const isAllSelected = selectedTrackIndexes.length === 0;
  const selectedTrackSet = useMemo(() => new Set(selectedTrackIndexes), [selectedTrackIndexes]);

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

      <div className="player-controls__tracks">
        <button
          type="button"
          className={`chip player-controls__tracks-toggle${tracksOpen ? ' is-active' : ''}`}
          onClick={() => setTracksOpen((current) => !current)}
          disabled={tracks.length === 0}
        >
          Tracks {tracks.length > 0 ? `(${tracks.length})` : ''}
        </button>

        {tracksOpen ? (
          <div className="player-controls__tracks-panel" aria-label="Track controls">
            <div className="drawer-tracks__header">
              <div>
                <p className="eyebrow">Tracks</p>
                <h3>Rendered tracks</h3>
              </div>
              <button
                type="button"
                className={`chip${isAllSelected ? ' is-active' : ''}`}
                onClick={onShowAllTracks}
              >
                All tracks
              </button>
            </div>

            <div className="track-tabs" role="tablist" aria-label="Rendered tracks">
              {tracks.map((track) => {
                const isSelected = selectedTrackSet.has(track.index) || isAllSelected;
                return (
                  <button
                    key={track.index}
                    type="button"
                    className={`track-tab${isSelected ? ' is-active' : ''}`}
                    onClick={() => onSelectTrack(track.index)}
                  >
                    <span className="track-tab__index">T{track.index + 1}</span>
                    <span className="track-tab__name">{track.shortName || track.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="track-list">
              {tracks.map((track) => {
                const control = trackControls[track.index] ?? { muted: false, solo: false, volume: 1 };
                const isSelected = selectedTrackSet.has(track.index) || isAllSelected;

                return (
                  <article key={track.index} className={`track-card${isSelected ? ' is-selected' : ''}`}>
                    <div className="track-card__meta">
                      <div>
                        <strong>{track.shortName || track.name}</strong>
                        <p>{track.name}</p>
                      </div>
                      <span>{track.isPercussion ? 'Percussion' : `${track.staffCount} stave(s)`}</span>
                    </div>

                    <div className="track-card__actions">
                      <button type="button" className="ghost" onClick={() => onSelectTrack(track.index)}>
                        Show
                      </button>
                      <button
                        type="button"
                        className={control.muted ? 'danger' : 'ghost'}
                        onClick={() => onToggleTrackMute(track.index)}
                      >
                        {control.muted ? 'Muted' : 'Mute'}
                      </button>
                      <button
                        type="button"
                        className={control.solo ? 'chip is-active' : 'ghost'}
                        onClick={() => onToggleTrackSolo(track.index)}
                      >
                        {control.solo ? 'Solo on' : 'Solo'}
                      </button>
                    </div>

                    <label className="track-card__volume">
                      <span>
                        Volume
                        <strong>{Math.round(control.volume * 100)}%</strong>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={Math.round(control.volume * 100)}
                        onChange={(event) => onChangeTrackVolume(track.index, Number(event.target.value) / 100)}
                      />
                    </label>
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
