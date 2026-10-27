import type { AriaRole, FC, ReactNode } from 'react';

import DropdownMenuButton from '@proton/components/components/dropdown/DropdownMenuButton';
import { SubTheme } from '@proton/pass/components/Layout/Theme/types';
import clsx from '@proton/utils/clsx';

import { ListItemIcon, type ListItemIconProps } from './ListItemIcon';

import './ListItem.scss';

const LIST_ITEM_HEIGHT = 3.75; /* rem */
export const LIST_MAX_VISIBLE_ITEMS = 3;
export const LIST_MAX_HEIGHT = LIST_MAX_VISIBLE_ITEMS * LIST_ITEM_HEIGHT;

type Props = {
    action?: ReactNode;
    autogrow?: boolean;
    className?: string;
    disabled?: boolean;
    fakeButton?: boolean;
    icon: ListItemIconProps;
    role?: AriaRole;
    subTheme?: SubTheme;
    subTitle: ReactNode;
    tabIndex?: number;
    title?: ReactNode;
    onClick?: () => void;
};

export const ListItem: FC<Props> = ({
    action,
    autogrow,
    className,
    disabled,
    fakeButton,
    icon,
    role,
    subTheme = SubTheme.VIOLET,
    subTitle,
    tabIndex,
    title,
    onClick,
}) => (
    <DropdownMenuButton
        className={clsx(
            'pass-injected-dropdown--item text-left',
            autogrow ? 'min-h-custom' : 'h-custom',
            fakeButton && 'pass-injected-dropdown--fake-button',
            subTheme,
            className
        )}
        style={autogrow ? { '--min-h-custom': `${LIST_ITEM_HEIGHT}rem` } : { '--h-custom': `${LIST_ITEM_HEIGHT}rem` }}
        onClick={onClick}
        disabled={disabled}
        role={role}
        tabIndex={tabIndex}
    >
        <div className="flex items-center gap-3">
            <ListItemIcon {...icon} />
            <div className="flex-1">
                {title && <span className="block text-ellipsis">{title}</span>}
                <span
                    className={clsx(
                        'pass-injected-dropdown--subtitle block color-weak text-sm',
                        !autogrow && 'text-ellipsis'
                    )}
                >
                    {subTitle}
                </span>
            </div>
            {action && <div>{action}</div>}
        </div>
    </DropdownMenuButton>
);
