# Full-Funnel Attribution UI — Platform Analysis

**Date:** 2026-06-08  
**Status:** Product Scoping & Architecture Assessment  

---

## Executive Summary

The current SalesMatch funnel prototype (`sm-funnel.netlify.app`) is a **static, single-pipeline visualization** that shows funnel progression from intent → conversion, with demographic breakdowns and intent-platform matching. The vision to transform this into a **live, multi-platform attribution dashboard** requires:

1. **Data pipeline overhaul** — ingest from Meta, Google, TikTok, LinkedIn, DSPs, and email platforms in near-real-time
2. **Attribution engine** — multi-touch attribution to credit each platform/campaign/creative for its contribution to each funnel stage
3. **Multi-tenant data architecture** — tenant/partner/admin role-based views with proper data isolation
4. **Interactive attribution UI** — replace static configs with live data, platform breakdown per stage, drill-down analysis, and cohort tracking
5. **ArkData pixel integration** — visualize how pixel-captured visitors flow into audiences and retargeting campaigns

**Complexity:** Very High | **Duration:** 5–7 months | **Tech Stack:** React + Node.js + PostgreSQL + Pub/Sub

---

## 1. Current State Audit

### ✅ What Works
- Funnel visualization: 5-stage pipeline (Intent → Ad Audience → LP Visitors → Retarget → Converted) is clear
- Admin mode: editable counts with localStorage persistence
- Responsive design: mobile + desktop layouts
- Filter-driven analytics: demographic filtering (age, income, credit, seniority, city, state)
- Geo context: PMTiles choropleth shows intent distribution
- Clean component composition: separates cards, charts, pipeline logic

### ❌ What's Placeholder / Missing
- **Data source:** static `/funnel-config.json` checked into git (no live API)
- **Attribution logic:** no actual algorithm; counts manually entered
- **Real-time updates:** no polling, WebSocket, or push mechanism
- **Multi-platform visibility:** doesn't show which platforms (Meta, Google, TikTok) drove each stage
- **Creative/campaign drill-down:** can list assets but no conversion attribution per creative
- **Pixel integration:** mentions ArkData pixel but no actual pixel event ingestion or audience sync flow
- **Multi-tenant UI:** no tenant/partner/admin role differentiation
- **Cohort tracking:** no ability to follow a campaign cohort through the funnel
- **Attribution model selection:** UI assumes last-touch; no toggle for first-touch, linear, time-decay

### ⚠️ Technical Debt
- **Backend missing:** no Node.js or Python orchestration service
- **Data warehousing:** frontend-only; no persistent funnel warehouse or audit trail
- **Real-time:** no message queue (Kafka/Pub-Sub) or stream processing
- **Auth/RBAC:** no tenant isolation or role-based access control

---

## 2. Data Source Integrations Needed

### Meta Ads API
- **Endpoint:** `https://graph.instagram.com/v20.0/`
- **Key:** campaigns, ads, creatives, ad_sets, insights, custom_audiences
- **Auth:** OAuth 2.0
- **Rate:** 200 calls/hour (insights), 1,200 calls/hour (other)
- **Freshness:** ~24 hours
- **Challenge:** iOS privacy restrictions undercount conversions; audience size noisy due to privacy

### Google Ads API
- **Endpoint:** `https://googleads.googleapis.com/v17/`
- **Key:** campaigns, ads, assets, conversion_actions, conversion_tracking
- **Auth:** OAuth 2.0 + Customer ID
- **Rate:** 10,000 requests/day
- **Freshness:** ~2 hour delay on conversions
- **Challenge:** requires Customer ID per tenant; conversion granularity varies

### TikTok Ads API
- **Endpoint:** `https://business-api.tiktok.com/open_api/v1.3/`
- **Key:** campaigns, ads, creative_assets, conversion_events, audience_manager
- **Auth:** OAuth 2.0
- **Rate:** 100 calls/second
- **Freshness:** ~24 hour delay on conversions

### LinkedIn Ads API
- **Endpoint:** `https://api.linkedin.com/v2/`
- **Key:** adCampaigns, adCreatives, adAnalytics, conversions
- **Auth:** OAuth 2.0
- **Rate:** 300 calls/minute
- **Freshness:** ~24 hour delay

### DSP & Email
- **The Trade Desk:** Already relationship; DataMoon API access likely
- **Email:** Klaviyo, ConvertKit (REST + webhooks)

---

## 3. Attribution Model Options

### Recommended Path

**Phase 1:** Last-Touch + First-Touch toggle  
**Phase 2:** Add Linear + Time-Decay  
**Phase 3+:** Data-Driven (ML-based)

| Model | Best For | Complexity |
|-------|----------|-----------|
| Last-Touch | Performance marketing | Easy |
| First-Touch | Awareness campaigns | Easy |
| Linear | Fair credit across all stages | Medium |
| Time-Decay (U-shaped) | B2B (first + last matter most) | Medium |
| Data-Driven (ML) | Holistic attribution | Hard |

