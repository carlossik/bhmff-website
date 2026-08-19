export type ClubFinanceAccessRole =
    | 'platform_admin'
    | 'super_admin'
    | 'treasurer'
    | 'finance_admin'
    | 'team_manager'
    | 'committee_viewer'

export type ClubFinanceChargeStatus =
    | 'not_due'
    | 'due'
    | 'part_paid'
    | 'paid'
    | 'waived'

export type ClubFinanceChargeType =
    | 'sign_on'
    | 'monthly_fee'
    | 'matchday_sub'
    | 'yellow_card_fine'
    | 'red_card_fine'
    | 'custom'

export type ClubFinancePaymentMethod =
    | 'cash'
    | 'bank_transfer'
    | 'card'
    | 'direct_debit'
    | 'standing_order'
    | 'other'

export type ClubFinancePaymentStatus =
    | 'pending'
    | 'recorded'
    | 'cleared'
    | 'failed'
    | 'part_refunded'
    | 'refunded'
    | 'cancelled'

export type ClubFinanceExpenseStatus =
    | 'draft'
    | 'recorded'
    | 'pending_approval'
    | 'approved'
    | 'paid'
    | 'void'

export type ClubFinanceDashboardSummary = {
    currency: string
    totalCharged: number
    totalCollected: number
    totalWaived: number
    outstandingTotal: number
    overdueTotal: number
    membersOwing: number
    overdueMembers: number
    incomeThisMonth: number
    expensesThisMonth: number
    otherIncomeExpected: number
    otherIncomeReceived: number
    unallocatedPayments: number
    recordedCashPosition: number | null
    collectionRate: number
}

export type ClubFinanceTrendPoint = {
    month_start: string
    member_income: number
    other_income: number
    total_income: number
    expenses: number
    net: number
}

export type ClubFinanceOwingItem = {
    id: string
    playerId: string
    playerName: string
    chargeType: string
    description: string | null
    amountDue: number
    amountPaid: number
    waivedAmount: number
    outstandingAmount: number
    dueDate: string | null
    status: string
    overdue: boolean
}

export type ClubFinanceAccount = {
    id: string
    name: string
    accountType: string
    currency: string
    openingBalance: number
    openingBalanceDate: string
    isDefault: boolean
}

export type ClubFinanceRecentExpense = {
    id: string
    teamId: string | null
    description: string
    supplierName: string | null
    amount: number
    taxAmount: number
    expenseDate: string
    status: string
    categoryName: string | null
}

export type ClubFinanceDashboard = {
    summary: ClubFinanceDashboardSummary
    trend: ClubFinanceTrendPoint[]
    owing: ClubFinanceOwingItem[]
    recentExpenses: ClubFinanceRecentExpense[]
    accounts: ClubFinanceAccount[]
    access: {
        role: ClubFinanceAccessRole
        teamId: string | null
    }
}

export type ClubFinancePaymentAllocationInput = {
    chargeId: string
    amount: number
}

export type RecordClubFinancePaymentInput = {
    organisationId: string
    seasonId?: string | null
    teamId?: string | null
    payerId?: string | null
    playerId?: string | null
    accountId?: string | null
    amount: number
    currency?: string | null
    paymentDate?: string | null
    method: ClubFinancePaymentMethod
    status?: ClubFinancePaymentStatus
    gatewayProvider?: string | null
    gatewayRef?: string | null
    paymentReference?: string | null
    notes?: string | null
    allocations: ClubFinancePaymentAllocationInput[]
}

export type CreateClubFinanceExpenseInput = {
    organisationId: string
    seasonId?: string | null
    teamId?: string | null
    fixtureId?: string | null
    officialPaymentId?: string | null
    accountId?: string | null
    categoryId?: string | null
    supplierName?: string | null
    description: string
    amount: number
    taxAmount?: number
    expenseDate?: string | null
    status?: ClubFinanceExpenseStatus
    paymentMethod?:
        | 'cash'
        | 'bank_transfer'
        | 'card'
        | 'direct_debit'
        | 'other'
        | null
    paymentReference?: string | null
    receiptPath?: string | null
    recurring?: boolean
    currency?: string | null
    notes?: string | null
}

export type CreateClubFinanceIncomeInput = {
    organisationId: string
    seasonId?: string | null
    teamId?: string | null
    accountId?: string | null
    categoryId?: string | null
    sourceName: string
    description?: string | null
    amountExpected: number
    amountReceived?: number
    incomeDate?: string | null
    dueDate?: string | null
    currency?: string | null
    reference?: string | null
    notes?: string | null
}

export type ClubFinanceReport = {
    period: {
        fromDate: string | null
        toDate: string | null
    }
    incomeByCategory: Array<{
        category: string
        amount: number
    }>
    expensesByCategory: Array<{
        category: string
        amount: number
    }>
    outstandingBalances: Array<{
        chargeId: string
        playerId: string
        playerName: string
        chargeType: string
        description: string | null
        dueDate: string | null
        status: string
        outstandingAmount: number
    }>
    trend: ClubFinanceTrendPoint[]
    currency: string
}

export type ClubFinanceSeasonOption = {
    id: string
    name: string
    label: string
    status: string
    startDate: string | null
    endDate: string | null
}

export type ClubFinanceTeamOption = {
    id: string
    name: string
    ageGroup: string | null
    seasonIds: string[]
}

export type ClubFinanceTeamPaymentModel =
    | 'none'
    | 'matchday'
    | 'monthly'
    | 'hybrid'

export type ClubFinanceTeamPaymentPolicy = {
    organisationId: string
    seasonId: string
    teamId: string
    paymentModel: ClubFinanceTeamPaymentModel
    monthlyFeeAmount: number
    matchdaySubAmount: number
    monthlyDueDay: number
}


