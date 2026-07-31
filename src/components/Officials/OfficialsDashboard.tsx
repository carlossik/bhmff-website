import React from 'react';
import {
    Users,
    UserCheck,
    CalendarDays,
    ShieldAlert,
    ClipboardList,
    Wallet,
    Star,
    AlertTriangle,
    Trophy,
    CheckCircle,
} from 'lucide-react';

import { OfficialDashboardStats } from '../../types/officialTypes';

interface Props {
    stats: OfficialDashboardStats;
}

interface CardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    colour: string;
}

const DashboardCard: React.FC<CardProps> = ({
                                                title,
                                                value,
                                                icon,
                                                colour,
                                            }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">

        <div className="flex items-center justify-between">

            <div>

                <p className="text-sm text-slate-500">
                    {title}
                </p>

                <h2 className="mt-2 text-3xl font-bold text-slate-900">
                    {value}
                </h2>

            </div>

            <div
                className={`flex h-14 w-14 items-center justify-center rounded-xl ${colour}`}
            >
                {icon}
            </div>

        </div>

    </div>
);

const OfficialsDashboard: React.FC<Props> = ({ stats }) => {
    return (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">

            <DashboardCard
                title="Total Officials"
                value={stats.totalOfficials}
                icon={<Users className="text-white" size={26} />}
                colour="bg-blue-600"
            />

            <DashboardCard
                title="Available"
                value={stats.availableOfficials}
                icon={<UserCheck className="text-white" size={26} />}
                colour="bg-green-600"
            />

            <DashboardCard
                title="Assignments Today"
                value={stats.assignmentsToday}
                icon={<CalendarDays className="text-white" size={26} />}
                colour="bg-purple-600"
            />

            <DashboardCard
                title="Pending Verification"
                value={stats.pendingVerification}
                icon={<ShieldAlert className="text-white" size={26} />}
                colour="bg-amber-500"
            />

            <DashboardCard
                title="Expiring Compliance"
                value={stats.expiringCompliance}
                icon={<AlertTriangle className="text-white" size={26} />}
                colour="bg-red-600"
            />

            <DashboardCard
                title="Assignments This Week"
                value={stats.assignmentsThisWeek}
                icon={<ClipboardList className="text-white" size={26} />}
                colour="bg-cyan-600"
            />

            <DashboardCard
                title="Payments Pending"
                value={stats.paymentsPending}
                icon={<Wallet className="text-white" size={26} />}
                colour="bg-orange-600"
            />

            <DashboardCard
                title="Average Rating"
                value={stats.averageRating.toFixed(1)}
                icon={<Star className="text-white" size={26} />}
                colour="bg-yellow-500"
            />

            <DashboardCard
                title="Active Officials"
                value={stats.activeOfficials}
                icon={<CheckCircle className="text-white" size={26} />}
                colour="bg-emerald-600"
            />

            <DashboardCard
                title="Suspended"
                value={stats.suspendedOfficials}
                icon={<Trophy className="text-white" size={26} />}
                colour="bg-slate-700"
            />

        </div>
    );
};

export default OfficialsDashboard;