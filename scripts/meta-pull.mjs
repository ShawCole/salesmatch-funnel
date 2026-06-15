#!/usr/bin/env node
// Pull real Meta campaign data for building with actual numbers.
// No dependencies (Node 22 global fetch + crypto). Reads .env.local.
//
//   node scripts/meta-pull.mjs            # discover accounts + pull campaigns/insights
//   node scripts/meta-pull.mjs --accounts # just list ad accounts you can see
//   node scripts/meta-pull.mjs --exchange # print a long-lived token and exit
//
// Writes src/data/real/meta-<actId>.json (gitignored).
import { createHmac } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---- load .env.local (simple parser) ----
const env = { ...process.env };
const envPath = join(ROOT, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const V = env.META_API_VERSION || 'v21.0';
const BASE = `https://graph.facebook.com/${V}`;
let TOKEN = env.META_ACCESS_TOKEN;
const APP_ID = env.META_APP_ID;
const APP_SECRET = env.META_APP_SECRET;
const args = process.argv.slice(2);

if (!TOKEN) {
  console.error('✗ META_ACCESS_TOKEN missing. Copy .env.local.example → .env.local and paste your Graph API Explorer token.');
  process.exit(1);
}

function proof() { return APP_SECRET ? createHmac('sha256', APP_SECRET).update(TOKEN).digest('hex') : undefined; }

async function api(path, params = {}) {
  const url = new URL(path.startsWith('http') ? path : `${BASE}/${path}`);
  url.searchParams.set('access_token', TOKEN);
  const p = proof(); if (p) url.searchParams.set('appsecret_proof', p);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : v);
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) {
    const e = json.error;
    let hint = '';
    if (e.code === 190) hint = ' → token expired/invalid. Re-generate in Graph API Explorer.';
    else if (e.code === 100) hint = ' → bad field/permission or API version. Ensure ads_read + read_insights were granted.';
    else if (e.code === 4 || e.code === 17 || e.code === 80004) hint = ' → rate limited. Wait and retry.';
    else if (e.code === 200 || e.code === 10) hint = ' → permission denied on this asset.';
    throw new Error(`Meta API error [${e.code}/${e.type}]: ${e.message}${hint}`);
  }
  return json;
}

async function pageAll(path, params) {
  let out = [];
  let next = null;
  let first = await api(path, { ...params, limit: 100 });
  out = out.concat(first.data || []);
  next = first.paging?.next;
  let guard = 0;
  while (next && guard++ < 50) {
    const j = await api(next);
    out = out.concat(j.data || []);
    next = j.paging?.next;
  }
  return out;
}

async function exchangeLongLived() {
  if (!APP_ID || !APP_SECRET) { console.error('✗ Need META_APP_ID + META_APP_SECRET to exchange.'); process.exit(1); }
  const url = new URL(`${BASE}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', APP_ID);
  url.searchParams.set('client_secret', APP_SECRET);
  url.searchParams.set('fb_exchange_token', TOKEN);
  const j = await (await fetch(url)).json();
  if (j.error) throw new Error(j.error.message);
  return j;
}

async function main() {
  // whoami
  const me = await api('me', { fields: 'id,name' });
  console.log(`✓ Authenticated as: ${me.name} (${me.id})`);

  // optional: exchange to long-lived
  if (args.includes('--exchange')) {
    const j = await exchangeLongLived();
    console.log(`\n✓ Long-lived token (expires in ~${Math.round((j.expires_in || 5184000) / 86400)} days):\n\n${j.access_token}\n\nSave it as META_ACCESS_TOKEN in .env.local.`);
    return;
  }
  if (APP_ID && APP_SECRET) {
    try { const j = await exchangeLongLived(); TOKEN = j.access_token; console.log(`✓ Exchanged for long-lived token (~${Math.round((j.expires_in || 5184000) / 86400)}d).`); }
    catch (e) { console.log(`(note: long-lived exchange skipped — ${e.message})`); }
  }

  // discover ad accounts
  const accounts = await pageAll('me/adaccounts', { fields: 'id,account_id,name,account_status,currency,business{id,name}' });
  console.log(`\n✓ ${accounts.length} ad account(s) visible:`);
  accounts.forEach((a) => console.log(`   ${a.id}  ${a.name}  [${a.business?.name || 'personal'}]  ${a.account_status === 1 ? 'ACTIVE' : 'status ' + a.account_status}`));

  if (args.includes('--accounts')) return;

  // pick target
  let target = env.META_AD_ACCOUNT;
  if (!target) {
    const match = accounts.find((a) => /lion|pride|fund|fast/i.test(a.name || '')) || accounts.find((a) => a.business?.id === env.META_BUSINESS_ID) || accounts[0];
    target = match?.id;
  }
  if (!target) { console.error('✗ No ad account found. Set META_AD_ACCOUNT=act_XX…'); process.exit(1); }
  if (!target.startsWith('act_')) target = `act_${target}`;
  const acct = accounts.find((a) => a.id === target);
  console.log(`\n→ Pulling ${target} ${acct ? `(${acct.name})` : ''}`);

  // campaigns (status/objective/budget)
  const campaigns = await pageAll(`${target}/campaigns`, {
    fields: 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time',
  });
  console.log(`✓ ${campaigns.length} campaigns`);

  // daily insights at campaign level, last 30d
  const insights = await pageAll(`${target}/insights`, {
    level: 'campaign',
    time_increment: 1,
    date_preset: 'last_30d',
    fields: 'campaign_id,campaign_name,spend,impressions,clicks,reach,frequency,cpc,cpm,ctr,actions,action_values,cost_per_action_type,date_start,date_stop',
  });
  console.log(`✓ ${insights.length} daily insight rows`);

  // account-level rollup, last 30d
  const accountInsights = await pageAll(`${target}/insights`, {
    level: 'account', date_preset: 'last_30d',
    fields: 'spend,impressions,clicks,reach,cpc,cpm,ctr,actions,action_values,date_start,date_stop',
  });

  const outDir = join(ROOT, 'src/data/real');
  mkdirSync(outDir, { recursive: true });
  const out = {
    account: { id: target, name: acct?.name, currency: acct?.currency, business: acct?.business },
    pulledAt: new Date().toISOString(),
    range: 'last_30d',
    campaigns, insights, accountInsights,
  };
  const file = join(outDir, `meta-${target}.json`);
  writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`\n✓ Wrote ${file}`);

  // quick sanity summary
  const totalSpend = insights.reduce((a, r) => a + Number(r.spend || 0), 0);
  const totalClicks = insights.reduce((a, r) => a + Number(r.clicks || 0), 0);
  console.log(`\nLast 30d: $${totalSpend.toFixed(2)} spend · ${totalClicks.toLocaleString()} clicks · ${campaigns.filter((c) => c.effective_status === 'ACTIVE').length} active campaigns`);
  // show what conversion action types exist (so we map the right one)
  const actionTypes = new Set();
  insights.forEach((r) => (r.actions || []).forEach((a) => actionTypes.add(a.action_type)));
  if (actionTypes.size) console.log(`Conversion action types seen: ${[...actionTypes].join(', ')}`);
}

main().catch((e) => { console.error(`\n✗ ${e.message}`); process.exit(1); });
