# LLM Council — How should ArkData compete with Viktor? (2026-06-14)

## Framed question
How should ArkData (pixel-verified, person-level full-funnel attribution; multi-tenant; the partner-payouts wedge; currently mock-data, real-data wiring via Meta token + DB **blocked**) compete with **Viktor** — a $75M Series-A (Accel) AI "coworker" that runs Meta/Google ads from Slack via ~140 actions with shallow attribution (Meta revenue vs Stripe), ~$15M ARR in 10 weeks, 12k teams, near-zero install friction? Viktor = action layer; ArkData = measurement/truth layer.
Options: **(A)** conversational Slack agent "Ask ArkData"; **(B)** integrate WITH Viktor as the verified-measurement layer; **(C)** double down on measurement + partner-payouts wedge; **(D)** become an action layer head-on. What to pursue, sequencing, and what NOT to do?

---

## Advisor responses

### The Contrarian
Viktor is at $15M ARR in 10 weeks; ArkData has mock data and no real Meta token wired. This isn't a fair fight on distribution — don't pick the fight that requires winning on distribution. Fatal flaw: the brief treats "measurement truth" as a moat, but nobody buys truth — they buy money. Viktor's shallow attribution wins because it's attached to an action that moves spend TODAY. ArkData's reconciliation tells an agency they over-paid last quarter — an accusation, not a purchase. Verified payouts only matter if a partner network already exists and is fighting about money. Have you talked to five such customers? NOT (D) — suicide vs 140 actions/3,200 integrations. NOT (A) as primary — Viktor's UX without Viktor's distribution, on mock data = vaporware. (B) makes you a feature a $75M company copies in a sprint. So (C), ruthlessly narrowed: pick ONE partner-network vertical that already pays partners and disputes attribution; wire real data for THEM first. Mock data is your real competitor right now, not Viktor.

### The First Principles Thinker
Stop — ArkData and Viktor are not in the same race. Viktor sells distribution/convenience (commoditizes the moment Meta ships the buttons natively). ArkData sells "the right to be believed" — an adjudication function. When real money moves (partner payouts, agency-to-client billing, over-attribution disputes), someone must be the source of truth both sides accept. The real question isn't "how do I compete with Viktor" — it's "who needs a referee, and will they pay?" Answer: agencies and partner networks settling real money; not SMBs clicking "scale budget." C is the business (a system of record, not a dashboard). B is the moat dressed as humility — be the truth Viktor's actions are graded against; action layers NEED an independent referee. NOT D — becoming an action layer destroys your only defensible asset, neutrality; a referee who plays can't be trusted. A only as an interface to truth you already own. You're not the faster horse — you're the scorekeeper. Don't enter the race.

### The Expansionist
Don't frame this as "compete." Viktor just spent $75M proving 12,000 teams will wire ad spend into a Slack agent — then handed them attribution so shallow it exports to Sheets. That's a top-of-funnel machine generating thousands of buyers about to discover their action layer is optimizing against fiction. Verified truth is the layer that compounds; actions are racing to zero margin. Lean into B AND C: be the "verified-by-ArkData" substrate Viktor and every action agent must cite — like Stripe Radar or Plaid sitting underneath everyone. Partner-payouts is a category Viktor structurally cannot enter (too unsexy/vertical for a $75M VC-funded co) — a wedge into the $14B+ affiliate/partner-network economy where verified conversions ARE the product. Ship "Ask ArkData" (A) fast as the trust oracle, not an action clone: "Viktor wants to 3x this budget; ArkData says 40% of that revenue is double-counted." Be the second opinion every buyer screenshots. NOT D — a worse Viktor with no distribution.

### The Outsider
How both pitches sound cold: Viktor — "I'll run your ads from Slack" (understood in four words). ArkData — "pixel-verified person-level deterministic attribution with reconciliation to one truth via the measurement trifecta" (needed a dictionary). That's the real problem, worse than the strategy question. A media buyer wakes up wanting to spend less and make more today, not "truth." Viktor does a thing; ArkData explains a concept. Do NOT build "Ask ArkData" (A) — entering Viktor's home turf with a chatbot that returns paragraphs; you'd lose and blur the one thing legibly different. Do NOT chase D (worse Viktor). Do C as foundation, B as go-to-market. The payouts wedge is the only thing a normal person instantly values: "you get paid for conversions that are actually real, not the ones Meta inflated." A sentence with money in it. Then B: "Viktor pulls the levers, ArkData tells it which levers are real." But first — rewrite the pitch to one plain sentence a tired ad buyer nods at.

### The Executor
Pursue C, with a thin slice of A — only what's buildable Monday without real data. Reality: real-data wiring is BLOCKED, which kills B and D outright (B needs a live verified feed to hand Viktor; D needs writing to ad accounts you can't even read yet). What you CAN do Monday: (1) Harden the wedge (C) — partner-hierarchy roll-ups + payout ledger tied to verified conversions; it's a UI/logic problem, runs fine on mock. Build the payout reconciliation view, partner statement export, "verified conversion → commission" trace. (2) Unblock the Meta token + DB — highest-leverage task on the board; until one tenant sees one real conversion, you're a demo. (3) Upgrade the "Route to Slack" stub into the thin slice of A: one anomaly alert that fires into Slack with a verified number. Do NOT chase Viktor's integration count, build a conversational agent, or write to ad accounts. Monday: token first, payout ledger second, one real Slack alert third.

