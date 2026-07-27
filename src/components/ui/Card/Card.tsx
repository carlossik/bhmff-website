import React from 'react';

interface CardProps {
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
    actions?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({
                                       title,
                                       subtitle,
                                       children,
                                       className = '',
                                       actions,
                                   }) => {
    return (
        <div
            className={`
                rounded-2xl
                border
                border-slate-200
                bg-white
                shadow-sm
                hover:shadow-lg
                transition-all
                duration-300
                ${className}
            `}
        >
            {(title || subtitle || actions) && (
                <div className="flex items-start justify-between border-b border-slate-100 p-6">
                    <div>
                        {title && (
                            <h3 className="text-lg font-semibold text-slate-900">
                                {title}
                            </h3>
                        )}

                        {subtitle && (
                            <p className="mt-1 text-sm text-slate-500">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    {actions && (
                        <div>
                            {actions}
                        </div>
                    )}
                </div>
            )}

            <div className="p-6">
                {children}
            </div>
        </div>
    );
};

export default Card;