-- ==========================================================
-- TournamentHQ SaaS Platform
-- Organisation Provisioning Extension
-- ==========================================================

-- ----------------------------
-- Subscription
-- ----------------------------

ALTER TABLE organisations
    ADD COLUMN IF NOT EXISTS subscription_plan text NOT NULL DEFAULT 'starter';

ALTER TABLE organisations
    ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'active';

ALTER TABLE organisations
    ADD COLUMN IF NOT EXISTS trial_end timestamptz;

-- ----------------------------
-- Branding
-- ----------------------------

ALTER TABLE organisations
    ADD COLUMN IF NOT EXISTS accent_colour text NOT NULL DEFAULT '#84cc16';

ALTER TABLE organisations
    ADD COLUMN IF NOT EXISTS background_colour text NOT NULL DEFAULT '#071006';

ALTER TABLE organisations
    ADD COLUMN IF NOT EXISTS surface_colour text NOT NULL DEFAULT '#10190f';

ALTER TABLE organisations
    ADD COLUMN IF NOT EXISTS text_colour text NOT NULL DEFAULT '#ffffff';

-- ----------------------------
-- SaaS Limits
-- ----------------------------

ALTER TABLE organisations
    ADD COLUMN IF NOT EXISTS max_users integer NOT NULL DEFAULT 5;

ALTER TABLE organisations
    ADD COLUMN IF NOT EXISTS max_competitions integer NOT NULL DEFAULT 2;

ALTER TABLE organisations
    ADD COLUMN IF NOT EXISTS public_site_enabled boolean NOT NULL DEFAULT true;

-- ----------------------------
-- Organisation Owner
-- ----------------------------

ALTER TABLE organisations
    ADD COLUMN IF NOT EXISTS owner_name text;

ALTER TABLE organisations
    ADD COLUMN IF NOT EXISTS owner_email text;

ALTER TABLE organisations
    ADD COLUMN IF NOT EXISTS owner_phone text;

-- ----------------------------
-- Enabled Modules
-- ----------------------------

ALTER TABLE organisations
    ADD COLUMN IF NOT EXISTS enabled_modules text[]
    NOT NULL
    DEFAULT ARRAY[
    'Dashboard',
    'Competitions',
    'Clubs',
    'Teams',
    'Competition Teams',
    'Groups',
    'Venues',
    'Fixtures',
    'Results'
    ];

-- ----------------------------
-- Plans
-- ----------------------------

ALTER TABLE organisations
    ADD CONSTRAINT organisations_subscription_plan_check
        CHECK (
            subscription_plan IN
            (
             'starter',
             'professional',
             'enterprise'
                )
            );

ALTER TABLE organisations
    ADD CONSTRAINT organisations_subscription_status_check
        CHECK (
            subscription_status IN
            (
             'trial',
             'active',
             'suspended',
             'cancelled'
                )
            );