**Lookback Window:** Default 30 days (configurable: 7, 14, 30, 60)

---

## 4. Real-Time vs. Batch Architecture

### Tiered Approach

| Tier | What | Latency | Method |
|------|------|---------|--------|
| Real-Time | Impressions, clicks | <1 min | Webhooks + Pub/Sub |
| Near-Real-Time | LP visits (pixel fires) | 5–15 min | Message queue aggregation |
| Eventually Consistent | Conversions, revenue | 24–48 hrs | Nightly batch jobs |

### Stack Diagram
```
Ad Platforms (webhooks)
    ↓
Event Router (normalize, dedup)
    ↓
Pub/Sub (5-min aggregation)
    ↓
Redis Cache (live metrics)
    ↓
Frontend (WebSocket)
    
PostgreSQL (transactional) → BigQuery (nightly warehouse)
```

---

## 5. The ArkData Pixel's Role

### Flow
```
[Ad Impression] → [Click] → [LP Visit] → [Pixel Fire]
                                           ├─ Intent Match
                                           ├─ Audience Builder
                                           ├─ Platform Sync
                                           └─ Conversion Matching
```

### Data Flow by Stage

| Stage | Event | Source | Latency |
|-------|-------|--------|---------|
| Intent Core | Intent signal | RetargetIQ API | 24 hrs |
| Ad Audience | Audience match | Platform API | 24 hrs |
| LP Visitors | Pixel fire | ArkData pixel | Real-time |
| Retarget Audience | Audience sync | Platform API | 24 hrs |
| Converted | Conversion event | Platform API | 24–48 hrs |

### Key Challenges
1. **Cross-device tracking:** Pixel captures current device only
2. **Attribution delay:** 24 hrs for platform conversion events
3. **Audience sync latency:** 6-hour batches (users not retargetable immediately after pixel fire)
4. **Privacy:** iOS App Tracking Transparency breaks pixel-to-conversion matching
5. **Intent freshness:** RetargetIQ refreshes daily

---

## 6. Multi-Tenant Data Architecture

### Role-Based Access

| Role | Can See | Scope |
|------|---------|-------|
| Platform Admin | All funnel data | Global |
| Tenant Owner | Their campaigns | Tenant + children |
| Partner | Assigned tenants only | Partner's tenants |
| Campaign Manager | Their campaigns | Campaign level |

### PostgreSQL Schema
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name VARCHAR, type ENUM ('platform', 'tenant', 'partner'),
  parent_tenant_id UUID
);

CREATE TABLE campaigns (
  id UUID PRIMARY KEY, tenant_id UUID NOT NULL,
  platform ENUM ('meta', 'google', 'tiktok', ...),
  created_at TIMESTAMP
);

CREATE TABLE funnel_events (
  id UUID PRIMARY KEY, campaign_id UUID NOT NULL, tenant_id UUID NOT NULL,
  stage ENUM ('impression', 'click', 'pixel_fire', ...),
  timestamp TIMESTAMP, count INT
);

CREATE INDEX idx_funnel_events_tenant_stage ON funnel_events(tenant_id, stage, timestamp);
```

### Security
- JWT claims include `tenant_id` + `tenant_type`
- Row-Level Security (RLS) enforces filtering at DB layer
- API middleware checks resource vs. user tenant_id
- Audit log on all data access

---

## 7. UI Components Needed

### New Components
1. **Attribution Model Selector** — dropdown + toggle effect
2. **Platform Breakdown View** — stacked bar/donut per stage (Meta, Google, TikTok, etc.)
3. **Campaign Cohort Drill-Down** — follow cohort through funnel
4. **Real-Time Metrics Feed** — live ticker (+50 impressions, +12 conversions)
5. **Attribution Waterfall** — show each touch, credit per model
6. **Tenant/Partner Selector** — multi-tenant dropdown + breadcrumb
7. **Audience Eligibility View** — "Of 50K pixel fires, 15K matched retarget"
8. **Conversion Path Sankey** — flow from impression → conversion
9. **Export & Reporting** — PDF/CSV with current view + metadata
10. **Admin Settings Panel** — webhooks, API keys, sync schedule

### Component Evolution
- **PipelineDashboard:** Connect to `/api/funnel`, refetch 5 min, show "Last updated X min ago"
- **PipelineRow:** Add per-platform breakdown, show "% contribution"
- **HighlightBar:** Add attribution model label, delta vs. yesterday, confidence score
- **FunnelChart:** Platform color coding in bars, toggle to Sankey

---

## 8. Tech Stack

### Existing (Solid)
- React 18 + TypeScript + Tailwind
- Vite (build)
- Chart.js + custom components
- Mapbox GL + PMTiles

### Additions Needed

| Component | Tech | Rationale |
|-----------|------|-----------|
| Backend | Node.js + Express + Python | Express for REST/WebSocket; Python for data transform |
| Primary DB | PostgreSQL | OLTP, transactional, RLS support |
| Warehouse | BigQuery or Redshift | OLAP, attribution queries, historical analysis |
| Cache | Redis | Real-time metrics, Pub/Sub, session store |
| Queue | Google Pub/Sub | Streaming, BigQuery native, serverless |
| Real-Time | Socket.io | WebSocket auto-reconnect, broadcasting |
| Scheduler | Cloud Scheduler | Lightweight, Pub/Sub integration |
| Monitoring | Datadog or Honeycomb | Real-time dashboards, distributed tracing |

### Architecture
```
Frontend (React)
    ↓
