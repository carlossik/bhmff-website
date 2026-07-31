import React, { useState } from 'react';
import {
    User,
    Calendar,
    Award,
    ShieldCheck,
    ClipboardList,
    Star,
    CreditCard,
    Globe,
} from 'lucide-react';

import { Official } from '../../types/officialTypes';

import AvailabilityTab from './AvailabilityTab';
import QualificationsTab from './QualificationsTab';
import ComplianceTab from './ComplianceTab';
import AssignmentsTab from './AssignmentsTab';
import RatingsTab from './RatingsTab';
import PaymentsTab from './PaymentsTab';
import MarketplaceTab from './MarketplaceTab';

interface Props {
    official: Official;
}

type TabKey =
    | 'overview'
    | 'availability'
    | 'qualifications'
    | 'compliance'
    | 'assignments'
    | 'ratings'
    | 'payments'
    | 'marketplace';

const OfficialProfileTabs: React.FC<Props> = ({
                                                  official,
                                              }) => {
    const [activeTab, setActiveTab] =
        useState<TabKey>('overview');

    const tabs = [
        {
            key: 'overview',
            label: 'Overview',
            icon: User,
        },
        {
            key: 'availability',
            label: 'Availability',
            icon: Calendar,
        },
        {
            key: 'qualifications',
            label: 'Qualifications',
            icon: Award,
        },
        {
            key: 'compliance',
            label: 'Compliance',
            icon: ShieldCheck,
        },
        {
            key: 'assignments',
            label: 'Assignments',
            icon: ClipboardList,
        },
        {
            key: 'ratings',
            label: 'Ratings',
            icon: Star,
        },
        {
            key: 'payments',
            label: 'Payments',
            icon: CreditCard,
        },
        {
            key: 'marketplace',
            label: 'Marketplace',
            icon: Globe,
        },
    ] as const;

    const renderContent = () => {
        switch (activeTab) {
            case 'availability':
                return (
                    <AvailabilityTab
                        official={official}
                    />
                );

            case 'qualifications':
                return (
                    <QualificationsTab
                        official={official}
                    />
                );

            case 'compliance':
                return (
                    <ComplianceTab
                        official={official}
                    />
                );

            case 'assignments':
                return (
                    <AssignmentsTab
                        official={official}
                    />
                );

            case 'ratings':
                return (
                    <RatingsTab
                        official={official}
                    />
                );

            case 'payments':
                return (
                    <PaymentsTab
                        official={official}
                    />
                );

            case 'marketplace':
                return (
                    <MarketplaceTab
                        official={official}
                    />
                );

            default:
                return (
                    <div className="space-y-6">

                        <div className="rounded-xl border bg-white p-8">

                            <h2 className="mb-6 text-2xl font-bold">
                                Official Summary
                            </h2>

                            <div className="grid grid-cols-2 gap-6">

                                <div>

                                    <div className="text-sm text-slate-500">
                                        Name
                                    </div>

                                    <div className="font-semibold">
                                        {official.full_name}
                                    </div>

                                </div>

                                <div>

                                    <div className="text-sm text-slate-500">
                                        Role
                                    </div>

                                    <div className="font-semibold capitalize">
                                        {official.role.replace(/_/g, ' ')}
                                    </div>

                                </div>

                                <div>

                                    <div className="text-sm text-slate-500">
                                        Email
                                    </div>

                                    <div className="font-semibold">
                                        {official.email}
                                    </div>

                                </div>

                                <div>

                                    <div className="text-sm text-slate-500">
                                        Status
                                    </div>

                                    <div className="font-semibold capitalize">
                                        {official.status}
                                    </div>

                                </div>

                                <div>

                                    <div className="text-sm text-slate-500">
                                        Verification
                                    </div>

                                    <div className="font-semibold capitalize">
                                        {
                                            official.verification_status
                                        }
                                    </div>

                                </div>

                                <div>

                                    <div className="text-sm text-slate-500">
                                        Rating
                                    </div>

                                    <div className="font-semibold">
                                        {official.average_rating ??
                                            0}
                                        /10
                                    </div>

                                </div>

                                <div>

                                    <div className="text-sm text-slate-500">
                                        Completed Matches
                                    </div>

                                    <div className="font-semibold">
                                        {official.completed_matches ??
                                            0}
                                    </div>

                                </div>

                                <div>

                                    <div className="text-sm text-slate-500">
                                        Completed Tournaments
                                    </div>

                                    <div className="font-semibold">
                                        {official.completed_tournaments ??
                                            0}
                                    </div>

                                </div>

                            </div>

                        </div>

                        <div className="rounded-xl border bg-gradient-to-r from-lime-50 to-white p-8">

                            <h3 className="mb-3 text-lg font-bold">
                                TournamentHQ Enterprise Officials
                            </h3>

                            <p className="leading-7 text-slate-600">
                                This module forms the foundation
                                of the AI Officials Assignment
                                Engine. As TournamentHQ evolves,
                                officials will be automatically
                                matched to fixtures using
                                availability, qualifications,
                                compliance, workload, travel
                                distance, historical ratings,
                                conflicts of interest and
                                competition rules.
                            </p>

                        </div>

                    </div>
                );
        }
    };

    return (
        <div className="space-y-6">

            <div className="overflow-x-auto rounded-xl border bg-white">

                <div className="flex min-w-max">

                    {tabs.map((tab) => {
                        const Icon = tab.icon;

                        const active =
                            activeTab === tab.key;

                        return (
                            <button
                                key={tab.key}
                                onClick={() =>
                                    setActiveTab(
                                        tab.key as TabKey
                                    )
                                }
                                className={`flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-semibold transition ${
                                    active
                                        ? 'border-lime-500 bg-lime-50 text-lime-700'
                                        : 'border-transparent text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <Icon size={18} />

                                {tab.label}

                            </button>
                        );
                    })}

                </div>

            </div>

            {renderContent()}

        </div>
    );
};

export default OfficialProfileTabs;