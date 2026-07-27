import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: number | string;
    icon: LucideIcon;
    colour?: string;
    subtitle?: string;
}

export default function MetricCard({
                                       title,
                                       value,
                                       icon: Icon,
                                       colour = 'text-lime-400',
                                       subtitle,
                                   }: MetricCardProps) {
    return (
        <div className="rounded-2xl border border-lime-900/40 bg-[#162012] p-6 transition-all duration-300 hover:border-lime-500 hover:shadow-xl hover:shadow-lime-900/20">
            <div className="mb-5 flex items-center justify-between">
                <Icon className={`h-8 w-8 ${colour}`} />

                <span className="text-4xl font-bold text-white">
                    {value}
                </span>
            </div>

            <h3 className="text-lg font-semibold text-white">
                {title}
            </h3>

            {subtitle && (
                <p className="mt-2 text-sm text-slate-400">
                    {subtitle}
                </p>
            )}
        </div>
    );
}