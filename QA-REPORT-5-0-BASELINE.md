# Kawan CBT 5.0 Integrated Beta — QA / Cross-check

Generated from working local Kawan CBT 4.2.2 Typing Experience. **This is a test release, not a certified production counselling or child-data system.**

## Executed checks (synthetic stories, offline browser)

| Test group | Passed | Notes |
|---|---:|---|
| Previous Smart42 Malay/English analysis regressions | 55/55 | Existing rule engine unchanged |
| New Smart43 anonymised session context tests | 15/15 | Attempts, corrections, friend closeness, safety block, no raw text stored in new module |
| Existing safety branch browser tests | 13/13 | Harm, help received vs merely planned, self-harm concern, uncertain safety, device sizes |
| Existing safety / normal CBT / game smoke | 14/14 | Speech option and game effects, no silent close |
| New integrated browser interaction tests | 16/16 | New games, a11y switches, mascot, memory, fake dashboard UI, simulated risk, widths 360/390/768/1600 |
| Simulated Supabase GBK checks | 3/3 | Authorized aggregate counts; close clears data & signs out; unauthorized login denied |
| Simulated 10-min idle timer | 1/1 | Fake clock advanced 600 seconds; records closed, cached counters purged, simulated user signed out |
| New/modified JavaScript parse checks | all pass | node --check *.js |
| Browser JavaScript runtime errors in new tests | 0 | No uncaught errors |

**Not tested and NOT claimed:** real Supabase anonymous role access over HTTP, real mail service, Supabase RLS bypass/penetration, multi-device synchronization under concurrent writers, high-volume anti-spam, actual minors' usability, counselling clinical efficacy, school authorization and data-retention compliance. These are release blockers for real student information.

## Security-preserving design

- Existing `gbk_records` and `student_submissions` schema and RLS were **not changed**. Student data may be submitted only by the existing explicit consent path.
- Dashboard receives **counts only**, and only after existing GBK verification + protected database read. Never saves a copied dataset in localStorage.
- Teacher closure signs out; new 10-minute idle timeout and tab visibility guard further reduce casual access on shared devices. Signing out does not replace server-side RLS.
- Games, journey, mascot and accessibility module do not read or store student transcripts. The new Smart43 tracker remembers Boolean facts and counts in RAM, within a single session.
- `supabase-config.js` deliberately has empty URL and publishable key; **do not put secret/service_role keys in static sites**.

## Technical limitations

1. Still enhanced deterministic **rule-based** text interpretation, not free-form LLM/AI; cannot guarantee appropriate responses in all contexts.
2. A student typing a personal name into an existing CBT session could still appear in a voluntarily submitted summary; prompt discourages unnecessary identifiers but isn't data-loss prevention.
3. Dynamic mascot keyword triggers can have false positives; it is visual feedback only, never a clinical assessment.
4. `Mudah dibaca` is typography support, not verified Easy Read translation; hearing support uses pre-existing browser speech APIs.
5. Anonymous INSERT risk remains until server-side rate limiting and abuse protection is implemented.
6. Database backup and role revocation tests require the school/operator.

## Release gate

**Hold production / GitHub upload** until the user validates all five added modules locally, uses fictional test data, completes RLS verification, authorized school approval, anti-spam hardening and backup policy.
