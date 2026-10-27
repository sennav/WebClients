import type { MaybeNull } from '@proton/pass/types/utils';
import { waitUntil } from '@proton/pass/utils/fp/wait-until';

/** Maximum time to wait for asynchronously loaded dropdown options before
 * falling back to the default dropdown focus target. Candidate options are
 * queried over the port once the dropdown is visible, so the first option
 * may not be present in the DOM yet when the Tab focus hand-off occurs. */
export const DROPDOWN_FIRST_ITEM_TIMEOUT = 2_000;

/** Polling interval when waiting for dropdown options */
export const DROPDOWN_OPTION_POLL = 25;

export const OPTION_SELECTOR = '[role="option"]';

export const getOptionElements = (): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>(OPTION_SELECTOR));

export const isOptionElement = (el: MaybeNull<Element>): el is HTMLElement =>
    Boolean(el instanceof Element && el.matches(OPTION_SELECTOR));

/** Focus targets the dropdown falls back to when no option is present or
 * focus was reclaimed by the iframe root (e.g. locked-state views). */
const isFallbackFocusTarget = (el: MaybeNull<Element>): boolean =>
    el === null || el === document.body || el === document.documentElement;

/** Apply the roving tabindex pattern: the active option is the single tab
 * stop within the dropdown. React never controls these DOM properties, so
 * the imperative updates survive re-renders of the option elements. */
export const syncRovingTabIndex = (options: HTMLElement[], activeIndex: number): void => {
    options.forEach((option, index) => {
        const active = index === activeIndex;
        option.tabIndex = active ? 0 : -1;
        /** Selection follows focus in the dropdown listbox */
        if (active) option.setAttribute('aria-selected', 'true');
        else option.removeAttribute('aria-selected');
    });
};

/** Cyclic index navigation within the option list */
export const nextOptionIndex = (count: number, index: number, offset: number): number =>
    count === 0 ? -1 : (index + offset + count) % count;

/** Focus an option by index, maintaining the roving tabindex. Focus is moved
 * with `preventScroll` and the option is scrolled into view manually so
 * scrolling is only triggered when focus changes. */
export const focusOptionIndex = (options: HTMLElement[], index: number): boolean => {
    const option = options[index];
    if (!option) return false;

    syncRovingTabIndex(options, index);
    option.focus({ preventScroll: true });
    option.scrollIntoView({ block: 'nearest' });
    return true;
};

/** Wait for asynchronously resolved options to appear in the dropdown and
 * focus the first one. Returns whether an option was focused. */
export const focusFirstOption = async (): Promise<boolean> => {
    try {
        await waitUntil(() => getOptionElements().length > 0, DROPDOWN_OPTION_POLL, DROPDOWN_FIRST_ITEM_TIMEOUT);
    } catch {
        return false;
    }

    return focusOptionIndex(getOptionElements(), 0);
};

/** Keyboard responder for the dropdown listbox. Interception only applies in
 * "keyboard mode": the iframe's active element is either a listbox option or
 * the iframe root (fallback focus target). Interactions with inner controls
 * (e.g. the pause-suggestion dropdown) keep the browser's default behaviour.
 *
 * - ArrowDown/ArrowUp/Home/End: move focus between options (cyclically)
 * - Enter/Space: trigger the focused option
 * - Escape: dismiss the dropdown and refocus the anchored field
 * - Tab/Shift+Tab: move between options (no wrap). Reaching either end
 *   dismisses the dropdown and refocuses the anchored field so the host
 *   page's tab order resumes predictably. */
export const onListboxKeydownFactory =
    ({ close }: { close: () => void }) =>
    (evt: KeyboardEvent) => {
        if (evt.isComposing) return;
        if (evt.ctrlKey || evt.metaKey || evt.altKey) return;

        const active = document.activeElement;
        const activeIsOption = isOptionElement(active);
        if (!activeIsOption && !isFallbackFocusTarget(active)) return;

        switch (evt.key) {
            case 'Escape':
                evt.preventDefault();
                evt.stopPropagation();
                close();
                return;
            case 'Tab': {
                /** Tab walks the options in the pressed direction; reaching
                 * either boundary dismisses the dropdown and hands focus back
                 * to the anchored field, resuming the page's tab order. */
                const options = getOptionElements();
                const currentIndex = activeIsOption ? options.indexOf(active) : -1;
                const nextIndex = currentIndex + (evt.shiftKey ? -1 : 1);

                evt.preventDefault();
                evt.stopPropagation();

                if (nextIndex < 0 || nextIndex >= options.length) {
                    close();
                    return;
                }

                focusOptionIndex(options, nextIndex);
                return;
            }
        }

        const options = getOptionElements();
        if (options.length === 0) return;

        const currentIndex = activeIsOption ? options.indexOf(active) : -1;

        switch (evt.key) {
            case 'ArrowDown':
                evt.preventDefault();
                focusOptionIndex(options, currentIndex === -1 ? 0 : nextOptionIndex(options.length, currentIndex, 1));
                return;
            case 'ArrowUp':
                evt.preventDefault();
                focusOptionIndex(
                    options,
                    currentIndex === -1 ? options.length - 1 : nextOptionIndex(options.length, currentIndex, -1)
                );
                return;
            case 'Home':
                evt.preventDefault();
                focusOptionIndex(options, 0);
                return;
            case 'End':
                evt.preventDefault();
                focusOptionIndex(options, options.length - 1);
                return;
            case 'Enter':
            case ' ':
                if (!activeIsOption) return;
                /** prevent the native Space scroll (and duplicate Enter
                 * activation) and trigger the option with focus */
                evt.preventDefault();
                (active as HTMLElement).click();
                return;
        }
    };

/** Roving tabindex maintenance on focus changes within the dropdown */
export const onListboxFocusChange = (): void => {
    const options = getOptionElements();
    if (options.length === 0) return;

    const activeIndex = options.findIndex((option) => option === document.activeElement);
    syncRovingTabIndex(options, activeIndex === -1 ? 0 : activeIndex);
};
