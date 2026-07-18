# PhoneStock Inventory

A mobile-first phone inventory and public price catalogue for retail shops. Customers can view exact RAM, storage, colour, price and availability through a shareable link. An authenticated administrator can manage stock, prices, private costs, imports and reports.

## Included

- Public searchable catalogue with brand, RAM, storage, price and stock filters
- Exact variant tracking by model, RAM, storage, colour, region and condition
- Public WhatsApp sharing and copy/share links
- Password-protected administration with a 30-minute inactivity lock
- Private purchase price and margin data separated from public API responses
- Add, archive, reprice and adjust-stock workflows
- Append-only stock movement, price history and audit tables
- CSV import and export
- Low-stock and inventory valuation reports
- Responsive PWA interface for phones, tablets and desktops
- Cloudflare D1 schema and realistic demonstration inventory

## Security model

The admin password is never stored in the repository or compared in browser code. The production runtime stores:

- `ADMIN_PASSWORD_HASH` — PBKDF2-SHA256 hash
- `ADMIN_PASSWORD_SALT` — random salt
- `ADMIN_SESSION_SECRET` — random HMAC key used to sign HTTP-only cookies

Admin cookies are HTTP-only, Secure and SameSite=Strict. Every write endpoint checks the signed server-side session. Public inventory responses select only public columns; purchase cost, supplier, invoice, IMEI, margin and audit records are not returned.

The requested initial password should be changed after first deployment. A six-digit password is not suitable for long-term internet-facing administration.

## Local setup

Requirements: Node.js 22.13 or newer.

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local` and fill the three admin authentication values.
3. Generate D1 migrations after schema changes with `npm run db:generate`.
4. Start the development site with the environment's supported preview command.
5. Run `npm run lint`, `npm run build`, and `npm test` before deployment.

Without D1, the public catalogue uses safe demonstration data and admin writes are disabled. The production deployment binds D1 using the logical `DB` binding in `.openai/hosting.json`.

## Creating password values

Generate a random salt and session secret. Derive a 32-byte PBKDF2-SHA256 hash with 100,000 iterations from the chosen password and salt. Store all three values as base64-encoded secrets in the hosting platform. Do not place the plaintext password in any `.env` file committed to source control.

## Database structure

- `brands`
- `phone_models`
- `phone_variants`
- `inventory_private`
- `suppliers`
- `phone_units`
- `stock_movements`
- `price_history`
- `audit_logs`
- `shop_settings`

`phone_variants` prevents duplicate exact variants and rejects negative stock or invalid prices at database level. IMEI/serial data lives in a private table and is not queried by public routes.

## Cloudflare Pages deployment

1. Push this repository to a private GitHub repository.
2. In Cloudflare, open **Workers & Pages → Create application → Pages → Connect to Git**.
3. Select the repository.
4. Use the repository's existing build script and deploy the generated `dist` output according to the Vinext/Workers configuration.
5. Create a D1 database and bind it as `DB`.
6. Apply the SQL migration in `drizzle/0000_curly_romulus.sql`.
7. Add the three admin authentication values as encrypted production secrets.
8. Deploy, open `/api/inventory`, verify that it returns public fields only, then open `/admin` and test authentication.

If deploying through ChatGPT Sites, the existing `.openai/hosting.json` manifest creates and wires D1 automatically during the checkpoint workflow.

### GitHub Actions deployment pipeline

The workflow in `.github/workflows/deploy-cloudflare.yml` validates and deploys every push to `main`. It creates or reuses the production D1 database, applies migrations, deploys the Worker and installs the server-side admin secrets.

Add these encrypted GitHub Actions repository secrets before the first run:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` with Workers and D1 edit access
- `ADMIN_PASSWORD`

No plaintext password, password hash, database identifier or session secret is committed to the repository.

## Backup

Use Cloudflare D1 export to download a SQL backup on a regular schedule. The admin CSV export is useful for operational reporting but is not a complete database backup because it intentionally excludes movement history and other private relational data.

## Production checklist

- Change the initial password
- Keep the repository private
- Never expose runtime secrets or a service-role key in frontend code
- Test public API responses for private columns
- Verify add, price update, stock adjustment and archive operations
- Export a database backup
- Add the real shop name, WhatsApp number and address
- Replace demonstration prices with verified shop prices
- Review Cloudflare usage and backup policies as the shop grows

## Notes

The included product renders are brand-neutral catalogue illustrations, not official manufacturer photographs. Demonstration prices are placeholders and must be replaced by the shop owner.
