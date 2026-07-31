import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    AlertCircle,
    Banknote,
    Plus,
    Save,
} from 'lucide-react';

import {
    CreatePaymentInput,
    officialService,
    UpdatePaymentInput,
} from '../../services/officialService';
import {
    Official,
    OfficialPayment,
    PaymentStatus,
} from '../../types/officialTypes';

interface Props {
    official: Official;
}

type PaymentField =
    | 'assignment_id'
    | 'fixture_id'
    | 'payment_status'
    | 'match_fee'
    | 'travel_expenses'
    | 'accommodation_expenses'
    | 'bonus_amount'
    | 'deductions'
    | 'payment_reference'
    | 'payment_date';

const DRAFT_ID_PREFIX = 'draft-';

const isDraftPayment = (
    payment: OfficialPayment
): boolean => payment.id.startsWith(DRAFT_ID_PREFIX);

const toNullableString = (
    value: string
): string | null => {
    const trimmedValue = value.trim();

    return trimmedValue.length > 0
        ? trimmedValue
        : null;
};

const toCurrencyNumber = (
    value: string
): number => {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue)
        ? Math.max(0, parsedValue)
        : 0;
};

const calculateTotal = (
    payment: Pick<
        OfficialPayment,
        | 'match_fee'
        | 'travel_expenses'
        | 'accommodation_expenses'
        | 'bonus_amount'
        | 'deductions'
    >
): number =>
    Number(payment.match_fee || 0) +
    Number(payment.travel_expenses || 0) +
    Number(payment.accommodation_expenses || 0) +
    Number(payment.bonus_amount || 0) -
    Number(payment.deductions || 0);

const createDraftPayment = (
    official: Official
): OfficialPayment => {
    const now = new Date().toISOString();

    return {
        id: `${DRAFT_ID_PREFIX}${crypto.randomUUID()}`,
        organisation_id: official.organisation_id,
        official_id: official.id,
        assignment_id: null,
        fixture_id: null,
        payment_status: 'pending',
        match_fee: 0,
        travel_expenses: 0,
        accommodation_expenses: 0,
        bonus_amount: 0,
        deductions: 0,
        total_amount: 0,
        payment_reference: null,
        payment_date: null,
        created_at: now,
        updated_at: now,
    };
};

