import type { FieldHandle } from './field';

/** Tracks the most recently focused field of this frame for
 * the "autofill best match" keyboard command. Module-level
 * state is safe here: every browsing context (frame) runs its
 * own isolated copy of the content-script bundle. */
let lastFocused: FieldHandle | null = null;

export const trackFocusedField = (field: FieldHandle): FieldHandle => {
    lastFocused = field;
    return field;
};

/** Returns the most recently focused field of this frame, skipping
 * stale handles whose element was removed from the document. */
export const getLastFocusedField = (): FieldHandle | null => {
    if (lastFocused && !lastFocused.element.isConnected) lastFocused = null;
    return lastFocused;
};
