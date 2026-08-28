const configuredGa4MeasurementId = (
    import.meta.env.VITE_GA4_MEASUREMENT_ID as
        | string
        | undefined
)?.trim()

export const GA4_MEASUREMENT_ID =
    configuredGa4MeasurementId ?? ''

export const SAAS_ANALYTICS_CONFIGURED = Boolean(
    GA4_MEASUREMENT_ID,
)