const PaymentsTab: React.FC<Props> = ({
                                          official,
                                      }) => {
    const [payments, setPayments] = useState<
        OfficialPayment[]
    >([]);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const [successMessage, setSuccessMessage] =
        useState<string | null>(null);

    const loadPayments =
        useCallback(async (): Promise<void> => {
            try {
                setLoading(true);
                setError(null);

                const data =
                    await officialService.getPayments(
                        official.organisation_id,
                        official.id
                    );

                setPayments(data);
            } catch (loadError) {
                console.error(
                    'Failed to load official payments:',
                    loadError
                );

                setError(
                    loadError instanceof Error
                        ? loadError.message
                        : 'Unable to load payments.'
                );
            } finally {
                setLoading(false);
            }
        }, [
            official.id,
            official.organisation_id,
        ]);

    useEffect(() => {
        void loadPayments();
    }, [loadPayments]);

    const grandTotal = useMemo(
        () =>
            payments.reduce(
                (total, payment) =>
                    total +
                    calculateTotal(payment),
                0
            ),
        [payments]
    );

    const addPayment = (): void => {
        setError(null);
        setSuccessMessage(null);

        setPayments(current => [
            ...current,
            createDraftPayment(official),
        ]);
    };
    const updatePayment = <
        K extends PaymentField
    >(
        index: number,
        field: K,
        value: OfficialPayment[K]
    ): void => {
        setPayments(current => {
            const updated = [...current];

            const payment = {
                ...updated[index],
                [field]: value,
            };

            payment.total_amount =
                calculateTotal(payment);

            updated[index] = payment;

            return updated;
        });

        setSuccessMessage(null);
    };

    const savePayments =
        async (): Promise<void> => {
            try {
                setSaving(true);
                setError(null);
                setSuccessMessage(null);

                for (const payment of payments) {
                    const totalAmount =
                        calculateTotal(payment);

                    if (isDraftPayment(payment)) {
                        const payload:
                            CreatePaymentInput = {
                            organisation_id:
                            payment.organisation_id,
                            official_id:
                            payment.official_id,
                            assignment_id:
                            payment.assignment_id,
                            fixture_id:
                            payment.fixture_id,
                            payment_status:
                            payment.payment_status,
                            match_fee:
                            payment.match_fee,
                            travel_expenses:
                            payment.travel_expenses,
                            accommodation_expenses:
                            payment.accommodation_expenses,
                            bonus_amount:
                            payment.bonus_amount,
                            deductions:
                            payment.deductions,
                            total_amount:
                            totalAmount,
                            payment_reference:
                            payment.payment_reference,
                            payment_date:
                            payment.payment_date,
                        };

                        await officialService.createPayment(
                            payload
                        );
                    } else {
                        const updates:
                            UpdatePaymentInput = {
                            assignment_id:
                            payment.assignment_id,
                            fixture_id:
                            payment.fixture_id,
                            payment_status:
                            payment.payment_status,
                            match_fee:
                            payment.match_fee,
                            travel_expenses:
                            payment.travel_expenses,
                            accommodation_expenses:
                            payment.accommodation_expenses,
                            bonus_amount:
                            payment.bonus_amount,
                            deductions:
                            payment.deductions,
                            total_amount:
                            totalAmount,
                            payment_reference:
                            payment.payment_reference,
                            payment_date:
                            payment.payment_date,
                        };

                        await officialService.updatePayment(
                            payment.id,
                            updates
                        );
                    }
                }

                await loadPayments();

                setSuccessMessage(
                    'Payments saved successfully.'
                );
            } catch (saveError) {
                console.error(
                    'Failed to save official payments:',
                    saveError
                );

                setError(
                    saveError instanceof Error
                        ? saveError.message
                        : 'Unable to save payments.'
                );
            } finally {
                setSaving(false);
            }
        };

    if (loading) {
        return (
            <div className="rounded-xl bg-white p-10 text-center text-slate-500">
                Loading payments...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                    <AlertCircle size={18} />

                    <span>{error}</span>
                </div>
            )}

            {successMessage && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
                    {successMessage}
                </div>
            )}

            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                        <Banknote size={22} />
                        Payments
                    </h2>

                    <p className="text-sm text-slate-500">
                        Manage fees, expenses, deductions and payment status.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={addPayment}
                    className="flex items-center gap-2 rounded-lg bg-lime-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-lime-700"
                >
                    <Plus size={16} />
                    New Payment
                </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border bg-white p-4">
                    <div className="text-sm text-slate-500">
                        Payment Records
                    </div>

                    <div className="mt-1 text-2xl font-bold text-slate-900">
                        {payments.length}
                    </div>
                </div>

                <div className="rounded-xl border bg-white p-4">
                    <div className="text-sm text-slate-500">
                        Pending Payments
                    </div>

                    <div className="mt-1 text-2xl font-bold text-slate-900">
                        {
                            payments.filter(
                                payment =>
                                    payment.payment_status ===
                                    'pending'
                            ).length
                        }
                    </div>
                </div>

                <div className="rounded-xl border bg-white p-4">
                    <div className="text-sm text-slate-500">
                        Total Value
                    </div>

                    <div className="mt-1 text-2xl font-bold text-slate-900">
                        £{grandTotal.toFixed(2)}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border bg-white">
                <table className="min-w-[1200px] w-full">
                    <thead className="bg-slate-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Match Fee
                        </th>

                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Travel
                        </th>

                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Accommodation
                        </th>

                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Bonus
                        </th>

                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Deductions
                        </th>

                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Total
                        </th>

                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Status
                        </th>

                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Reference
                        </th>

                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                            Payment Date
                        </th>
                    </tr>
                    </thead>

                    <tbody>
                    {payments.length === 0 ? (
                        <tr>
                            <td
                                colSpan={9}
                                className="px-6 py-12 text-center text-sm text-slate-500"
                            >
                                No payment records have been created for this official.
                            </td>
                        </tr>
                    ) : (
                        payments.map((payment, index) => (
                            <tr
                                key={payment.id}
                                className="border-t align-top"
                            >
                                <td className="p-3">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={payment.match_fee}
                                        onChange={event =>
                                            updatePayment(
                                                index,
                                                'match_fee',
                                                toCurrencyNumber(
                                                    event.target.value
                                                )
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-100"
                                    />
                                </td>

                                <td className="p-3">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={payment.travel_expenses}
                                        onChange={event =>
                                            updatePayment(
                                                index,
                                                'travel_expenses',
                                                toCurrencyNumber(
                                                    event.target.value
                                                )
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-100"
                                    />
                                </td>

                                <td className="p-3">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            payment.accommodation_expenses
                                        }
                                        onChange={event =>
                                            updatePayment(
                                                index,
                                                'accommodation_expenses',
                                                toCurrencyNumber(
                                                    event.target.value
                                                )
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-100"
                                    />
                                </td>

                                <td className="p-3">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={payment.bonus_amount}
                                        onChange={event =>
                                            updatePayment(
                                                index,
                                                'bonus_amount',
                                                toCurrencyNumber(
                                                    event.target.value
                                                )
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-100"
                                    />
                                </td>

                                <td className="p-3">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={payment.deductions}
                                        onChange={event =>
                                            updatePayment(
                                                index,
                                                'deductions',
                                                toCurrencyNumber(
                                                    event.target.value
                                                )
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-100"
                                    />
                                </td>

                                <td className="p-3">
                                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
                                        £
                                        {calculateTotal(
                                            payment
                                        ).toFixed(2)}
                                    </div>
                                </td>

                                <td className="p-3">
                                    <select
                                        value={
                                            payment.payment_status
                                        }
                                        onChange={event =>
                                            updatePayment(
                                                index,
                                                'payment_status',
                                                event.target
                                                    .value as PaymentStatus
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-100"
                                    >
                                        <option value="pending">
                                            Pending
                                        </option>

                                        <option value="approved">
                                            Approved
                                        </option>

                                        <option value="processing">
                                            Processing
                                        </option>

                                        <option value="paid">
                                            Paid
                                        </option>

                                        <option value="failed">
                                            Failed
                                        </option>

                                        <option value="cancelled">
                                            Cancelled
                                        </option>
                                    </select>
                                </td>

                                <td className="p-3">
                                    <input
                                        type="text"
                                        value={
                                            payment.payment_reference ??
                                            ''
                                        }
                                        placeholder="Payment reference"
                                        onChange={event =>
                                            updatePayment(
                                                index,
                                                'payment_reference',
                                                toNullableString(
                                                    event.target.value
                                                )
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-100"
                                    />
                                </td>

                                <td className="p-3">
                                    <input
                                        type="date"
                                        value={
                                            payment.payment_date
                                                ? payment.payment_date.slice(
                                                    0,
                                                    10
                                                )
                                                : ''
                                        }
                                        onChange={event =>
                                            updatePayment(
                                                index,
                                                'payment_date',
                                                toNullableString(
                                                    event.target.value
                                                )
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-100"
                                    />
                                </td>
                            </tr>
                        ))
                    )}

                    </tbody>
                </table>
            </div>
            <div className="rounded-xl border bg-gradient-to-r from-lime-50 to-white p-5">
                <div className="flex items-start gap-3">
                    <Banknote className="mt-0.5 text-lime-600" />

                    <div>
                        <div className="font-semibold text-slate-900">
                            Payment Processing Ready
                        </div>

                        <div className="mt-1 text-sm text-slate-600">
                            TournamentHQ can later connect these records to
                            automated approvals, invoices, payout providers,
                            payment reconciliation and official statements.
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => void savePayments()}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <Save size={18} />

                    {saving
                        ? 'Saving...'
                        : 'Save Payments'}
                </button>
            </div>
        </div>
    );
};

export default PaymentsTab;