export type ClubFinanceFeeRuleFrequency =
    | 'once_per_season'
    | 'monthly'
    | 'per_fixture'

export type ClubFinanceFeeRule = {
    id: string
    organisationId: string
    seasonId: string
    teamId: string
    chargeTypeId: string
    canonicalType:
        | 'sign_on'
        | 'monthly_fee'
        | 'matchday_sub'
        | 'custom'
    frequency: ClubFinanceFeeRuleFrequency
    amount: number
    dueDay: number | null
    name: string
    description: string | null
    active: boolean
    autoApply: boolean
    createdAt: string
    updatedAt: string
}

export type SaveClubFinanceFeeRuleInput = {
    organisationId: string
    seasonId: string
    teamId: string
    canonicalType:
        | 'sign_on'
        | 'monthly_fee'
        | 'matchday_sub'
    frequency: ClubFinanceFeeRuleFrequency
    amount: number
    dueDay?: number | null
    name: string
    description?: string | null
    active?: boolean
    autoApply?: boolean
}

export type RemoveClubFinanceFeeRuleInput = {
    organisationId: string
    ruleId: string
    removeUnpaidCharges?: boolean
}

export type RemoveClubFinanceFeeRuleResult = {
    ruleId: string
    removedUnpaidCharges: number
    preservedCharges: number
}

export type ClubFinancePlayerOption = {
    id: string
    squadMemberId: string
    teamId: string
    seasonId: string
    fullName: string
    email: string | null
    phone: string | null
    signOnFeeAmount: number
}

export type ClubFinanceFixtureOption = {
    id: string
    seasonId: string
    teamId: string
    fixtureDate: string
    kickoffTime: string | null
    homeAway: string
    fixtureType: string
    status: string
    opponentName: string
}

export type ClubFinanceCategoryOption = {
    id: string
    code: string
    name: string
    active: boolean
    systemDefined: boolean
}

export type ClubFinanceChargeTypeOption = ClubFinanceCategoryOption & {
    canonicalType: ClubFinanceChargeType | null
    defaultAmount: number | null
}

export type ClubFinanceReferenceData = {
    seasons: ClubFinanceSeasonOption[]
    teams: ClubFinanceTeamOption[]
    players: ClubFinancePlayerOption[]
    fixtures: ClubFinanceFixtureOption[]
    chargeTypes: ClubFinanceChargeTypeOption[]
    incomeCategories: ClubFinanceCategoryOption[]
    expenseCategories: ClubFinanceCategoryOption[]
}

export type ClubFinanceCharge = {
    id: string
    organisationId: string
    seasonId: string
    teamId: string
    playerId: string
    squadMemberId: string | null
    fixtureId: string | null
    matchEventId: string | null
    payerId: string | null
    chargeTypeId: string | null
    feeRuleId: string | null
    chargeType: string
    billingPeriod: string | null
    description: string | null
    amountDue: number
    amountPaid: number
    waivedAmount: number
    outstandingAmount: number
    status: string
    dueDate: string | null
    currency: string
    createdAt: string
    playerName: string
}

export type ClubFinancePayment = {
    id: string
    organisationId: string
    seasonId: string | null
    teamId: string | null
    payerId: string | null
    playerId: string | null
    accountId: string | null
    amount: number
    currency: string
    paymentDate: string
    method: string
    status: string
    gatewayProvider: string | null
    gatewayRef: string | null
    paymentReference: string | null
    notes: string | null
    playerName: string | null
    allocatedAmount: number
    unallocatedAmount: number
    createdAt: string
}

export type ClubFinanceExpense = {
    id: string
    seasonId: string | null
    teamId: string | null
    fixtureId: string | null
    officialPaymentId: string | null
    accountId: string | null
    categoryId: string | null
    categoryName: string | null
    supplierName: string | null
    description: string
    amount: number
    taxAmount: number
    expenseDate: string
    status: string
    paymentMethod: string | null
    paymentReference: string | null
    receiptPath: string | null
    recurring: boolean
    currency: string
    notes: string | null
    approvedBy: string | null
    approvedAt: string | null
    createdAt: string
}

export type ClubFinanceIncome = {
    id: string
    seasonId: string | null
    teamId: string | null
    accountId: string | null
    categoryId: string | null
    categoryName: string | null
    sourceName: string
    description: string | null
    amountExpected: number
    amountReceived: number
    incomeDate: string
    dueDate: string | null
    status: string
    currency: string
    reference: string | null
    notes: string | null
    createdAt: string
}

export type ClubFinanceLedger = {
    player: {
        id: string
        fullName: string
        email: string | null
        phone: string | null
    }
    payers: Array<{
        relationship: string
        isPrimary: boolean
        payer: Record<string, unknown> | null
    }>
    summary: {
        totalDue: number
        totalPaid: number
        totalWaived: number
        outstanding: number
        currency: string
    }
    charges: Array<Record<string, unknown>>
    allocations: Array<Record<string, unknown>>
    ledger: Array<{
        date: string
        kind: 'charge' | 'payment' | 'refund' | 'waiver'
        referenceId: string
        description: string
        debit: number
        credit: number
        runningBalance: number
    }>
}

export type CreateClubFinanceChargeInput = {
    organisationId: string
    seasonId: string
    teamId: string
    playerId: string
    squadMemberId?: string | null
    fixtureId?: string | null
    payerId?: string | null
    chargeTypeId?: string | null
    feeRuleId?: string | null
    chargeType: ClubFinanceChargeType
    billingPeriod?: string | null
    description?: string | null
    amountDue: number
    dueDate?: string | null
}
