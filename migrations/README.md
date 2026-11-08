# Migrations

No migration framework is configured yet.

The backend creates the current schema, FTS5 virtual tables, triggers, and seed administrator at startup. This is safe for a new database but not a substitute for versioned migrations on an existing deployment.

Before changing the schema:

1. Back up `data/` using `scripts/backup-data.ps1`.
2. Add an Alembic (or equivalent) baseline and migration.
3. Test the upgrade against a copy of the production database.
4. Document the schema version and rollback path.

Until then, treat schema changes as breaking and rebuild a staging database from the original PDFs.