---

## Peer reviews (anonymized mapping: A=Outsider, B=Executor, C=Contrarian, D=First Principles, E=Expansionist)

**Reviewer 1:** Strongest = D (referee/adjudication; only internally consistent strategy across all four options). Biggest blind spot = E (hand-waves the BLOCKED data constraint; "be the substrate everyone cites" impossible with no real conversion). All missed: customer evidence & timing — nobody named the first check-writer or the unblock ETA.

**Reviewer 2:** Strongest = D (uniquely identifies WHO pays + why D-the-option is self-destructive). Blind spot = E (ignores binding constraint; B names it). All missed: demand validation + Viktor's clock ($75M buys them shipping/acquiring verified measurement before ArkData unblocks data). Real question: can we validate one paying referee customer AND wire their real data before Viktor closes the gap?

**Reviewer 3:** Strongest = D (neutrality principle; "B is the moat dressed as humility"). Blind spot = E (substrate vision with no substrate). All missed: does Viktor even WANT a referee that grades it 40% fiction? It won't integrate the layer exposing its weakness — it'll bury or clone it. Also unexamined: is ArkData's pixel actually more truthful, or a different bias?

**Reviewer 4:** Strongest = D (referee/system-of-record; names the real buyer). Blind spot = E (Stripe-Radar-on-mock-data is vaporware; B sequences around the block). All missed: validation + unit economics; whether disputed-attribution pain is acute enough to pay for; and Viktor bolting on "good-enough" verified measurement once buyers complain.

**Reviewer 5:** Strongest = D (names the business model; "a referee can't play" makes NOT-D non-negotiable). Blind spot = E (oversells A; ignores blocked data). All missed: whether ArkData's pixel can actually verify person-level truth post-iOS14 / cookie-deprecation / server-side CAPI — the entire "right to be believed" rests on measurement that may be as inferential as Viktor's. Zero customer evidence. No one models Viktor acquiring/partnering its way to "verified" first.

---

## Chairman's verdict

### Where the council agrees (high-confidence)
1. **Do NOT become an action layer (D).** Unanimous. Unwinnable vs 140 actions / 3,200 integrations, and — the deeper reason — it destroys neutrality, your only defensible asset. A referee who plays can't be trusted.
2. **The partner-payouts wedge (C) is the business**, not a feature. Verified conversions where money actually changes hands (agencies, partner networks) — not SMBs who "want fewer tabs."
3. **Reframe the category, don't enter Viktor's race.** You're the referee / source-of-truth / scorekeeper, not a faster horse. Distribution is Viktor's game; adjudication is yours.
4. **The binding constraint is data, not strategy.** Mock data is the real competitor right now. Unblock the Meta token + DB; "until one tenant sees one real conversion, you're a demo."
5. **The pitch is unsellable as written.** Lead with the money sentence — "get paid for conversions that are actually real, not the ones Meta inflated" — not "pixel-verified person-level deterministic attribution."

### Where the council clashes
- **Option A ("Ask ArkData"):** Expansionist wants it shipped fast as a "trust oracle / second opinion." Outsider + Contrarian + Executor say no — it's Viktor's home turf and vaporware on mock data. **Resolution:** A only as a *thin, verified-number alert/oracle* interface to truth you own (Executor's "one real Slack alert with a verified number"), never a conversational Viktor clone.
- **Option B ("be the layer"):** Expansionist/First-Principles call it leverage (the referee everyone cites); Contrarian calls it a copyable feature. **Peer review broke the tie:** Viktor will not voluntarily integrate the layer that grades it 40% fiction. So B is right only as an *independent standard buyers demand* — not as "feed Viktor and hope."

### Blind spots the peer review caught
- **No customer evidence.** Does a design partner with a *live* partner-network / attribution-dispute exist now? Validate before building more.
- **Verification credibility is unproven.** Post-iOS14 / cookie-deprecation / server-side CAPI, is the pixel genuinely more truthful — or just a different bias? The entire "right to be believed" rests on this being *provable*.
- **Viktor's clock.** $75M can bolt on or acquire "good-enough verified" before ArkData unblocks data.

### The recommendation
**Pursue C as the business, framed through D's lens (you are the referee / system-of-record for money that moves on verified conversions — agencies & partner networks). Use B as positioning ("the verified truth action layers are graded against") built as an independent standard, not dependent on Viktor's goodwill. Keep A as a thin verified-alert surface only. Do NOT do D.**

But this is gated on two unvalidated assumptions: a buyer in real pain exists, and the pixel can deliver *defensible* verified truth on real data. So the next work is not more features or strategy — it's **proof**.

### The one thing to do first
**Land ONE real design partner — an agency or partner-network that already pays partners and disputes attribution — wire their real Meta data + DB, and show ONE real "over-attribution → verified-payout" delta in dollars.** That single proof validates the buyer, the pixel's credibility, and the wedge simultaneously. Everything else waits behind it.
