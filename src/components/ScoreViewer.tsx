import { useEffect, useMemo, useRef, useState } from 'react';
import * as alphaTab from '@coderline/alphatab';
import type { MeasurePosition, TrackControlState, TrackSummary } from '../types';
import { PlayerControls } from './PlayerControls';

type Props = {
  fileBytes: Uint8Array | null;
  fileName: string | null;
  activeMeasureIndex: number | null;
  tracks: TrackSummary[];
  selectedTrackIndexes: number[];
  trackControls: TrackControlState[];
  onShowAllTracks: () => void;
  onSelectTrack: (trackIndex: number) => void;
  onToggleTrackMute: (trackIndex: number) => void;
  onToggleTrackSolo: (trackIndex: number) => void;
  onChangeTrackVolume: (trackIndex: number, volume: number) => void;
  onScoreLoaded: (payload: {
    fileName: string;
    title?: string;
    artist?: string;
    measureCount: number;
    tracks: TrackSummary[];
  }) => void;
  onMeasureClick?: (measureIndex: number) => void;
  onPlayerMeasureChange?: (measureIndex: number) => void;
  onPlaybackStateChange?: (playing: boolean) => void;
  onRenderReady?: () => void;
  onError?: (message: string) => void;
};

function extractMeasureCount(score: any): number {
  if (!score) return 0;
  if (typeof score.measureCount === 'number') return score.measureCount;
  const firstTrackBars = score?.tracks?.[0]?.staves?.[0]?.bars?.length;
  if (typeof firstTrackBars === 'number') return firstTrackBars;
  if (Array.isArray(score.masterBars)) return score.masterBars.length;
  if (Array.isArray(score.measures)) return score.measures.length;
  return 0;
}

function extractTitle(score: any): { title?: string; artist?: string } {
  const title = score?.title ?? score?.song?.title ?? score?.name;
  const artist = score?.artist ?? score?.song?.artist?.name ?? score?.track?.artist;
  return { title, artist };
}

function extractTrackSummaries(score: any): TrackSummary[] {
  const tracks = Array.isArray(score?.tracks) ? score.tracks : [];
  return tracks.map((track: any, index: number) => ({
    index,
    name: String(track?.name ?? `Track ${index + 1}`),
    shortName: String(track?.shortName ?? track?.name ?? `T${index + 1}`),
    isPercussion: Boolean(track?.isPercussion),
    isVisibleOnMultiTrack: track?.isVisibleOnMultiTrack !== false,
    staffCount: Array.isArray(track?.staves) ? track.staves.length : 0,
  }));
}

function getBoundsBox(bounds: any): MeasurePosition | null {
  const source = bounds?.visualBounds ?? bounds?.realBounds ?? bounds;
  if (!source) return null;

  const x = Number(source.x ?? source.left ?? 0);
  const y = Number(source.y ?? source.top ?? 0);
  const width = Number(source.w ?? source.width ?? 0);
  const height = Number(source.h ?? source.height ?? 0);

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }

  return {
    measureIndex: 0,
    x,
    y,
    width,
    height,
  };
}

function collectMeasurePositions(api: any, score: any): MeasurePosition[] {
  const lookup = api?.renderer?.boundsLookup ?? api?.boundsLookup;
  const masterBars = Array.isArray(score?.masterBars) ? score.masterBars : [];

  return masterBars
    .map((_: unknown, index: number) => {
      const bounds = lookup?.findMasterBarByIndex?.(index) ?? lookup?.getMasterBarBounds?.(index);
      const box = getBoundsBox(bounds);
      return box ? { ...box, measureIndex: index + 1 } : null;
    })
    .filter(Boolean) as MeasurePosition[];
}

