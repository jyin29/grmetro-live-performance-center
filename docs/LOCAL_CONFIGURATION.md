# Local company configuration

Company-specific data must not be committed to the repository. The application reads it from `data/company-config.json`, which is ignored by Git.

## First-time setup

1. Copy `data/company-config.example.json` to `data/company-config.json`.
2. Replace the example company name, ServiceTitan business-unit IDs, and technician roster with the local company's values.
3. Keep job classification mappings in this local file as they are validated.
4. Keep goals in the application's runtime goal-management system; optional starting defaults can also be supplied in the local company configuration.

The default file can be overridden with `COMPANY_CONFIG_PATH`, and ServiceTitan business-unit IDs can be overridden with the comma-separated `SERVICETITAN_BUSINESS_UNIT_IDS` environment variable.

## What must stay out of Git

Do not commit customer/company names, employee names or ServiceTitan technician IDs, ServiceTitan business-unit IDs, private branding assets, exported ServiceTitan data, tokens/cookies/session data, or locally managed goal/display settings.

Before committing packaging or deployment work, run `git status` and verify that `data/company-config.json` and private assets do not appear.

## Packaging direction

A packaged desktop build should create the private configuration file in an application-data directory on first launch rather than inside the installed application bundle. The installer should ship only the generic example/schema and should ask for company-specific values during setup or through an in-app configuration screen.
