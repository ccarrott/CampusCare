# Phase 29B — Symptom Intelligence & Escalation

The "smart triage" layer. Covers the review wording tweak (item 7), the symptom-checker UX + "not listed" escalation (item 8), week-window auto-escalation + "same as last time" prefill (item 12), and symptom search + autocomplete (item 17).

---

## Item 7 — Review nurse: "Your Review" → "Comment (Optional)"

### Essence
On the review-a-nurse form, the written review should be optional, worded "Comment (Optional)". A rating alone should be submittable.

### Current state
- The review form (in the reviews module views) currently labels the text area as a required "Your Review".
- Server-side: `reviews.controller` likely requires `ReviewText`. Need to allow empty comment while keeping the star rating required.

### Changes
1. **View**: relabel the textarea "Your Review" → **"Comment (Optional)"**, remove the `required` attribute, update any helper text.
2. **Controller** (`reviews.controller.js`): make `ReviewText` optional — default to empty string / null when blank; keep the star `Rating` required and `isValidScore`-validated. Sanitize the comment as before.
3. **Model/DB**: `NurseReviews.ReviewText` is `TEXT NOT NULL` per migrate.js — either allow empty string (`''`) inserts (simplest, no migration) or relax to NULL. Decision: **insert `''` for empty comments** to avoid a migration.
4. **Consistency**: the per-consultation Rating modal already treats comment as optional — align wording there too if it differs.

### Notes
- Empty-string comments should not render as an empty quote on public pages — the staff/profile views should conditionally show the comment only when non-empty.

---

## Item 8 — Symptom checker: "not listed" · open dropdowns · dot restyle

### Essence
Three sub-changes to the symptom checker: (8) a "my symptom isn't listed" free-text option that immediately escalates to **Tier 2**; (8.1) default all category dropdowns open; (8.2) restyle the tier dot — orange filled dot → **yellow empty circle**, and make the dots **bigger**.

### Current state
- `views/student/symptom-form.ejs`: categories render as accordions; **only first 3 open** (`catIdx < 3 ? 'open' : ''`). Symptoms are tags wrapping hidden checkboxes (`name="symptoms"`). Tier-2 indicator = `<span style="color:var(--status-warning); font-size:0.7rem;">&#9679;</span>` (filled orange dot ●); Tier ≥3 = red dot.
- `symptoms.controller.processSymptomCheck`: `maxTier = Math.max(...selectedSymptoms.map(s => s.Tier))` drives escalation; logs via `createSymptomLog`.
- `recommendations.ejs`: `maxTier >= 2` → "book a nurse" alert (no OTC).

### Changes — 8 (not listed → Tier 2)
1. **View**: add a "My symptom isn't listed" affordance below the tags — a toggle that reveals a free-text `<textarea name="otherSymptom">` ("Briefly describe what you're experiencing"). Selecting/filling it should enable submit even with no tags checked.
2. **Controller**: if `req.body.otherSymptom` is non-empty, force `maxTier = Math.max(maxTier, 2)` so the flow escalates to the Tier-2 "book a nurse" path. Sanitize the free text.
3. **Logging**: record the free-text description in the symptom log so the nurse sees it. Cleanest: store it on the `SymptomLog` row (e.g. reuse a notes-style field, or append to `SymptomName`), since it has no `SymptomID`. Decision: **write a SymptomLog row with the free-text as the description and no SymptomLogEntry rows** (or a synthetic "Other" entry) — keep it non-blocking like the current log write.
4. **Recommendations view**: when escalation came from free-text, show the Tier-2 "book a nurse" alert and echo the described symptom back to the student ("You reported: …").

### Changes — 8.1 (all dropdowns open)
- In `symptom-form.ejs`, change `<%= catIdx < 3 ? 'open' : '' %>` → always `open`. Keep the click-to-toggle so users can still collapse.

### Changes — 8.2 (dot restyle)
- Replace the filled orange dot `&#9679;` (`--status-warning`) with a **bigger, hollow yellow circle**: use `&#9711;` (◯ large circle) or `&#9898;`/CSS ring, coloured with the brand yellow, at a larger font-size (e.g. `1rem`+). Apply in **both** `symptom-form.ejs` and `recommendations.ejs` (the summary reuses the same dot logic). Keep the Tier-3 indicator distinct (e.g. a filled red/danger dot) so severity is still visually ranked.
- Add a tiny legend near the tags ("◯ = needs a nurse") so the symbol reads clearly.