function formatTime(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return '00:00';
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function ScoreViewer({
  fileBytes,
  fileName,
  activeMeasureIndex,
  tracks,
  selectedTrackIndexes,
  trackControls,
  onShowAllTracks,
  onSelectTrack,
  onToggleTrackMute,
  onToggleTrackSolo,
  onChangeTrackVolume,
  onScoreLoaded,
  onMeasureClick,
  onPlayerMeasureChange,
  onPlaybackStateChange,
  onRenderReady,
  onError,
}: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<any>(null);
  const scoreRef = useRef<any>(null);
  const lastRenderedTrackKeyRef = useRef('');
  const trackRenderPendingRef = useRef(false);
  const onScoreLoadedRef = useRef(onScoreLoaded);
  const onMeasureClickRef = useRef(onMeasureClick);
  const onRenderReadyRef = useRef(onRenderReady);
  const onErrorRef = useRef(onError);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [apiReady, setApiReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [positionLabel, setPositionLabel] = useState('Stopped');
  const [playerReady, setPlayerReady] = useState(false);
  const [scoreRevision, setScoreRevision] = useState(0);
  const [measurePositions, setMeasurePositions] = useState<MeasurePosition[]>([]);
  const [loopRange, setLoopRange] = useState<{ startMeasure: number | null; endMeasure: number | null }>({
    startMeasure: null,
    endMeasure: null,
  });
  const [loopLabel, setLoopLabel] = useState('Loop: off');

  const label = useMemo(() => fileName ?? 'No file selected', [fileName]);

  useEffect(() => {
    onScoreLoadedRef.current = onScoreLoaded;
  }, [onScoreLoaded]);

  useEffect(() => {
    onMeasureClickRef.current = onMeasureClick;
  }, [onMeasureClick]);

  useEffect(() => {
    onRenderReadyRef.current = onRenderReady;
  }, [onRenderReady]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!hostRef.current) return;

    const api = new alphaTab.AlphaTabApi(hostRef.current, {
      core: {
        fontDirectory: '/assets/font/',
      },
      player: {
        enablePlayer: true,
        enableCursor: true,
        enableAnimatedBeatCursor: true,
        enableElementHighlighting: true,
        soundFont: '/assets/soundfont/sonivox.sf2',
        scrollElement: viewportRef.current ?? hostRef.current,
      },
      display: {
        scale: 1.0,
      },
    });
    let playbackCursorLine: HTMLDivElement | null = null;
    api.customCursorHandler = {
      onAttach(cursors) {
        const cursorWrapper = cursors.cursorWrapper.element;
        playbackCursorLine = document.createElement('div');
        playbackCursorLine.className = 'playback-cursor-line';
        cursorWrapper.appendChild(playbackCursorLine);
        cursors.barCursor.element.style.opacity = '0';
        cursors.beatCursor.element.style.opacity = '0';
      },
      onDetach(cursors) {
        playbackCursorLine?.remove();
        playbackCursorLine = null;
        cursors.barCursor.element.style.opacity = '';
        cursors.beatCursor.element.style.opacity = '';
      },
      placeBarCursor() {
        // The custom playback line represents the active beat, so the bar cursor stays hidden.
      },
      placeBeatCursor(_beatCursor, beatBounds, startBeatX) {
        if (!playbackCursorLine) return;
        const barBounds = beatBounds?.barBounds?.masterBarBounds?.visualBounds;
        if (!barBounds) return;
        const left = Number.isFinite(beatBounds.onNotesX) ? beatBounds.onNotesX : startBeatX;
        playbackCursorLine.style.left = `${left}px`;
        playbackCursorLine.style.top = `${barBounds.y}px`;
        playbackCursorLine.style.height = `${barBounds.h}px`;
        playbackCursorLine.style.transition = 'left 0ms linear';
      },
      transitionBeatCursor(_beatCursor, beatBounds, startBeatX, nextBeatX, duration, _cursorMode) {
        if (!playbackCursorLine) return;
        const barBounds = beatBounds?.barBounds?.masterBarBounds?.visualBounds;
        if (!barBounds) return;
        const left = Number.isFinite(nextBeatX) ? nextBeatX : startBeatX;
        playbackCursorLine.style.left = `${Number.isFinite(startBeatX) ? startBeatX : left}px`;
        playbackCursorLine.style.top = `${barBounds.y}px`;
        playbackCursorLine.style.height = `${barBounds.h}px`;
        playbackCursorLine.style.transition = `left ${Math.max(0, duration)}ms linear`;
        window.requestAnimationFrame(() => {
          if (playbackCursorLine) {
            playbackCursorLine.style.left = `${left}px`;
          }
        });
      },
    };
    apiRef.current = api;
    setApiReady(true);

    const handleScoreLoaded = (score: any) => {
      scoreRef.current = score;
      lastRenderedTrackKeyRef.current = '';
      trackRenderPendingRef.current = true;
      setMeasurePositions([]);
      const meta = extractTitle(score);
      onScoreLoadedRef.current({
        fileName: label,
        ...meta,
        measureCount: extractMeasureCount(score),
        tracks: extractTrackSummaries(score),
      });
      setScoreRevision((current) => current + 1);
    };

    const handleRenderFinished = () => {
      trackRenderPendingRef.current = false;
      const api = apiRef.current;
      const score = scoreRef.current;
      if (api && score) {
        setMeasurePositions(collectMeasurePositions(api, score));
      }
      setStatus('ready');
      setScoreRevision((current) => current + 1);
      onRenderReadyRef.current?.();
    };

    const handlePlayerReady = () => {
      setPlayerReady(true);
      setPositionLabel('00:00 / 00:00');
    };

    const handlePlayerStateChanged = (state: any) => {
      const isPlaying = Boolean(state?.state === alphaTab.synth.PlayerState.Playing);
      setPlaying(isPlaying);
      onPlaybackStateChange?.(isPlaying);
      if (typeof state?.playbackSpeed === 'number') {
        setPlaybackSpeed(state.playbackSpeed);
      }
    };

    const handlePlayerPositionChanged = (position: any) => {
      const current = formatTime(Number(position?.currentTime ?? 0));
      const end = formatTime(Number(position?.endTime ?? 0));
      setPositionLabel(`${current} / ${end}`);

      const playedMeasureIndex =
        typeof position?.bar?.index === 'number'
          ? position.bar.index + 1
          : typeof position?.beat?.bar?.index === 'number'
            ? position.beat.bar.index + 1
            : null;
      if (playedMeasureIndex) {
        onPlayerMeasureChange?.(playedMeasureIndex);
      }
    };

    const handlePlayedBeatChanged = (beat: any) => {
      const measureIndex = typeof beat?.bar?.index === 'number' ? beat.bar.index + 1 : null;
      if (measureIndex) {
        onPlayerMeasureChange?.(measureIndex);
      }
    };

    const handleError = (error: Error) => {
      setStatus('idle');
      onErrorRef.current?.(error.message);
    };

  const handleBeatMouseDown = (beat: any) => {
      const measureIndex = typeof beat?.bar?.index === 'number' ? beat.bar.index + 1 : null;
      if (measureIndex && onMeasureClickRef.current) {
        onMeasureClickRef.current(measureIndex);
      }
    };

    api.scoreLoaded.on(handleScoreLoaded);
    api.renderFinished.on(handleRenderFinished);
    api.playerReady?.on?.(handlePlayerReady);
    api.playerStateChanged?.on?.(handlePlayerStateChanged);
    api.playerPositionChanged?.on?.(handlePlayerPositionChanged);
    api.playedBeatChanged?.on?.(handlePlayedBeatChanged);
    api.error.on(handleError);
    api.beatMouseDown?.on?.(handleBeatMouseDown);

    return () => {
      api.scoreLoaded.off(handleScoreLoaded);
      api.renderFinished.off(handleRenderFinished);
      api.playerReady?.off?.(handlePlayerReady);
      api.playerStateChanged?.off?.(handlePlayerStateChanged);
      api.playerPositionChanged?.off?.(handlePlayerPositionChanged);
      api.playedBeatChanged?.off?.(handlePlayedBeatChanged);
      api.error.off(handleError);
      api.beatMouseDown?.off?.(handleBeatMouseDown);
      api.destroy?.();
      apiRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!apiReady || !apiRef.current || !fileBytes) return;
    setStatus('loading');
    const loaded = apiRef.current.load(fileBytes);
    if (!loaded) {
      setStatus('idle');
      onErrorRef.current?.('AlphaTab could not load the current file.');
    }
  }, [apiReady, fileBytes]);

  useEffect(() => {
    const api = apiRef.current;
    const score = scoreRef.current;
    if (!api || !score) return;

    const allTracks = Array.isArray(score.tracks) ? score.tracks : [];
    if (allTracks.length === 0) return;

    const nextTrackIndexes =
      selectedTrackIndexes.length > 0 ? selectedTrackIndexes : allTracks.map((track: any, index: number) => track?.index ?? index);
    const trackKey = nextTrackIndexes.join(',');
    if (lastRenderedTrackKeyRef.current === trackKey) return;
    const nextTracks = nextTrackIndexes.map((trackIndex) => allTracks[trackIndex]).filter(Boolean);

    if (nextTracks.length > 0) {
      trackRenderPendingRef.current = true;
      setMeasurePositions([]);
      api.renderTracks?.(nextTracks);
      lastRenderedTrackKeyRef.current = trackKey;
    }
  }, [selectedTrackIndexes, trackControls]);

  useEffect(() => {
    const api = apiRef.current;
    const score = scoreRef.current;
    if (!api || !score) return;

    const allTracks = Array.isArray(score.tracks) ? score.tracks : [];
    if (allTracks.length === 0) return;

    allTracks.forEach((track: any, index: number) => {
      const control = trackControls[index];
      if (!control) return;

      api.changeTrackMute?.([track], control.muted);
      api.changeTrackSolo?.([track], control.solo);
      api.changeTrackVolume?.([track], control.volume);
    });
  }, [scoreRevision, trackControls]);

  useEffect(() => {
    const api = apiRef.current;
    const score = scoreRef.current;
    if (!api || !score || !loopRange.startMeasure || !loopRange.endMeasure) {
      setLoopLabel('Loop: off');
      return;
    }

    const bars = score?.tracks?.[0]?.staves?.[0]?.bars ?? score?.masterBars ?? [];
    const startBar = bars[loopRange.startMeasure - 1];
    const endBar = bars[loopRange.endMeasure - 1];
    const firstBeat = startBar?.voices?.[0]?.beats?.[0];
    const lastBeat = endBar?.voices?.[0]?.beats?.at?.(-1) ?? endBar?.voices?.[0]?.beats?.[endBar?.voices?.[0]?.beats?.length - 1];
    const startTick = api.tickCache?.getBeatStart?.(firstBeat);
    const endTick = api.tickCache?.getBeatStart?.(lastBeat);

    if (typeof startTick === 'number' && typeof endTick === 'number') {
      api.playbackRange = {
        startTick,
        endTick,
      };
      setLoopLabel(`Loop: M${loopRange.startMeasure} - M${loopRange.endMeasure}`);
    }
  }, [loopRange]);

  useEffect(() => {
    if (!activeMeasureIndex) return;
    if (trackRenderPendingRef.current) return;
    const container = viewportRef.current;
    const position = measurePositions.find((item) => item.measureIndex === activeMeasureIndex);
    if (!position || !container) return;

    const top = Math.max(0, position.y - 120);
    container.scrollTo({
      top,
      behavior: 'smooth',
    });
  }, [activeMeasureIndex, measurePositions]);

  const handlePlayPause = () => {
    const api = apiRef.current;
    if (!api) return;
    api.playPause?.();
  };

  const handleStop = () => {
    apiRef.current?.stop?.();
    setPlaying(false);
    onPlaybackStateChange?.(false);
    setPositionLabel('Stopped');
  };

  const handleSpeedChange = (speed: number) => {
    const api = apiRef.current;
    if (!api) return;
    setPlaybackSpeed(speed);
    if (api.player) {
      api.player.playbackSpeed = speed;
    } else {
      api.playbackSpeed = speed;
    }
  };

  const handleSetLoopStart = () => {
    if (!activeMeasureIndex) return;
    setLoopRange((current) => {
      const next = { ...current, startMeasure: activeMeasureIndex };
      if (next.endMeasure && next.endMeasure < next.startMeasure) {
        next.endMeasure = next.startMeasure;
      }
      return next;
    });
  };

  const handleSetLoopEnd = () => {
    if (!activeMeasureIndex) return;
    setLoopRange((current) => {
      const next = { ...current, endMeasure: activeMeasureIndex };
      if (next.startMeasure && next.endMeasure && next.endMeasure < next.startMeasure) {
        next.startMeasure = next.endMeasure;
      }
      return next;
    });
  };

  const handleClearLoop = () => {
    setLoopRange({ startMeasure: null, endMeasure: null });
    const api = apiRef.current;
    if (api) {
      api.playbackRange = null;
    }
    setLoopLabel('Loop: off');
  };

  return (
    <section className="viewer-shell">
      <div className="viewer-header">
        <div>
          <p className="eyebrow">Score preview</p>
          <h2>{label}</h2>
        </div>
        <div className={`status-pill status-${status}`}>
          {status === 'loading' ? 'Loading' : status === 'ready' ? 'Ready' : 'Waiting'}
        </div>
      </div>
      <div className="viewer-toolbar">
        <PlayerControls
          ready={status === 'ready' && playerReady}
          playing={playing}
          playbackSpeed={playbackSpeed}
          positionLabel={positionLabel}
          loopLabel={loopLabel}
          tracks={tracks}
          selectedTrackIndexes={selectedTrackIndexes}
          trackControls={trackControls}
          onPlayPause={handlePlayPause}
          onStop={handleStop}
          onSpeedChange={handleSpeedChange}
          onSetLoopStart={handleSetLoopStart}
          onSetLoopEnd={handleSetLoopEnd}
          onClearLoop={handleClearLoop}
          onShowAllTracks={onShowAllTracks}
          onSelectTrack={onSelectTrack}
          onToggleTrackMute={onToggleTrackMute}
          onToggleTrackSolo={onToggleTrackSolo}
          onChangeTrackVolume={onChangeTrackVolume}
        />
      </div>
      <div ref={viewportRef} className="score-canvas" aria-label="score render area">
        <div ref={hostRef} id="alphaTab" className="score-canvas__host" />
      </div>
    </section>
  );
}
