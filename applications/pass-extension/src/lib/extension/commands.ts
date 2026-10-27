import browser from '@proton/pass/lib/globals/browser';
import noop from '@proton/utils/noop';

import { WorkerMessageType } from '../../types/messages';
import { backgroundMessage, sendTabMessage } from '../message/send-message';

export type Shortcut = { name: string; description: string; shortcut: string };

type BrowserCommand = Awaited<ReturnType<typeof browser.commands.getAll>>[number];

export const resolveShortcuts = (commands: BrowserCommand[], supported: Record<string, string>): Shortcut[] =>
    commands
        .filter((cmd): cmd is BrowserCommand & { name: string } => Boolean(cmd.name && cmd.name in supported))
        .map(({ name, shortcut }) => ({ name, shortcut: shortcut ?? '', description: supported[name] }));

export const handleExtensionCommand = async (command: string) => {
    if (command === 'open-larger-window') {
        await browser.tabs
            .create({
                url: browser.runtime.getURL('popup.html#'),
            })
            .catch(noop);
    }

    /* `autofill-best-match`: forwards the keyboard command to the active tab's
     * content scripts. Every frame of the tab receives the message; the frame
     * owning an eligible field resolves the best-matching login item and fills
     * it through the standard `AUTOFILL_ACTION` pipeline (see autofill.service) */
    if (command === 'autofill-best-match') {
        const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true }).catch(() => []);
        if (!tab?.id) return;
        await sendTabMessage(backgroundMessage({ type: WorkerMessageType.AUTOFILL_BEST_MATCH, payload: {} }), {
            tabId: tab.id,
        }).catch(noop);
    }
};
