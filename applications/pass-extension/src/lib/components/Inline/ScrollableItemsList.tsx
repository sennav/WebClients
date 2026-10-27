import type { FC, PropsWithChildren } from 'react';

import { Scroll } from '@proton/atoms/Scroll/Scroll';
import DropdownMenu from '@proton/components/components/dropdown/DropdownMenu';
import clsx from '@proton/utils/clsx';

import { LIST_MAX_HEIGHT, LIST_MAX_VISIBLE_ITEMS } from './ListItem';

import './ScrollableItemsList.scss';

type Props = PropsWithChildren<{ increaseSurface?: boolean; listbox?: boolean }>;

export const ScrollableItemsList: FC<Props> = ({ children, increaseSurface, listbox }) => {
    const className = clsx(
        'pass-scrollable-items-list',
        increaseSurface && 'pass-scrollable-items-list--increase-surface'
    );

    const items = (
        <div className="max-h-custom overflow-hidden" style={{ '--max-h-custom': `${LIST_MAX_HEIGHT}rem` }}>
            <Scroll
                {...(Array.isArray(children) && children.length >= LIST_MAX_VISIBLE_ITEMS
                    ? { style: { height: `${LIST_MAX_HEIGHT}rem` } }
                    : {})}
            >
                {children}
            </Scroll>
        </div>
    );

    /** The listbox variant ditches the `DropdownMenu` wrapper elements
     * (`ul > li.dropdown-item`) so that `role="option"` children are
     * directly owned by the `role="listbox"` container, as required by
     * the ARIA pattern. The wrapper `li`s carry no styling in the
     * extension context so both variants render identically. */
    return listbox ? (
        <div className={clsx('unstyled my-0', className)} role="listbox">
            {items}
        </div>
    ) : (
        <DropdownMenu className={className}>{items}</DropdownMenu>
    );
};
