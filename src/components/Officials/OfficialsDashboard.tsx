import type { ElementType } from 'react'
import { Activity, AlertTriangle, CalendarDays, Clock3, CreditCard, ShieldCheck, Star, UserCheck, UserX, Users } from 'lucide-react'
import type { OfficialDashboardStats } from '../../types/officialTypes'

type OfficialsDashboardProps = { stats: OfficialDashboardStats }
type MetricProps = { label: string; value: string | number; icon: ElementType; state?: 'default' | 'warning' | 'danger' }

function Metric({ label, value, icon: Icon, state = 'default' }: MetricProps) {
    const iconClasses = state === 'danger'
        ? 'border-red-700/50 bg-red-950/20 text-red-300'
        : state === 'warning'
          ? 'border-amber-700/50 bg-amber-950/20 text-amber-300'
          : 'border-[var(--organisation-border)] bg-[var(--organisation-background)] text-[var(--organisation-accent)]'

    return (
        <article className="rounded-2xl border border-[var(--organisation-border)] bg-[var(--organisation-surface)] p-5 text-[var(--organisation-text)] shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
                    <p className="mt-3 text-2xl font-bold">{value}</p>
                </div>
                <div className={`rounded-xl border p-2.5 ${iconClasses}`}><Icon className="h-5 w-5" /></div>
            </div>
        </article>
    )
}

export default function OfficialsDashboard({ stats }: OfficialsDashboardProps) {
    return (
        <section className="space-y-4">
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--organisation-accent)]">Official operations</p>
                <h2 className="mt-1 text-xl font-bold text-[var(--organisation-text)]">Officials overview</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <Metric label="Total Officials" value={stats.totalOfficials} icon={Users} />
                <Metric label="Active Officials" value={stats.activeOfficials} icon={Activity} />
                <Metric label="Available Officials" value={stats.availableOfficials} icon={UserCheck} />
                <Metric label="Assignments Today" value={stats.assignmentsToday} icon={CalendarDays} />
                <Metric label="Assignments This Week" value={stats.assignmentsThisWeek} icon={Clock3} />
                <Metric label="Pending Verification" value={stats.pendingVerification} icon={ShieldCheck} state="warning" />
                <Metric label="Expiring Compliance" value={stats.expiringCompliance} icon={AlertTriangle} state="danger" />
                <Metric label="Suspended Officials" value={stats.suspendedOfficials} icon={UserX} state="warning" />
                <Metric label="Payments Pending" value={stats.paymentsPending} icon={CreditCard} state="warning" />
                <Metric label="Average Rating" value={stats.averageRating.toFixed(1)} icon={Star} />
            </div>
        </section>
    )
}
