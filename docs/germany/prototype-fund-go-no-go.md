# Funding Go / No-Go — Prototype Fund & backups (#10)

*Research date: 20 August 2026. Every claim below traces to a primary/official source; live-site pages that 403-block automated fetching are flagged "verify in browser." Fits the build-then-sell plan: applications are prepared now, but the product must be demoable/fixed before these deadlines.*

## TL;DR

| Funder | Verdict | Window | Fit for solo builder |
|---|---|---|---|
| **NLnet — Restack** (NGI successor) | **PURSUE FIRST** | Opens **3 Sep 2026**, deadline **3 Nov 2026 12:00 CEST** | Individual-eligible, EU-funded, OSS, €5k–€50k. Earliest deadline. |
| **Prototype Fund — Cohort 03** | **WAIT (then apply)** | Applications **1 Oct → 30 Nov 2026** | Solo German-resident, €47.5k / 6 mo, OSS. Needs reframing (see risk). |
| **Auswärtiges Amt** resilience calls | Conditional | Per-embassy, rolling | ~€20k, but org-oriented — needs a small entity. |
| **EU CERV FIMI 2026** | Consortium only | Deadline **29 Apr 2026 (passed)** | Only as tech partner in an NGO-led consortium. |

**Bottom line:** apply to **NLnet Restack first** (soonest, individual-friendly), then **Prototype Fund Cohort 03**. Both require the open-source core to exist and demo — which is why "fix the application" gates outreach in the plan.

---

## 1. Prototype Fund — WAIT, then apply (Cohort 03)

- **Status:** Alive and **restructured, funded through 2029** (not discontinued). Run by Open Knowledge Foundation Deutschland, funded by **BMFTR** (the former BMBF, renamed 6 May 2025). Grant no. 01IS24086. It is *not* the Sovereign Tech Fund and *not* EU-funded.
- **Next round:** **No round open now.** Cohort 03 applications **1 Oct 2026 → 30 Nov 2026**. Cadence cut to **one round/year (autumn)**.
- **Eligibility:** **Germany residency required** (Wohnsitz, self-employed/freelance, taxed in Germany, 18+). Solo or teams ≤4 (GbR). **Software only.**
- **Prior work:** New-prototype oriented + "no double funding" check, **but prior work is not disqualifying** — you declare existing status and the **new features** you'll build. An extractable, standalone open-source core is plausibly fundable.
- **Terms:** Individuals **up to €47,500 / 6 months** (95% grant + 5% own contribution, €50/hr). Optional 4-month "Second Stage." OSS licence **recognised by OSI or FSF** required (MIT/BSD/Apache or GPL/LGPL/MPL/AGPL).
- **⚠️ Main risk — theme fit:** Current focus areas are **"data security"** and **"software infrastructure."** A bare *"disinformation/FIMI monitoring"* pitch does **not** obviously fit. **Reframe** the fundable component as reusable open-source *software infrastructure* (e.g. "standardized protocol implementations / packages" — their own words) or *data-security* tooling.
- **Action before 1 Oct:** email **info@prototypefund.de** to confirm (a) residency/freelance status qualifies, (b) the "new component vs. existing platform" question, (c) theme-fit. Verify verbatim rules in the [Application Guide PDF](https://www.prototypefund.de/uploads/Publikationen_und_Onepager/ApplicationGuide.pdf) (live site 403s bots).

## 2. NLnet — Restack — PURSUE FIRST

- **What:** NGI Zero's EU-funded successor under the EC "Open Internet Stack" / Tech Sovereignty package. **Restack** = €10M Horizon Europe cascade-funding programme (grant No. 101299072), small/medium grants **€5,000–€50,000**, scalable.
- **Eligibility:** **Individuals eligible.** Global but **EU-priority**; requires a **"European dimension,"** R&D focus, results under a recognised free/open-source licence, code public from start, ~2-page application. Milestone-based payments.
- **Window:** classic NGI Zero paused June 2026; **Restack reopens 3 Sep 2026, deadline 3 Nov 2026 12:00 CEST.**
- **⚠️ Framing:** NLnet funds **"trust & data sovereignty,"** *not* "FIMI/disinformation" explicitly. Pitch AIIM's core as **provenance / media-transparency / open-standards trust infrastructure with a European dimension**, not a counter-disinfo product.
- **Live discrepancy to check:** `nlnet.nl/funding.html` listed some funds "open" while the propose page said "no calls open" — **verify at [nlnet.nl/propose](https://nlnet.nl/propose/)** before relying on any earlier date.

## 3. Backups (mostly not solo-viable — for the record)

- **Auswärtiges Amt** "Resilienz- und Medienkompetenz" calls — ~€20k, 1 yr, per-embassy deadlines; normally **organisations**, software-tool eligibility unconfirmed. Best path: register a small entity, frame as country-specific resilience.
- **EU CERV FIMI 2026** (`CERV-2026-CITIZENS-CIV-ENGAGEMENT-DISINFOFIMI`) — €10M, min grant €75k, 12–24 mo; **natural persons excluded** (self-employed OK); lead must be non-profit/university. **Deadline 29 Apr 2026 — passed.** Realistic only as consortium tech partner next cycle.
- **Sovereign Tech Fund** — funds **maintenance of existing critical infra, not new prototypes.** Wrong fit.
- **Media Lab Bayern Fellowship** — up to €40k, good theme, but **team + working prototype required**; next batch ~early 2027.
- **Civic Coding (CIP)** — individual-eligible historically, **no open call now** (watch civic-coding.de).
- **Netzwerk Recherche Grow-Stipendien** — funds journalism tools but only **€3k** + mentoring, DACH-only, currently closed.
- **Superrr Lab / EEAS FIMI-ISAC** — **not funders**; useful as network/allies and for adopting FIMI/DISARM standards.
- **EDMO / DSA / Horizon CL2 / Creative Europe** — **consortium-only**, not solo-accessible.

## 4. Recommendation & timeline

1. **Now → 3 Sep:** finish the open-source core carve-out + get German demo working (product gate). Draft the Restack ~2-page application framed as *open-internet trust/provenance infrastructure*.
2. **3 Sep → 3 Nov:** submit **Restack**.
3. **Sep → 30 Nov:** confirm Prototype Fund residency/theme fit by email; submit **Cohort 03** framed as *software infrastructure / data security*. No conflict applying to both (different funders; only same-work double-funding is barred).
4. **Prerequisite for all of the above:** the application must be fixed and demoable — CI green + fresh-deploy bug (#29). That's the gate.

## 5. Verification caveats
- **Verified (primary/official):** PF renewal-through-2029, BMBF→BMFTR rename, Cohort 03 dates, €47.5k/6-mo terms, OSI/FSF licence rule, Germany-residency rule, "prior work OK / no double funding"; NLnet pause + Restack (€10M Horizon, €5k–50k, individuals eligible, 3 Sep→3 Nov); CERV FIMI dates/eligibility.
- **Could not fully verify (browser check):** verbatim PF "new project" clause + non-EU team-member residency nuance; whether AA embassy calls fund software / accept individuals; a stray aggregator "14 Mar 2026" PF date (likely a jury milestone, not a deadline); NLnet funding.html vs propose-page discrepancy.
