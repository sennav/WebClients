import type { MaybeNull } from '@proton/pass/types/utils';

import type { FieldHandle } from '../../form/field';
import type { DropdownApp } from './dropdown.app';
import { onCloseEffects, onFieldTabFactory } from './dropdown.utils';

describe('Dropdown utils', () => {
    describe('`onFieldTabFactory`', () => {
        let fieldElement: HTMLInputElement;
        let field: FieldHandle;

        const createDropdown = (visible: boolean) =>
            ({
                getState: () => ({ visible }),
                requestFocus: jest.fn(),
            }) as unknown as DropdownApp;

        const dispatchKeyDown = (element: Element, init?: Partial<KeyboardEvent> & { isComposing?: boolean }) => {
            const evt = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true, ...init });
            if (init?.isComposing) Object.defineProperty(evt, 'isComposing', { value: true });
            element.dispatchEvent(evt);
            return evt;
        };

        /** Mimics how `dropdown.handler.ts` wires the interceptor onto the field */
        const attachInterceptor = (dropdown: () => MaybeNull<DropdownApp>) => {
            const onFieldTab = onFieldTabFactory({ field, getDropdown: dropdown });
            fieldElement.addEventListener('keydown', onFieldTab, { capture: true });
            return onFieldTab;
        };

        beforeEach(() => {
            /** fresh element each test so no listener leaks between tests */
            document.body.innerHTML = '';
            fieldElement = document.createElement('input');
            field = { element: fieldElement } as unknown as FieldHandle;
            document.body.appendChild(fieldElement);
            fieldElement.focus();
        });

        test('should intercept plain Tab when dropdown visible and field active', () => {
            const dropdown = createDropdown(true);
            attachInterceptor(() => dropdown);

            const evt = dispatchKeyDown(fieldElement);

            expect(evt.defaultPrevented).toBe(true);
            expect(dropdown.requestFocus).toHaveBeenCalledWith({ firstItem: true });
        });

        test('should stop event propagation when intercepting', () => {
            const dropdown = createDropdown(true);
            attachInterceptor(() => dropdown);

            const propagation = jest.fn();
            document.addEventListener('keydown', propagation);

            const evt = dispatchKeyDown(fieldElement);

            expect(evt.defaultPrevented).toBe(true);
            expect(propagation).not.toHaveBeenCalled();

            document.removeEventListener('keydown', propagation);
        });

        test('should not intercept when dropdown is closed', () => {
            const dropdown = createDropdown(false);
            attachInterceptor(() => dropdown);

            const evt = dispatchKeyDown(fieldElement);

            expect(evt.defaultPrevented).toBe(false);
            expect(dropdown.requestFocus).not.toHaveBeenCalled();
        });

        test('should not intercept when dropdown is null', () => {
            attachInterceptor(() => null);

            const evt = dispatchKeyDown(fieldElement);

            expect(evt.defaultPrevented).toBe(false);
        });

        test('should not intercept Shift+Tab', () => {
            const dropdown = createDropdown(true);
            attachInterceptor(() => dropdown);

            const evt = dispatchKeyDown(fieldElement, { shiftKey: true });

            expect(evt.defaultPrevented).toBe(false);
            expect(dropdown.requestFocus).not.toHaveBeenCalled();
        });

        test('should not intercept Tab with modifier keys', () => {
            for (const modifier of ['altKey', 'ctrlKey', 'metaKey'] as const) {
                const dropdown = createDropdown(true);
                attachInterceptor(() => dropdown);

                const evt = dispatchKeyDown(fieldElement, { [modifier]: true });

                expect(evt.defaultPrevented).toBe(false);
                expect(dropdown.requestFocus).not.toHaveBeenCalled();
            }
        });

        test('should not intercept during IME composition', () => {
            const dropdown = createDropdown(true);
            attachInterceptor(() => dropdown);

            const evt = dispatchKeyDown(fieldElement, { isComposing: true });

            expect(evt.defaultPrevented).toBe(false);
            expect(dropdown.requestFocus).not.toHaveBeenCalled();
        });

        test('should not intercept non-Tab keys', () => {
            const dropdown = createDropdown(true);
            attachInterceptor(() => dropdown);

            const evt = dispatchKeyDown(fieldElement, { key: 'Escape' });

            expect(evt.defaultPrevented).toBe(false);
            expect(dropdown.requestFocus).not.toHaveBeenCalled();
        });

        test('should not intercept when field is not the active element', () => {
            const dropdown = createDropdown(true);
            attachInterceptor(() => dropdown);

            const other = document.createElement('input');
            document.body.appendChild(other);
            other.focus();

            const evt = dispatchKeyDown(fieldElement);

            expect(evt.defaultPrevented).toBe(false);
            expect(dropdown.requestFocus).not.toHaveBeenCalled();
        });

        test('should not intercept when field element is detached', () => {
            const dropdown = createDropdown(true);
            attachInterceptor(() => dropdown);

            fieldElement.remove();
            fieldElement.focus();
            const evt = dispatchKeyDown(fieldElement);

            expect(evt.defaultPrevented).toBe(false);
            expect(dropdown.requestFocus).not.toHaveBeenCalled();
        });

        test('should not intercept already-prevented events', () => {
            const dropdown = createDropdown(true);
            attachInterceptor(() => dropdown);

            const evt = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
            evt.preventDefault();
            fieldElement.dispatchEvent(evt);

            expect(dropdown.requestFocus).not.toHaveBeenCalled();
        });
    });

    describe('`onCloseEffects`', () => {
        test('should refocus field with `preventAction` when refocus is `silent`', async () => {
            const focus = jest.fn();
            const field = { element: document.createElement('input'), focus } as unknown as FieldHandle;

            onCloseEffects(field, { refocus: 'silent', userAction: true });
            await new Promise((resolve) => setTimeout(resolve, 1));

            expect(focus).toHaveBeenCalledWith({ preventAction: true });
        });

        test('should refocus field without `preventAction` when refocus is `true`', async () => {
            const focus = jest.fn();
            const field = { element: document.createElement('input'), focus } as unknown as FieldHandle;

            onCloseEffects(field, { refocus: true, userAction: true });
            await new Promise((resolve) => setTimeout(resolve, 1));

            expect(focus).toHaveBeenCalledWith({ preventAction: false });
        });

        test('should not refocus field when refocus disabled', async () => {
            const focus = jest.fn();
            const field = { element: document.createElement('input'), focus } as unknown as FieldHandle;

            onCloseEffects(field, { userAction: false });
            await new Promise((resolve) => setTimeout(resolve, 1));

            expect(focus).not.toHaveBeenCalled();
        });
    });
});
