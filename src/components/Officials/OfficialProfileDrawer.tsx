import React from 'react';
import {
    X,
    Mail,
    Phone,
    MapPin,
    Globe,
    Star,
    ShieldCheck,
    CalendarDays,
    Briefcase,
    Trophy,
    UserCheck,
    ClipboardCheck,
} from 'lucide-react';

import { Official } from '../../types/officialTypes';

interface Props {
    open: boolean;
    official: Official | null;
    onClose: () => void;
}

const badge = (status: string) => {
    switch (status) {
        case 'active':
            return 'bg-green-100 text-green-700';
        case 'inactive':
            return 'bg-slate-100 text-slate-700';
        case 'pending':
            return 'bg-amber-100 text-amber-700';
        case 'suspended':
            return 'bg-red-100 text-red-700';
        default:
            return 'bg-slate-100 text-slate-700';
    }
};

const OfficialProfileDrawer: React.FC<Props> = ({
                                                    open,
                                                    official,
                                                    onClose,
                                                }) => {
    if (!open || !official) return null;

    return (
        <>

            <div
                className="fixed inset-0 z-40 bg-black/40"
                onClick={onClose}
            />

            <div className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-xl flex-col bg-white shadow-2xl">

                <div className="flex items-center justify-between border-b px-6 py-5">

                    <div>

                        <h2 className="text-2xl font-bold">
                            Official Profile
                        </h2>

                        <p className="text-sm text-slate-500">
                            Sports Official Details
                        </p>

                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 hover:bg-slate-100"
                    >
                        <X size={22} />
                    </button>

                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    <div className="flex items-center gap-5">

                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-lime-600 text-3xl font-bold text-white">

                            {official.first_name[0]}
                            {official.last_name[0]}

                        </div>

                        <div>

                            <h1 className="text-2xl font-bold">
                                {official.full_name}
                            </h1>

                            <p className="capitalize text-slate-500">
                                {official.role.replace(/_/g, ' ')}
                            </p>

                            <span
                                className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-semibold ${badge(
                                    official.status
                                )}`}
                            >
                                {official.status}
                            </span>

                        </div>

                    </div>

                    <div className="grid gap-4">

                        <div className="flex items-center gap-3">

                            <Mail size={18} />

                            {official.email}

                        </div>

                        <div className="flex items-center gap-3">

                            <Phone size={18} />

                            {official.phone || '-'}

                        </div>

                        <div className="flex items-center gap-3">

                            <MapPin size={18} />

                            {[official.city, official.county]
                                .filter(Boolean)
                                .join(', ') || '-'}

                        </div>

                        <div className="flex items-center gap-3">

                            <Globe size={18} />

                            {official.nationality || '-'}

                        </div>

                    </div>

                    <div className="grid grid-cols-2 gap-4">

                        <div className="rounded-xl border p-5">

                            <Star className="mb-3 text-yellow-500" />

                            <p className="text-sm text-slate-500">
                                Average Rating
                            </p>

                            <h2 className="text-3xl font-bold">
                                {official.average_rating
                                    ? official.average_rating.toFixed(
                                        1
                                    )
                                    : '-'}
                            </h2>

                        </div>

                        <div className="rounded-xl border p-5">

                            <Trophy className="mb-3 text-blue-600" />

                            <p className="text-sm text-slate-500">
                                Matches
                            </p>

                            <h2 className="text-3xl font-bold">
                                {official.completed_matches ??
                                    0}
                            </h2>

                        </div>

                        <div className="rounded-xl border p-5">

                            <ShieldCheck className="mb-3 text-green-600" />

                            <p className="text-sm text-slate-500">
                                Verification
                            </p>

                            <h2 className="text-lg font-semibold capitalize">
                                {
                                    official.verification_status
                                }
                            </h2>

                        </div>

                        <div className="rounded-xl border p-5">

                            <CalendarDays className="mb-3 text-purple-600" />

                            <p className="text-sm text-slate-500">
                                Assignments
                            </p>

                            <h2 className="text-3xl font-bold">
                                {
                                    official.completed_tournaments
                                }
                            </h2>

                        </div>

                    </div>

                    <div className="rounded-xl border p-6">

                        <div className="mb-4 flex items-center gap-2">

                            <Briefcase size={18} />

                            <h3 className="font-semibold">
                                Biography
                            </h3>

                        </div>

                        <p className="text-sm leading-7 text-slate-600">

                            {official.biography ||
                                'No biography available.'}

                        </p>

                    </div>

                    <div className="grid gap-4">

                        <button className="flex items-center justify-center gap-2 rounded-xl bg-lime-600 px-5 py-3 font-semibold text-white">

                            <ClipboardCheck size={18} />

                            Qualifications

                        </button>

                        <button className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">

                            <CalendarDays size={18} />

                            Availability

                        </button>

                        <button className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white">

                            <UserCheck size={18} />

                            Assign Official

                        </button>

                    </div>

                </div>

            </div>

        </>
    );
};

export default OfficialProfileDrawer;