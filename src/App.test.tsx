import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { createAnnotationBundle } from './lib/annotationTransfer';
import { hashFile } from './lib/fileHash';

vi.mock('./components/ScoreViewer', () => ({
  ScoreViewer: ({ onScoreLoaded, onRenderReady, onMeasureClick, onPlayerMeasureChange }: any) => (
    <div data-testid="score-viewer">
      <button
        type="button"
        onClick={() => {
          onScoreLoaded({ measureCount: 8, title: 'Mock Song', artist: 'Mock Artist' });
          onRenderReady?.();
        }}
      >
        Load mock score
      </button>
      <button type="button" onClick={() => onMeasureClick?.(3)}>
        Select measure 3
      </button>
      <button type="button" onClick={() => onPlayerMeasureChange?.(4)}>
        Player measure 4
      </button>
    </div>
  ),
}));

describe('App integration', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const objectUrlSpy = vi.fn(() => 'blob:mock');
  const revokeSpy = vi.fn();
  const clickSpy = vi.fn();
  const inputClickSpy = vi.fn();

  beforeEach(() => {
    URL.createObjectURL = objectUrlSpy;
    URL.revokeObjectURL = revokeSpy;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(clickSpy);
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(inputClickSpy);
    objectUrlSpy.mockClear();
    revokeSpy.mockClear();
    clickSpy.mockClear();
    inputClickSpy.mockClear();
    localStorage.clear();
  });

  it('loads a score, creates annotations, exports and imports bundles', async () => {
    const source = new File(['mock score'], 'mock.gp5', { type: 'application/octet-stream' });
    const sourceHash = await hashFile(source);

    render(<App />);

    const scoreInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    fireEvent.change(scoreInput, { target: { files: [source] } });

    await waitFor(() => expect(screen.getByRole('button', { name: /Export Notes/i })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: /Load mock score/i }));
    expect(screen.getByText('Score ready: mock.gp5')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /Select measure 3/i }));

    const textbox = screen.getByRole('textbox');
    fireEvent.change(textbox, { target: { value: 'Practice slowly' } });
    fireEvent.click(screen.getByRole('button', { name: /Add note/i }));

    expect(screen.getByText('Practice slowly')).toBeInTheDocument();
    expect(screen.getByText('Measure 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Export Notes/i }));
    expect(objectUrlSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalled();

    const importInput = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;
    const imported = createAnnotationBundle(sourceHash, [
      {
        id: 'a2',
        scoreHash: sourceHash,
        measureIndex: 5,
        content: 'Imported note',
        createdAt: '2026-04-18T00:00:00.000Z',
        updatedAt: '2026-04-18T00:00:00.000Z',
      },
    ]);
    const bundleFile = new File([JSON.stringify(imported)], 'mock.annotations.json', {
      type: 'application/json',
    });

    fireEvent.change(importInput, { target: { files: [bundleFile] } });

    await waitFor(() => expect(screen.getByText('Imported note')).toBeInTheDocument());
  });

  it('opens the score file picker from a keyboard shortcut', () => {
    render(<App />);

    fireEvent.keyDown(window, { key: 'o', ctrlKey: true });

    expect(inputClickSpy).toHaveBeenCalled();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });
});
