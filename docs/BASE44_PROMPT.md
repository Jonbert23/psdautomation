# Base44 prompt — PSD Automation licensing site

Copy everything below the line into Base44 as the app brief. Do not add garment layout, Photoshop scripts, or PSD tools to this website. This site only markets the desktop app and lets an admin manage **per-user licenses**.

---

Build a complete web application called **PSD Automation**.

It is the public website and admin console for a **Windows desktop app** (Electron) that automates Adobe Photoshop garment production. The desktop app is separate. This web app must **not** generate PSDs, upload presets, or run Photoshop.

## Product rules

- Licensing is **per user only**. One person = at most one **active** license. No companies, no seat pools, no “N machines per org.”
- A user may activate the desktop app on more than one PC. Extra machines are recorded for audit only; do not block them.
- Admins create users and issue, edit, or revoke **that user’s** license.
- Operators (licensed users) sign in on the desktop with the same account. They do not need a rich web dashboard.

## Pages (only these)

### 1. Landing page (public, single page, no extra marketing pages)

One scrolling page at `/`. Clean, professional, desktop-software feel (not a generic SaaS grid). Sections:

1. **Header:** product name “PSD Automation”, links: Features, How it works, Admin sign in.
2. **Hero:** headline about automating round-neck / garment layouts in Photoshop from a Windows app. Short supporting line: profiles, PNG presets, layout, Template Guide, production orders. Primary button: “Sign in” (goes to Base44 auth). Secondary text: “Licenses are issued per user by an administrator.”
3. **Features (4–6 cards):** Garment profiles; PNG presets per size and part; layout in-app and in Photoshop; Template Guide PSD; production orders and naming; per-user license.
4. **How it works (3 steps):** Admin creates the user and license on this site → User installs the Windows app and signs in once → Photoshop jobs run locally; the PC stays licensed until the expiry date.
5. **License note:** Online only for the first activation on a PC. After that the desktop app can run offline until the license expires. Revoking a license on this site does not instantly lock a PC that already activated.
6. **Footer:** product name, “Admin console”, no fake blog or pricing tables.

Do not add pricing, checkout, Stripe, or a public self-serve signup for licenses. Users are created by an admin.

### 2. Admin dashboard (authenticated, role = admin only)

After login, if the user is **admin**, show an app shell with a sidebar:

- Dashboard
- Users
- Licenses
- Activations
- Sign out

If a non-admin signs in on the web, show a simple “Your account” page: email, license status, plan, expiry. No user management. If they have no license, say so clearly.

**Dashboard home**

- Counts: total users, active licenses, expired licenses, revoked licenses, activations this month.
- Table of licenses expiring in the next 14 days.
- Recent activations (user email, machine label, time).

**Users**

- List all users: email, name, role (`admin` / `operator`), license status, expiry.
- Admin can **invite/create** an operator (email, name, temporary password or invite flow using built-in auth).
- Admin can set role to admin or operator.
- Do not allow an operator to list other users.

**Licenses**

- List licenses: user email, plan name, startsAt, expiresAt, status (`active` / `expired` / `revoked`).
- **Issue license:** pick a user, plan name (text, e.g. Standard / Yearly), start date, expiry date. Status starts as `active`.
- If that user already has an **active** license, block a second active one. Show an error. Admin must revoke or expire the old one first.
- **Revoke:** set status to `revoked`. Do not delete the row.
- **Edit dates / plan** on a license that is not revoked.
- A nightly or on-read rule: if `expiresAt` is in the past and status is `active`, treat/display as `expired`.

**Activations (audit)**

- List: user email, machineId, machineLabel, app version, activatedAt, lastSeenAt.
- Filter by user.
- Read-only for v1. No “kick this machine” that changes seat counts (there are no seats).

## Data models

### User (built-in auth)

Use Base44 users. Add:

- `role`: `admin` | `operator` (default `operator`)
- `displayName`: text

The first user you create should be `admin`.

### License

- `user` (relation to User, required)
- `planName` (text, required)
- `startsAt` (datetime, required)
- `expiresAt` (datetime, required)
- `status` (enum: `active`, `expired`, `revoked`, required, default `active`)
- `notes` (text, optional)
- `createdAt`, `updatedAt`

Constraint: at most one row with `status = active` per `user`.

### Activation

- `user` (relation to User, required)
- `license` (relation to License, required)
- `machineId` (text, required)
- `machineLabel` (text, optional, e.g. hostname)
- `appVersion` (text, optional)
- `activatedAt` (datetime)
- `lastSeenAt` (datetime)

Unique on (`user`, `machineId`) for upserts. Activations never decide whether a user is licensed.

## Backend function (required): `activateDesktop`

This is what the Windows app will call after the user signs in.

**Auth:** required. Use the logged-in user from the request. Ignore any `userId` the client sends.

**Input JSON:**

```json
{
  "machineId": "string, required",
  "machineLabel": "string, optional",
  "appVersion": "string, optional"
}
```

**Logic:**

1. Find a License for this user with `status = active`.
2. If none → HTTP 403, `{ "ok": false, "code": "no_license", "message": "No active license for this user." }`
3. If `status === "revoked"` → `code: "revoked"`
4. If `expiresAt` is in the past → set/treat as expired, `{ "ok": false, "code": "expired", "message": "License has expired." }`
5. Upsert Activation for this user + `machineId`: set machineLabel, appVersion, lastSeenAt = now; set activatedAt if new.
6. HTTP 200:

```json
{
  "ok": true,
  "grant": {
    "userId": "...",
    "email": "...",
    "licenseId": "...",
    "planName": "...",
    "machineId": "...",
    "expiresAt": "ISO-8601",
    "status": "active"
  }
}
```

Never return `ok: true` unless that user has a current active license. Do not count machines. Do not require an organization.

Optional function **`getMyLicense`**: same auth, no body; returns the current user’s license and grant fields without writing an activation (for a Refresh license button).

## Security

- Operators cannot CRUD other users or licenses via the UI or API.
- Only `admin` role can create users and licenses.
- `activateDesktop` is available to any authenticated user (operators included) but only for **their** license.
- No public API that lists licenses without auth.

## Visual

Simple, dense admin tables (like an internal tool). Landing page can be slightly more marketing-oriented but keep it one page. No stock “AI startup” purple gradients if a neutral industrial look fits better (print shop / production desk).

## Out of scope

- Payments, coupons, trials that self-start
- Garment profiles, PSD upload, Photoshop
- Multi-tenant organizations and seat limits
- Mobile app

After publishing, show me the **API base URL**, how clients authenticate (token header), and the exact path to call `activateDesktop` and login so a Windows Electron app can use the same users.

---

## How to use this file

1. Open [Base44](https://base44.com) and create a new app.
2. Paste the prompt above (from “Build a complete web application” through the out-of-scope section).
3. After the app is generated, create your admin user, set `role` to `admin`, and issue a test operator license.
4. Copy the published API URL and auth details into the desktop app settings when that integration is built.