### Notes / decisions
- Free-text escalation deliberately lands at **Tier 2, not 3** — an undescribed/unknown symptom warrants professional assessment, not an ER dispatch. Tier 3 stays reserved for the known red-flag symptoms.
- Keep the free-text short and sanitised; it is shown to nurses, so treat as untrusted (escape on render).

---

## Item 12 — Week-window escalation & "same as last time" prefill

### Essence
Escalate a student to **Tier 2** if they show recurring need within a week:
- checking symptoms again within a week of their last check **with at least half the same symptoms**, OR
- booking again within a week of their last booking.

And (12.1) when they check/book again, ask if it's the same as last time; if yes, **auto-fill** the symptoms (and, for booking, acknowledge the same reason).

### Current state
- `SymptomLog` + `SymptomLogEntry` store per-check symptoms with `LogDate`; `getSymptomHistory` already pulls recent logs with names. So "last check within a week + overlap" is computable from these tables.
- Appointments have `Time`/`CreatedAt`; "last booking within a week" is computable per student.
- No existing recurrence/escalation logic — this is net-new background logic in the controller/model layer.

### Changes — recurrence escalation (12)
1. **Model** (`symptoms.model.js`): add `getLastSymptomCheck(studentNumber)` returning the most recent log's date + its symptom IDs (join `SymptomLogEntry`). Add a helper to compute overlap.
2. **Controller** (`processSymptomCheck`): before rendering recommendations, compare the *current* selection against the last check if it was **within 7 days**. If ≥50% of the current symptoms match the previous set, bump `maxTier = Math.max(maxTier, 2)` and surface a message: "You reported similar symptoms recently — please see a nurse."
3. **Booking recurrence** (`appointments`): on the booking flow, if the student has a booking within the last 7 days, treat this as a recurrence signal — at minimum surface a Tier-2 nudge / note on the booking; optionally flag the new booking for the nurse. Decision: **non-blocking nudge + a flag the nurse can see**, not a hard block (students may legitimately rebook).
4. Keep all recurrence checks **non-blocking and defensive** (wrapped so a query failure never breaks the core flow), mirroring the existing symptom-log try/catch.

### Changes — "same as last time" prefill (12.1)
1. **Symptom check**: if a recent (≤7 day) prior check exists, show a prompt at the top of the symptom form: "Experiencing the same symptoms as your last check on {date}?" with Yes/No. **Yes** → pre-select those symptom tags (mark the checkboxes checked + run `updateSummary()`), so the student can adjust and submit. Implement by passing the last check's symptom IDs into the form render and a small JS "prefill" routine, or a query param round-trip.
2. **Booking**: similarly ask "Booking for the same reason as your last consultation?" — if yes, carry that context forward (e.g. prefill the reason/notes field or tag the appointment), so the nurse has continuity.

### Notes / decisions
- **Threshold clarified (user):** "at least half" means at least half of the PREVIOUS check's symptoms reappear this time. E.g. last time 4 symptoms → need ≥2 of those same ones now. If last time was 1 symptom → any 1 match is 100%, which counts. So the denominator is the **previous** check's symptom count: `sameCount / previousCount >= 0.5`. Document as `RECURRENCE_OVERLAP = 0.5`, `RECURRENCE_WINDOW_DAYS = 7` in `constants.js`.
- **No minimum-count guard needed** per the user's intent — a single recurring symptom (100% of a 1-symptom prior check) is a legitimate escalation signal. (Earlier I worried this was too aggressive; the user confirmed it's the desired behaviour.)
- Escalation is **additive** to tier logic — it can only raise the tier, never lower it. A Tier-3 result is never softened by recurrence rules.
- Privacy: recurrence checks are per-student on their own data only.

### Item 12 (extended) — Escalation rules engine

The user's two signals (recurrence, rebooking) are good "not getting better" detectors. We add three more cheap, clinically-sound signals and wrap them in a small **transparent rules engine** so escalations are explainable ("escalated because: symptoms persisted >1 week AND severity increased"), which matters for a health app — both the student and the nurse should see *why*.

