---
applyTo: "src/**"
---

# Firm isolation, hostnames and branding

One deployment serves every firm. A client must only ever see their own firm's data and branding. A leak of one firm's name or logo to another firm's client is a serious incident, not a cosmetic bug.

## Resolution

- The tenant is resolved once, from `location.hostname`, by `TenantResolver`. Never from a query parameter, path segment, cookie, local storage or the invitation link alone.
- Hosts are either `<slug>.retenure.io` or a firm's own domain that points a CNAME at the shared custom-domain target. The backend maps host to tenant; this app never holds the mapping.
- An unknown host, a suspended firm or a failed lookup shows the neutral Retenure not-found page. It never falls back to a default or last-used firm.
- The invitation token and session are bound to a tenant id. If the token's tenant does not match the hostname's tenant, refuse and show the neutral page.

## Scoping

- The tenant-scoped HTTP interceptor adds the tenant id to every API call. The backend authorises it; the client header is a check, not the authority.
- Every cache key, browser storage key, service worker cache name and in-memory store includes the tenant id.
- Asset URLs (logo, favicon, theme) are tenant-specific and served from tenant-prefixed paths. Never cache them under a shared key.
- Drafts are keyed by tenant, journey and invitation, and cleared on submit and sign-out.

## Branding

- The theme is a set of tokens: brand colours, logo, favicon, firm display name, adviser contact defaults. It is applied to `:root` as CSS custom properties before the first branded render.
- Components read tokens only. No component or screen checks which firm it is or holds a firm value.
- Before first paint, the shell shows a neutral loading state, so a slow theme never flashes another firm's colours.
- Emails, PDFs and share previews (`og:` tags, page title) use the same tenant theme and are covered by the same tests.
- A firm's theme is validated for contrast before it is accepted (see `accessibility.instructions.md`).

## Tests that must exist

- Two synthetic firms on two hosts: firm A's client never sees firm B's name, logo, colours or data, including after navigating, refreshing, using back, and with a stale cache.
- Mismatched tenant and invitation is refused.
- Unknown host shows the neutral page.
- Every storage key written during a journey includes the tenant id.

Invoke `security-reviewer` for any change to this area.
