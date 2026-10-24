#!/usr/bin/env python3
"""Fail quickly if CI's restored historic foundations are absent or ordered incorrectly.
Only inspects ephemeral local checkout files; never accesses production.
"""
from pathlib import Path
import re

M = Path("supabase/migrations")
required = {
    "20260730000000_create_sports_officials_module.sql": [
        r"create\s+table\s+if\s+not\s+exists\s+public\.official_payments\b",
        r"create\s+table\s+if\s+not\s+exists\s+public\.official_assignments\b",
    ],
    "20260814000000_phase2_multiteam_club_payments_match_centre.sql": [
        r"create\s+table\s+if\s+not\s+exists\s+public\.club_team_seasons\b",
        r"create\s+table\s+if\s+not\s+exists\s+public\.club_player_charges\b",
        r"create\s+table\s+if\s+not\s+exists\s+public\.club_match_events\b",
    ],
}
required.update({
    "20260805000001_platform_admin_isolation.sql": [
        r"create\s+or\s+replace\s+function\s+public\.is_platform_admin\b",
        r"create\s+or\s+replace\s+function\s+public\.is_organisation_super_admin\b",
    ],
    "20260809000001_add_media_competition_id.sql": [
        r"media_competition_id_fkey",
    ],
    "20260809000002_public_media_rls.sql": [
        r"create\s+policy",
    ],
    "20260918000001_extend_competition_rules_public_audit.sql": [
        r"competition_rules_public_select",
    ],
})
required["20260820000000_legacy_club_goal_squad_link.sql"] = [
    r"add\s+column\s+if\s+not\s+exists\s+squad_member_id\s+uuid",
    r"foreign\s+key\s*\(squad_member_id\)\s*references\s+public\.club_squad_members\(id\)\s*on\s+delete\s+set\s+null",
    r"create\s+index\s+if\s+not\s+exists\s+idx_club_goals_squad_member_id",
]
required["20260920000000_ci_results_goals_competition_scope.sql"] = [
    r"alter\s+table\s+public\.results\s+add\s+column\s+if\s+not\s+exists\s+competition_id\s+uuid",
    r"alter\s+table\s+public\.goals\s+add\s+column\s+if\s+not\s+exists\s+competition_id\s+uuid",
    r"alter\s+table\s+public\.results\s+alter\s+column\s+competition_id\s+set\s+not\s+null",
    r"alter\s+table\s+public\.goals\s+alter\s+column\s+competition_id\s+set\s+not\s+null",
    r"foreign\s+key\s*\(competition_id\)\s*references\s+public\.competitions\(id\)\s+on\s+delete\s+cascade",
]
files = sorted(M.glob("*.sql"))
versions = [f.name[:14] for f in files]
assert len(versions) == len(set(versions)), "Duplicate migration versions"
assert all(re.match(r"^\d{14}_.+\.sql$", f.name) for f in files), "Invalid migration names"
names = [f.name for f in files]
assert not any("legacy_officials_catalogue" in n for n in names), "Legacy official placeholder must not be used alongside original module"
for name, patterns in required.items():
    assert name in names, f"Missing original source migration: {name}"
    sql = (M / name).read_text(encoding="utf-8")
    for pattern in patterns:
        assert re.search(pattern, sql, flags=re.I), f"Expected foundational table missing in {name}: {pattern}"

def pos(term):
    matches = [i for i, n in enumerate(names) if term in n]
    assert len(matches) == 1, f"Expected one migration containing {term}: {matches}"
    return matches[0]

assert pos("create_sports_officials_module") < pos("public_fixture_officials")
assert pos("create_club_fixture_programme") < pos("phase2_multiteam_club_payments_match_centre")
assert pos("create_club_squad") < pos("phase2_multiteam_club_payments_match_centre")
assert pos("phase2_multiteam_club_payments_match_centre") < pos("club_finance_foundation")
assert pos("club_finance_foundation") < pos("club_finance_engine")
assert pos("club_finance_engine") < pos("club_finance_fee_rules")
assert pos("platform_admin_isolation") < pos("allow_organisation_owned_venues")
assert pos("legacy_media_ownership") < pos("add_media_competition_id")
assert pos("add_media_competition_id") < pos("public_media_rls")
assert pos("public_media_rls") < pos("fix_media_multitenant_uniqueness")
assert pos("add_competition_rules_acceptance") < pos("extend_competition_rules_public_audit")

assert pos("add_club_results_and_goals") < pos("legacy_club_goal_squad_link")
assert pos("legacy_club_goal_squad_link") < pos("public_club_data_rpc")
assert pos("legacy_club_goal_squad_link") < pos("add_club_goal_type")
assert pos("legacy_club_goal_squad_link") < pos("club_squad_photos_and_goal_attribution")

assert pos("add_competition_rules_acceptance") < pos("ci_results_goals_competition_scope")
assert pos("ci_results_goals_competition_scope") < pos("team_match_access_and_fixture_safety")

print("CI migration preflight passed: restored original modules, media/rules, finance, goal squad link and match competition scope.")