**Signals shipped in 29B** (all can only RAISE tier to 2; never lower; never override a Tier-3 result):
1. **Recurrence** (user's #12): ≥50% of the previous check's symptoms reappear within 7 days.
2. **Rebooking** (user's #12): booking again within 7 days of the last booking → nudge + nurse flag.
3. **Escalating severity** (signal #1 — zero new inputs, we already store `Severity`): if severity trends upward across recent checks (e.g. previous Moderate → now High, or Low→High), escalate.
4. **Symptom duration** (signal #3 — ONE new form dropdown): add "How long have you had these?" (`<3 days` / `3–7 days` / `1–2 weeks` / `>2 weeks`). Duration ≥ ~1–2 weeks escalates regardless of severity (standard "persistent → see a professional" rule). Store on the `SymptomLog` row (small migration or reuse a column).
5. **Self-reported trajectory** (signal #8 — ONE new radio): "Since it started, is it getting worse / staying the same / getting better?" — **"worse"** is an explicit deterioration report → escalate.

**Engine design:** a single pure function, e.g. `evaluateEscalation({ selectedSymptoms, severity, duration, trajectory, history })` → returns `{ tier, reasons: [] }`. `processSymptomCheck` calls it, takes `maxTier = Math.max(symptomTier, engineTier)`, and passes `reasons` to the view so the Tier-2 banner can explain itself. Constants (window days, overlap ratio, duration threshold) live in `constants.js` and are documented.

**Future extensions (NOT in 29B — noted for later):**
- **#5 dangerous symptom combinations** (e.g. fever + stiff neck + headache) via a small co-occurrence rules table — high demo value, needs clinical care to define.
- **#6 medical-history interaction** (keyword-match `MedicalHistory` vs symptom category — e.g. breathing symptom + asthma).
- **#10 outbreak proximity** (leverage the existing campus health-zone data — escalate/flag if a student's symptoms match an active cluster in their zone).

These three are called out so the engine is built extensibly (each is just another signal function feeding the same `reasons[]`), but they're out of scope for 29B to keep it shippable.

---

## Item 17 — Symptom search bar + autocomplete

### Essence
Add a search bar in the symptom-tag area. Typing filters/suggests from the existing symptom set (autocomplete). Simple and clean.

### Current state
- All symptoms are already in the DOM as `.symptom-tag` elements (rendered from `getAllSymptomsByCategory`), each with `data-id`, `data-tier`, name text. So client-side filtering needs no new endpoint.

### Changes
1. **View**: add a search `<input>` above/among the tag groups ("Search symptoms…"). As the user types, show autocomplete suggestions from the symptom names.
2. **Client JS** (in `symptom-form.ejs`): filter the existing tags live — match against tag text (case-insensitive, substring). Options:
   - **Highlight/filter mode**: hide non-matching tags and auto-open categories containing matches (works well with 8.1's all-open default — matching tags stay visible, others dim/hide).
   - **Suggestion dropdown**: a small list under the search box; clicking a suggestion selects that tag (checks its checkbox + `updateSummary()`).
   Decision: **do both lightly** — a suggestion dropdown for quick-select, plus live filtering of the tag grid. Keep it dependency-free (no libraries).
3. **UX niceties**: clear button, keyboard nav (arrow up/down + Enter to select first match), "no matches — try 'my symptom isn't listed'" hint that links to the item-8 free-text option.
4. Since all data is client-side, **no server/API changes** are required. (If we later want server-side autocomplete, `Symptom` table is the source — but it's unnecessary at this scale.)

### Notes / decisions
- Reuse the same `Symptom` dataset already rendered — no duplicate data, no extra request.
- Tie the "no matches" state into item 8's free-text escalation for a coherent flow (can't find it → describe it → Tier 2).

---

## Phase 29B verification checklist

- **Review wording**: comment is optional, labelled "Comment (Optional)"; rating-only submits; empty comment doesn't render an empty quote publicly.
- **Not listed**: free-text option submits with no tags, escalates to Tier 2, description saved + shown to nurse, echoed back to student.
- **Dropdowns**: all categories open by default; still collapsible.
- **Dots**: tier-2 indicator is a bigger hollow yellow circle in both form + summary; tier-3 stays distinct; legend present.
- **Escalation engine**: recurrence (≥50% of prior check's symptoms within 7 days), rebooking within 7 days, escalating severity, duration ≥1–2 weeks, and "getting worse" each escalate to Tier 2; all additive (never lower tier, never override Tier 3); non-blocking; the Tier-2 banner shows the `reasons[]` explaining why.
- **Prefill**: "same as last time?" prompt appears when a ≤7-day prior check/booking exists; Yes pre-selects symptoms / carries booking reason.
- **Search**: typing filters tags + shows suggestions; click/Enter selects; clear works; no-match hints to free-text; no new dependency.
- App boots clean; symptom log writes still non-blocking.
