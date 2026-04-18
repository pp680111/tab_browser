import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Annotation } from '../types';
import { AnnotationBubble } from './AnnotationBubble';

const annotation: Annotation = {
  id: 'a1',
  scoreHash: 'hash',
  measureIndex: 3,
  content: 'This is a very long annotation for the current measure.',
  createdAt: '2026-04-18T00:00:00.000Z',
  updatedAt: '2026-04-18T00:00:00.000Z',
};

describe('AnnotationBubble', () => {
  it('renders a truncated summary and clicks through', () => {
    const onClick = vi.fn();
    render(<AnnotationBubble annotation={annotation} left={20} top={12} onClick={onClick} />);

    expect(screen.getByRole('button')).toHaveTextContent('M3');
    expect(screen.getByRole('button')).toHaveTextContent('This is a very long anno...');

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

