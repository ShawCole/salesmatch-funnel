# Handoff → arkdata-integrations-agent: add the READ (campaign data) half

**For:** the agent that owns `~/repos/arkdata-meta-connect` (the Meta integration app).
**From:** the salesmatch-funnel UI/measurement agent.
**Goal:** the same app that already pushes audiences INTO clients' Meta accounts should also pull campaign performance OUT, normalize it, and feed it to salesmatch-funnel. One app, both directions (this is load-bearing for person-level attribution — the audience we pushed must be tied to the conversions it drove).

---

## What's already built (don't rebuild)
`arkdata-meta-connect` (Firebase: `api/index.js` + hosting) already has:
- OAuth connect flow → code → token exchange → **long-lived token stored in Firestore** (`access_token`).
- `appsecret_proof` on calls; `/me`, account listing, permission-revoke (data deletion).
- **Push side:** create **Custom Audiences** (`customaudiences`, `customer_file_source: USER_PROVIDED_ONLY`) — the "data into clients' accounts" half.
- Graph **v19.0**.

## What to ADD
1. **OAuth scopes:** add `ads_read` + `read_insights` to the existing scope set (you already have `ads_management`/`business_management` for the push). One consent covers both directions.
2. **Bump Graph version** v19.0 → current (v21.0+).
3. **Read endpoints** (reference implementation already written: `salesmatch-funnel/scripts/meta-pull.mjs`):
   - `GET /act_<id>/campaigns` — fields: `id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time`
   - `GET /act_<id>/insights` — `level=campaign, time_increment=1, date_preset=last_30d`, fields: `campaign_id,campaign_name,spend,impressions,clicks,reach,cpc,cpm,ctr,actions,action_values,cost_per_action_type,date_start,date_stop`
   - paginate (`paging.next`); use the Firestore-stored token + `appsecret_proof`.
4. **Production token:** move unattended pulls from the user OAuth token to a **System User** (non-expiring) under **ArkData's** Business Portfolio, with the client ad account shared to ArkData via **partner access**. (Today's dev pull uses Shaw's personal token — fine to bootstrap, not for prod.)
5. **Schedule** (Cloud Scheduler / Firebase scheduled function): pull per connected ad account on an interval → store.
6. **Expose to salesmatch-funnel** — pick one:
   - (a) write normalized JSON to a store the app reads, **or**
   - (b) an authenticated endpoint returning `{ campaigns: CampaignPerf[], account: AccountSummary }`.

## The contract (already defined — implement against it)
`salesmatch-funnel/src/data/meta.ts` is the source of truth:
- Types: **`CampaignPerf`**, **`AccountSummary`**, `CampaignStatus`, `ActionKind`.
- **`normalizeMeta(raw)`** — a reference normalizer that turns the raw pull shape `{ account, campaigns, insights }` into the contract. **Reuse it** (copy server-side or share), so server + client never drift.
- **`recommendAction(...)`** — the scale/fix/pause/underspend logic; keep it identical so recommendations match across surfaces.
- **`CONVERSION_ACTION_TYPES`** — which Meta `action_type`s count as a conversion. **Confirm against Lions Pride's real data** (the dev pull prints the action types it sees) — lead-gen accounts use `lead` / `offsite_conversion.fb_pixel_lead`; commerce uses `purchase`.

## Dev seam (works end-to-end TODAY, no infra)
salesmatch-funnel reads `src/data/real/meta-*.json` (gitignored) via `import.meta.glob`. If a file is present it's used (`source: 'live'`); else mock (`source: 'sample'`).
→ Run `node scripts/meta-pull.mjs` (reads `.env.local`) to drop a real pull there and light up the UI with real numbers. That same JSON shape is exactly what `normalizeMeta` expects, so your scheduled pull can write the identical structure.

## Out of scope here (separate workstream)
- **`verifiedConversions`** is currently `conversions × 0.86` (placeholder). The *real* verified number comes from the **ArkData pixel + Conversions API** on the client's site (person-level dedup) — that's the reconciliation layer, wired separately. Marketing API gives platform-*claimed* numbers only.
- **`targetCpaCents`** (CPA goal) is agency-set, not from Meta — comes from a goals/targets feature in salesmatch-funnel (next).

## TL;DR
Add `ads_read`+`read_insights` to the existing app, port `scripts/meta-pull.mjs` into a scheduled Firebase function using the Firestore token (→ System User for prod), normalize with `normalizeMeta`, and hand salesmatch-funnel `{campaigns, account}` in the `meta.ts` shape. The UI is already built and waiting on that contract.
