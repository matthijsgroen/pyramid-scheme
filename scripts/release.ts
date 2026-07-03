#!/usr/bin/env tsx
/**
 * Semantic release script.
 *
 * Reads CHANGELOG.md [Unreleased] section, determines the version bump:
 *   - "added" or "removed" entries present → minor bump
 *   - only "changed", "fixed", "deprecated", "security" entries → patch bump
 *
 * Then:
 *   - Renames [Unreleased] to [x.y.z] - YYYY-MM-DD in CHANGELOG.md
 *   - Adds a fresh empty [Unreleased] section
 *   - Updates "version" in package.json
 *
 * Usage:
 *   yarn release           — bump and write files
 *   yarn release --dry-run — print what would happen, no writes
 */

import { readFileSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { parser, Changelog, Release } from "keep-a-changelog"

const DRY_RUN = process.argv.includes("--dry-run")

// ── Load files ────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const changelogPath = join(__dirname, "../CHANGELOG.md")
const packagePath = join(__dirname, "../package.json")

const changelog: Changelog = parser(readFileSync(changelogPath, "utf8"))
const pkg = JSON.parse(readFileSync(packagePath, "utf8")) as { version: string }

// ── Inspect [Unreleased] ──────────────────────────────────────────────────────

const unreleased = changelog.findRelease()

if (!unreleased) {
  console.error("No [Unreleased] section found in CHANGELOG.md")
  process.exit(1)
}

if (unreleased.isEmpty()) {
  console.log("Nothing in [Unreleased] — skipping release.")
  process.exit(0)
}

const counts = {
  added: unreleased.changes.get("added")?.length ?? 0,
  removed: unreleased.changes.get("removed")?.length ?? 0,
  changed: unreleased.changes.get("changed")?.length ?? 0,
  fixed: unreleased.changes.get("fixed")?.length ?? 0,
  deprecated: unreleased.changes.get("deprecated")?.length ?? 0,
  security: unreleased.changes.get("security")?.length ?? 0,
}

const bumpType = counts.added > 0 || counts.removed > 0 ? "minor" : "patch"

// ── Calculate new version ─────────────────────────────────────────────────────

const [major, minor, patch] = pkg.version.split(".").map(Number)
const newVersion = bumpType === "minor" ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`

const today = new Date().toISOString().slice(0, 10)

console.log(`Current version : ${pkg.version}`)
console.log(`Bump type       : ${bumpType} (added=${counts.added}, removed=${counts.removed})`)
console.log(`New version     : ${newVersion}`)
console.log(`Release date    : ${today}`)
console.log(
  `Changes         :`,
  Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}=${n}`)
    .join(", ")
)

if (DRY_RUN) {
  console.log("\n--dry-run: no files written.")
  process.exit(0)
}

// ── Update changelog ──────────────────────────────────────────────────────────

unreleased.setVersion(newVersion)
unreleased.setDate(new Date(today))

// Prepend a fresh empty [Unreleased] release
changelog.addRelease(new Release())

pkg.version = newVersion
writeFileSync(changelogPath, changelog.toString())
writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n")

console.log("\nDone. Commit CHANGELOG.md and package.json.")