Node.js API (Express)
    ├─ /api/funnel
    ├─ /api/campaigns
    └─ /api/admin
    ↓
PostgreSQL + Redis + BigQuery
    ↓
Event Router (Python)
    ├─ Meta, Google, TikTok webhooks
    ├─ Normalize + dedup
    └─ Route to Pub/Sub
    ↓
Cloud Scheduler + Airflow
    ├─ 5-min: Aggregate Pub/Sub → Redis
    ├─ 1-hour: Sync platform insights
    ├─ 6-hour: Audience sync
    └─ Daily: Warehouse reconciliation
```

---

## 9. Comparable Products

### Key Learnings
- **Northbeam:** Cohort tracking high-value; path analysis (Sankey) resonates; DDA is phase 2+
- **Rockerbox:** Expose creative + campaign breakdowns; optimize for B2B not e-commerce
- **HockeyStack:** Attribution model choices must be very visible; CRM integration comes later
- **Triple Whale:** Real-time > batch; live feed is engaging

### Our Differentiators
1. **ArkData Pixel as primary source** — see earlier funnel stages than competitors
2. **Multi-tenant (Partner/Tenant/Admin)** — unique positioning for agencies
3. **Intent integration** — RetargetIQ/DataMoon as native funnel stage
4. **Real-time pixel events** — within 5 min, not 24-hour delayed

---

## 10. Complexity Estimates

### Phase 1: MVP (8–10 weeks)
**Scope:** Live funnel (Meta + Google), last-touch, single tenant

| Component | Effort |
|-----------|--------|
| Backend API + PostgreSQL | M |
| Meta Ads API | L |
| Google Ads API | L |
| Event normalization | M |
| Pub/Sub → Redis aggregation | M |
| WebSocket real-time | M |
| Last-touch attribution | S |
| Frontend integration | S |
| Real-time updates | M |
| Admin settings UI | M |
| Testing + deploy | L |
| **Total: ~90 days** | **~3 FTE** |

### Phase 2: Extended Platforms (10–12 weeks)
**Scope:** TikTok, LinkedIn, DSP; multi-tenant; linear + time-decay

| Component | Effort |
|-----------|--------|
| TikTok + LinkedIn APIs | M |
| DSP integration | L |
| Email integration | M |
| Multi-tenant isolation | L |
| Attribution solver | L |
| Platform breakdown UI | M |
| Cohort drill-down | L |
| Audience eligibility | M |
| **Total: ~140 days** | **~4 FTE** |

### Phase 3: Advanced Analytics (8–10 weeks)
**Scope:** DDA (ML), Sankey, CRM sync, forecasting, reporting

| Component | Effort |
|-----------|--------|
| Data-driven attribution | XL |
| Sankey component | M |
| Audience optimization | L |
| Salesforce + HubSpot | L |
| Forecasting | L |
| Scheduled reports | M |
| **Total: ~100 days** | **~3 FTE** |

---

## 11. Go-Live Roadmap

### Phase 1: MVP (End of Q3 2026)
- Wks 1–2: Backend scaffold, auth, schema
- Wks 3–5: Meta API integration
- Wks 6–8: Google API, event normalization
- Wks 9–10: Pub/Sub, WebSocket, attribution
- Wks 11–12: Frontend integration, testing
- Wk 13: Staging + production deploy

### Phase 2: Extended (End of Q4 2026)
- Wks 1–3: TikTok, LinkedIn, DSP APIs
- Wks 4–6: Multi-tenant, RBAC
- Wks 7–9: Attribution solver, platform UI
- Wks 10–12: Cohort drill-down, audience eligibility
- Wk 13: UAT + launch

### Phase 3: Advanced (End of Q1 2027)
- Wks 1–4: DDA feature engineering + training
- Wks 5–8: Sankey, optimization, forecasting
- Wks 9–12: CRM integrations, reporting, polish

---

## Recommended Next Steps

1. **Approve questionnaire** — gather Shaw's input on priorities, constraints, monetization
2. **Sketch Phase 1 scope** — confirm Meta + Google; lock feature list
3. **Create backend service repo** — Express + PostgreSQL scaffold
4. **Set up staging environment** — Google Cloud project, CI/CD
5. **Onboard API credentials** — test ad accounts authorized
6. **Hire/assign data engineer** — multi-touch attribution is specialized

---

**Document Version:** 1.0  
**Last Updated:** 2026-06-08  
**Next Review:** After questionnaire responses
