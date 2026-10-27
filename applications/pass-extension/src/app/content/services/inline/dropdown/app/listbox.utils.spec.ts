import {
    DROPDOWN_FIRST_ITEM_TIMEOUT,
    DROPDOWN_OPTION_POLL,
    focusFirstOption,
    focusOptionIndex,
    getOptionElements,
    nextOptionIndex,
    onListboxFocusChange,
    onListboxKeydownFactory,
    syncRovingTabIndex,
} from './listbox.utils';

const appendOption = (text: string = 'option'): HTMLButtonElement => {
    const option = document.createElement('button');
    option.type = 'button';
    option.setAttribute('role', 'option');
    option.textContent = text;
    document.body.appendChild(option);
    return option;
};

const dispatch = (element: Element, key: string, init?: Partial<KeyboardEvent> & { isComposing?: boolean }) => {
    const evt = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    if (init?.isComposing) Object.defineProperty(evt, 'isComposing', { value: true });
    element.dispatchEvent(evt);
    return evt;
};

describe('Listbox utils', () => {
    /** jsdom does not implement `Element::scrollIntoView` */
    beforeAll(() => {
        Element.prototype.scrollIntoView = jest.fn();
    });

    beforeEach(() => {
        document.body.innerHTML = '';
    });

    describe('`nextOptionIndex`', () => {
        test('should navigate cyclically', () => {
            expect(nextOptionIndex(3, 0, 1)).toBe(1);
            expect(nextOptionIndex(3, 2, 1)).toBe(0);
            expect(nextOptionIndex(3, 0, -1)).toBe(2);
            expect(nextOptionIndex(3, 1, -1)).toBe(0);
        });

        test('should return -1 when there are no options', () => {
            expect(nextOptionIndex(0, 0, 1)).toBe(-1);
        });
    });

    describe('`syncRovingTabIndex`', () => {
        test('should mark only the active option as tab stop and selected', () => {
            const options = [appendOption(), appendOption(), appendOption()];

            syncRovingTabIndex(options, 1);

            expect(options[0].tabIndex).toBe(-1);
            expect(options[0].getAttribute('aria-selected')).toBeNull();
            expect(options[1].tabIndex).toBe(0);
            expect(options[1].getAttribute('aria-selected')).toBe('true');
            expect(options[2].tabIndex).toBe(-1);
        });
    });

    describe('`focusOptionIndex`', () => {
        test('should sync roving tabindex, focus and scroll option into view', () => {
            const options = [appendOption(), appendOption()];

            expect(focusOptionIndex(options, 1)).toBe(true);

            expect(document.activeElement).toBe(options[1]);
            expect(options[1].tabIndex).toBe(0);
            expect(options[1].getAttribute('aria-selected')).toBe('true');
            expect(options[0].tabIndex).toBe(-1);
            expect(options[1].scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
        });

        test('should return false for out-of-bounds index', () => {
            const options = [appendOption()];

            expect(focusOptionIndex(options, 42)).toBe(false);
            expect(document.activeElement).toBe(document.body);
        });
    });

    describe('`focusFirstOption`', () => {
        test('should poll for options and focus the first one once loaded', async () => {
            jest.useFakeTimers();

            const wait = focusFirstOption();

            /** simulate an async option load (e.g. port message resolving) */
            setTimeout(() => {
                appendOption();
                appendOption();
            }, DROPDOWN_OPTION_POLL * 2);

            await jest.advanceTimersByTimeAsync(DROPDOWN_OPTION_POLL * 2 + DROPDOWN_OPTION_POLL);
            await wait;

            const [first, second] = getOptionElements();
            expect(document.activeElement).toBe(first);
            expect(first?.tabIndex).toBe(0);
            expect(second?.tabIndex).toBe(-1);

            jest.useRealTimers();
        });

        test('should return false when no option loads within timeout', async () => {
            jest.useFakeTimers();

            const result = focusFirstOption();
            await jest.advanceTimersByTimeAsync(DROPDOWN_FIRST_ITEM_TIMEOUT + DROPDOWN_OPTION_POLL);

            await expect(result).resolves.toBe(false);

            jest.useRealTimers();
        });
    });

    describe('`onListboxKeydownFactory`', () => {
        /** the component attaches the responder on `document` in capture phase */
        const currentHandler: { fn?: (evt: KeyboardEvent) => void } = {};

        const setup = () => {
            const close = jest.fn();
            const handler = onListboxKeydownFactory({ close });
            currentHandler.fn = handler;
            document.addEventListener('keydown', handler, { capture: true });
            const options = [appendOption('a'), appendOption('b'), appendOption('c')];
            return { close, handler, options };
        };

        afterEach(() => {
            if (currentHandler.fn) document.removeEventListener('keydown', currentHandler.fn, { capture: true });
            currentHandler.fn = undefined;
        });

        test('Escape should close without default behaviour', () => {
            const { close, options } = setup();
            options[0].focus();

            const evt = dispatch(options[0], 'Escape');

            expect(evt.defaultPrevented).toBe(true);
            expect(close).toHaveBeenCalledTimes(1);
        });

        test('Tab should move focus to the next option without closing', () => {
            const { close, options } = setup();
            options[1].focus();

            const evt = dispatch(options[1], 'Tab');

            expect(evt.defaultPrevented).toBe(true);
            expect(document.activeElement).toBe(options[2]);
            expect(close).not.toHaveBeenCalled();
        });

        test('Tab on the last option should close and refocus the field', () => {
            const { close, options } = setup();
            options[2].focus();

            const evt = dispatch(options[2], 'Tab');

            expect(evt.defaultPrevented).toBe(true);
            expect(close).toHaveBeenCalledTimes(1);
        });

        test('Shift+Tab on the first option should close and refocus the field', () => {
            const { close, options } = setup();
            options[0].focus();

            const evt = dispatch(options[0], 'Tab', { shiftKey: true });

            expect(evt.defaultPrevented).toBe(true);
            expect(close).toHaveBeenCalledTimes(1);
        });

        test('Shift+Tab should move focus to the previous option', () => {
            const { close, options } = setup();
            options[2].focus();

            dispatch(options[2], 'Tab', { shiftKey: true });

            expect(document.activeElement).toBe(options[1]);
            expect(close).not.toHaveBeenCalled();
        });

        test('Tab from the iframe root should focus the first option', () => {
            const { close, options } = setup();

            const evt = dispatch(document.body, 'Tab');

            expect(evt.defaultPrevented).toBe(true);
            expect(document.activeElement).toBe(options[0]);
            expect(close).not.toHaveBeenCalled();
        });

        test('Escape should also close when iframe root has focus', () => {
            const { close } = setup();

            const evt = dispatch(document.body, 'Escape');

            expect(evt.defaultPrevented).toBe(true);
            expect(close).toHaveBeenCalledTimes(1);
        });

        test('ArrowDown should move focus forward and wrap around', () => {
            const { options } = setup();

            dispatch(document.body, 'ArrowDown');
            expect(document.activeElement).toBe(options[0]);

            dispatch(options[0], 'ArrowDown');
            expect(document.activeElement).toBe(options[1]);

            options[2].focus();
            dispatch(options[2], 'ArrowDown');
            expect(document.activeElement).toBe(options[0]);
        });

        test('ArrowUp should move focus backward and wrap around', () => {
            const { options } = setup();

            dispatch(document.body, 'ArrowUp');
            expect(document.activeElement).toBe(options[2]);

            dispatch(options[2], 'ArrowUp');
            expect(document.activeElement).toBe(options[1]);

            options[0].focus();
            dispatch(options[0], 'ArrowUp');
            expect(document.activeElement).toBe(options[2]);
        });

        test('Home and End should jump to first and last option', () => {
            const { options } = setup();
            options[1].focus();

            dispatch(options[1], 'End');
            expect(document.activeElement).toBe(options[2]);

            dispatch(options[2], 'Home');
            expect(document.activeElement).toBe(options[0]);
        });

        test('Enter should trigger the focused option click', () => {
            const { options } = setup();
            options[1].focus();
            const click = jest.spyOn(options[1], 'click');

            const evt = dispatch(options[1], 'Enter');

            expect(evt.defaultPrevented).toBe(true);
            expect(click).toHaveBeenCalledTimes(1);
        });

        test('Space should trigger the focused option click', () => {
            const { options } = setup();
            options[0].focus();
            const click = jest.spyOn(options[0], 'click');

            const evt = dispatch(options[0], ' ');

            expect(evt.defaultPrevented).toBe(true);
            expect(click).toHaveBeenCalledTimes(1);
        });

        test('should not intercept keys during IME composition', () => {
            const { close, options } = setup();
            options[0].focus();

            const evt = dispatch(options[0], 'Escape', { isComposing: true });

            expect(evt.defaultPrevented).toBe(false);
            expect(close).not.toHaveBeenCalled();
        });

        test('should not intercept keys with modifiers', () => {
            const { options } = setup();
            options[0].focus();

            const evt = dispatch(options[0], 'Enter', { ctrlKey: true });

            expect(evt.defaultPrevented).toBe(false);
        });

        test('should not intercept when an inner control has focus', () => {
            const { close } = setup();
            const control = document.createElement('button');
            control.type = 'button';
            document.body.appendChild(control);
            control.focus();

            const evt = dispatch(control, 'ArrowDown');

            expect(evt.defaultPrevented).toBe(false);
            expect(close).not.toHaveBeenCalled();
        });
    });

    describe('`onListboxFocusChange`', () => {
        test('should keep roving tabindex in sync when focus moves', () => {
            const options = [appendOption(), appendOption(), appendOption()];
            options[2].focus();

            onListboxFocusChange();

            expect(options[2].tabIndex).toBe(0);
            expect(options[2].getAttribute('aria-selected')).toBe('true');
            expect(options[0].tabIndex).toBe(-1);
        });

        test('should restore the first option as tab stop when focus leaves options', () => {
            const options = [appendOption(), appendOption()];
            options[1].focus();

            onListboxFocusChange();
            expect(options[1].tabIndex).toBe(0);

            options[1].blur();
            onListboxFocusChange();

            expect(options[0].tabIndex).toBe(0);
            expect(options[1].tabIndex).toBe(-1);
        });
    });

    describe('`getOptionElements`', () => {
        test('should only return elements with `role="option"`', () => {
            const option = appendOption();
            document.body.appendChild(document.createElement('button'));
            document.body.appendChild(document.createElement('div'));

            expect(getOptionElements()).toEqual([option]);
        });
    });
});
