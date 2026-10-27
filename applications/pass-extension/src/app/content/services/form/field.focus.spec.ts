import { pickBestMatchField } from '../autofill/autofill.utils';
import { getLastFocusedField, trackFocusedField } from './field.focus.registry';

const createField = (): { element: HTMLInputElement; handle: any } => {
    const element = document.createElement('input');
    document.body.appendChild(element);
    return { element, handle: { element } as any };
};

describe('Autofill best match', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    describe('`field.focus.registry`', () => {
        test('should track the most recently focused field', () => {
            const a = createField();
            const b = createField();

            trackFocusedField(a.handle);
            expect(getLastFocusedField()).toBe(a.handle);

            trackFocusedField(b.handle);
            expect(getLastFocusedField()).toBe(b.handle);
        });

        test('should drop stale fields removed from the document', () => {
            const a = createField();

            trackFocusedField(a.handle);
            expect(getLastFocusedField()).toBe(a.handle);

            a.element.remove();
            expect(getLastFocusedField()).toBe(null);
        });
    });

    describe('`pickBestMatchField` priority', () => {
        test('should prefer the currently focused field', () => {
            const a = createField();
            const b = createField();
            const fields = [a.handle, b.handle];

            b.element.focus();

            expect(pickBestMatchField(fields, a.handle)).toBe(b.handle);
        });

        test('should fall back to the last focused field when nothing is focused', () => {
            const a = createField();
            const b = createField();
            const fields = [a.handle, b.handle];

            b.element.focus();
            b.element.blur();

            expect(pickBestMatchField(fields, a.handle)).toBe(a.handle);
            expect(pickBestMatchField([b.handle, a.handle], a.handle)).toBe(a.handle);
        });

        test('should fall back to the first field when there is no focus history', () => {
            const a = createField();

            expect(pickBestMatchField([a.handle], null)).toBe(a.handle);
        });
    });
});
