import React from 'react';
import {
    Activity,
    AlertTriangle,
    Calendar,
    CreditCard,
    ShieldCheck,
    Star,
    Trophy,
    UserCheck,
    UserX,
    Users,
} from 'lucide-react';

import { OfficialDashboardStats } from '../../types/officialTypes';

interface Props {
    stats: OfficialDashboardStats | null;
    loading?: boolean;
    sportName?: string | null;
}

interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ElementType;
    accentClass: string;
}

const StatCard: React.FC<StatCardProps> = ({
                                               title,
                                               value,
                                               icon: Icon,
                                               accentClass,
                                           }) => (
    <article className="group relative overflow-hidden rounded-2xl border border-lime-900/50 bg-[#10190f] p-5 shadow-xl shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:border-lime-600/70 hover:shadow-lime-950/30">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime-400/50 to-transparent opacity-0 transition group-hover:opacity-100" />

        <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-400">
                    {title}
                </p>

                <p className="mt-4 text-4xl font-black tracking-tight text-white">
                    {value}
                </p>
            </div>

            <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 shadow-lg ${accentClass}`}
            >
                <Icon
                    size={23}
                    strokeWidth={2}
                    className="text-white"
                    aria-hidden="true"
                />
            </div>
        </div>

        <div className="mt-5 h-1 overflow-hidden rounded-full bg-black/30">
            <div className="h-full w-1/3 rounded-full bg-lime-400/70 transition-all duration-300 group-hover:w-2/3" />
        </div>
    </article>
);

const OfficialStatsCards: React.FC<Props> = ({
                                                 stats,
                                                 loading = false,
                                                 sportName = null,
                                             }) => {
    if (loading) {
        return (
            <section
                aria-label="Loading official statistics"
                className="space-y-4"
            >
                <div>
                    <div className="h-4 w-40 animate-pulse rounded bg-lime-900/50" />
                    <div className="mt-2 h-7 w-72 animate-pulse rounded bg-lime-900/40" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    {Array.from({ length: 10 }).map((_, index) => (
                        <div
                            key={index}
                            className="h-36 animate-pulse rounded-2xl border border-lime-900/40 bg-[#10190f]"
                        />
                    ))}
                </div>
            </section>
        );
    }

    const heading = sportName
        ? `${sportName} Officials Overview`
        : 'Sports Officials Overview';

    return (
        <section className="space-y-4">
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-400">
                    Official Operations
                </p>

                <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                    {heading}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                    Live operational status for officials, assignments,
                    compliance and payments.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard
                    title="Total Officials"
                    value={stats?.totalOfficials ?? 0}
                    icon={Users}
                    accentClass="bg-gradient-to-br from-blue-500 to-indigo-700"
                />

                <StatCard
                    title="Available Officials"
                    value={stats?.availableOfficials ?? 0}
                    icon={UserCheck}
                    accentClass="bg-gradient-to-br from-emerald-500 to-green-700"
                />

                <StatCard
                    title="Assignments Today"
                    value={stats?.assignmentsToday ?? 0}
                    icon={Calendar}
                    accentClass="bg-gradient-to-br from-violet-500 to-purple-700"
                />

                <StatCard
                    title="Pending Verification"
                    value={stats?.pendingVerification ?? 0}
                    icon={ShieldCheck}
                    accentClass="bg-gradient-to-br from-amber-400 to-orange-600"
                />

                <StatCard
                    title="Expiring Compliance"
                    value={stats?.expiringCompliance ?? 0}
                    icon={AlertTriangle}
                    accentClass="bg-gradient-to-br from-rose-500 to-red-700"
                />

                <StatCard
                    title="Average Rating"
                    value={stats?.averageRating?.toFixed(1) ?? '0.0'}
                    icon={Star}
                    accentClass="bg-gradient-to-br from-yellow-400 to-amber-600"
                />

                <StatCard
                    title="Payments Pending"
                    value={stats?.paymentsPending ?? 0}
                    icon={CreditCard}
                    accentClass="bg-gradient-to-br from-indigo-500 to-violet-700"
                />

                <StatCard
                    title="Assignments This Week"
                    value={stats?.assignmentsThisWeek ?? 0}
                    icon={Trophy}
                    accentClass="bg-gradient-to-br from-cyan-500 to-sky-700"
                />

                <StatCard
                    title="Suspended Officials"
                    value={stats?.suspendedOfficials ?? 0}
                    icon={UserX}
                    accentClass="bg-gradient-to-br from-orange-500 to-red-600"
                />

                <StatCard
                    title="Active Officials"
                    value={stats?.activeOfficials ?? 0}
                    icon={Activity}
                    accentClass="bg-gradient-to-br from-lime-400 to-green-700"
                />
            </div>
        </section>
    );
};

export default OfficialStatsCards;