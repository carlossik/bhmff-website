#!/usr/bin/env python3
"""CI-only: provide unique versions for legacy date-only Supabase migrations.

This changes only files in the disposable GitHub Actions checkout. It must not
be used for production deploys or to reconcile the hosted migration ledger.
"""
from pathlib import Path
import os
import re
import sys

PATTERN = re.compile(r"^(\d{8}|\d{14})_(.+)\.sql$")


def normalize(directory: Path) -> list[tuple[str, str]]:
    migrations = sorted(directory.glob("*.sql"), key=lambda p: p.name)
    # Reconstruct verified same-day prerequisite order in the ephemeral CI copy.
    # The organisation_type migration must run before club public-profile backfill.
    priority = {
        "20260812_add_organisation_type.sql": 0,
        "20260812_add_club_public_profile.sql": 1,
        "20260812_create_club_fixture_programme.sql": 2,
        "20260812_create_club_squad.sql": 3,
        "20260812_add_club_results_and_goals.sql": 4,
    }
    migrations.sort(key=lambda p: (p.name[:8], priority.get(p.name, 50), p.name))
    parsed = []
    for file in migrations:
        match = PATTERN.fullmatch(file.name)
        if not match:
            raise ValueError(f"Unexpected migration filename: {file.name}")
        parsed.append((file, match.group(1), match.group(2)))

    # A date-only migration is assigned its original position within its day,
    # preceding any original timestamped (14-digit) migration from that day.
    reserved = {version for _, version, _ in parsed if len(version) == 14}
    mapping: list[tuple[Path, Path]] = []
    used = set(reserved)
    day_counters: dict[str, int] = {}
    for src, version, suffix in parsed:
        if len(version) == 14:
            continue
        number = day_counters.get(version, 0)
        while True:
            number += 1
            candidate = f"{version}{number:06d}"
            if candidate not in used:
                break
        day_counters[version] = number
        used.add(candidate)
        mapping.append((src, directory / f"{candidate}_{suffix}.sql"))

    for old, new in mapping:
        if new.exists():
            raise FileExistsError(f"Refusing to overwrite {new}")
    for old, new in mapping:
        old.rename(new)

    versions = []
    for file in directory.glob("*.sql"):
        match = PATTERN.fullmatch(file.name)
        if not match or len(match.group(1)) != 14:
            raise ValueError(f"Invalid resulting migration: {file.name}")
        versions.append(match.group(1))
    if len(versions) != len(set(versions)):
        raise ValueError("Duplicate migration versions remain")
    return [(old.name, new.name) for old, new in mapping]


def main() -> int:
    if os.environ.get("GITHUB_ACTIONS") != "true" or os.environ.get("GITHUB_REF_NAME") != "staging":
        print("This migration normalizer only runs in GitHub Actions on staging", file=sys.stderr)
        return 2
    directory = Path("supabase/migrations")
    if not directory.is_dir():
        print("Missing supabase/migrations directory", file=sys.stderr)
        return 2
    for old, new in normalize(directory):
        print(f"CI-only rename: {old} -> {new}")
    print("All local migration versions are unique; original Git branch remains unchanged.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
