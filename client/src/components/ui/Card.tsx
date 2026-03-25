import React from 'react';
import { cn } from '../../lib/utils';

export const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
    return (
        <div
            className={cn(
                'rounded-2xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark shadow-sm',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};
