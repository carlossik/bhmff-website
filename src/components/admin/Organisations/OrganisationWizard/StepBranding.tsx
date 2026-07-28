import type {
    OrganisationFormData,
} from '../organisationTypes'

import { ImageUpload } from '../../../common/ImageUpload'
import { BrandingPreview } from './BrandingPreview'

type StepBrandingProps = {
    form: OrganisationFormData
    organisationId: string
    disabled?: boolean
    onChange: <
        K extends keyof OrganisationFormData,
    >(
        field: K,
        value: OrganisationFormData[K]
    ) => void
}

type ColourField = {
    field:
        | 'primary_colour'
        | 'secondary_colour'
        | 'accent_colour'
        | 'background_colour'
        | 'surface_colour'
        | 'text_colour'
    label: string
    description: string
}

const COLOUR_FIELDS: ColourField[] = [
    {
        field: 'primary_colour',
        label: 'Primary colour',
        description:
            'Navigation, highlights and primary actions.',
    },
    {
        field: 'secondary_colour',
        label: 'Secondary colour',
        description:
            'Supporting and contrasting elements.',
    },
    {
        field: 'accent_colour',
        label: 'Accent colour',
        description:
            'Badges, calls to action and status elements.',
    },
    {
        field: 'background_colour',
        label: 'Background colour',
        description:
            'Main portal and public-site background.',
    },
    {
        field: 'surface_colour',
        label: 'Surface colour',
        description:
            'Cards, navigation and content panels.',
    },
    {
        field: 'text_colour',
        label: 'Text colour',
        description:
            'Primary text used on branded surfaces.',
    },
]

export function StepBranding({
    form,
    organisationId,
    disabled = false,
    onChange,
}: StepBrandingProps) {
    return (
        <section className="wizard-step-section">
            <header className="wizard-step-heading">
                <p>Step 2</p>

                <h2>
                    Branding and appearance
                </h2>

                <span>
                    Upload the organisation logo and
                    configure how the customer portal and
                    public website should look.
                </span>
            </header>

            <ImageUpload
                value={form.logo_url}
                organisationId={organisationId}
                folder="organisation-branding"
                label="Organisation logo"
                uploadLabel="Upload organisation logo"
                replaceLabel="Replace logo"
                removeLabel="Remove logo"
                helperText="PNG, JPG, WebP or SVG. Maximum 5 MB. A square image of at least 512 × 512 pixels is recommended."
                previewAlt={`${form.name || 'Organisation'} logo`}
                disabled={disabled}
                onChange={(url) =>
                    onChange('logo_url', url)
                }
            />

            <div>
                <div className="wizard-subheading">
                    <h3>Brand colours</h3>

                    <p>
                        Select colours directly or enter a
                        six-digit hexadecimal value.
                    </p>
                </div>

                <div className="brand-colour-grid">
                    {COLOUR_FIELDS.map(
                        ({
                            field,
                            label,
                            description,
                        }) => (
                            <div
                                key={field}
                                className="brand-colour-card"
                            >
                                <div className="brand-colour-card-header">
                                    <div>
                                        <label
                                            htmlFor={`organisation-wizard-${field}`}
                                        >
                                            {label}
                                        </label>

                                        <p>
                                            {description}
                                        </p>
                                    </div>

                                    <input
                                        id={`organisation-wizard-${field}`}
                                        type="color"
                                        value={form[field]}
                                        disabled={disabled}
                                        onChange={(event) =>
                                            onChange(
                                                field,
                                                event.target
                                                    .value
                                            )
                                        }
                                        className="brand-colour-picker"
                                    />
                                </div>

                                <input
                                    type="text"
                                    value={form[field]}
                                    disabled={disabled}
                                    aria-label={`${label} hexadecimal value`}
                                    onChange={(event) =>
                                        onChange(
                                            field,
                                            event.target
                                                .value
                                        )
                                    }
                                    className="brand-colour-value"
                                />
                            </div>
                        )
                    )}
                </div>
            </div>

            <BrandingPreview
                organisationName={form.name}
                logoUrl={form.logo_url}
                publicSiteEnabled={
                    form.public_site_enabled
                }
                primaryColour={
                    form.primary_colour
                }
                secondaryColour={
                    form.secondary_colour
                }
                accentColour={
                    form.accent_colour
                }
                backgroundColour={
                    form.background_colour
                }
                surfaceColour={
                    form.surface_colour
                }
                textColour={form.text_colour}
            />

            <div className="wizard-guidance">
                <strong>
                    Branding guidance
                </strong>

                <p>
                    Use colours with sufficient contrast so
                    text, buttons and navigation remain
                    clear and accessible.
                </p>
            </div>
        </section>
    )
}
