# USER RESEARCH SURVEY — TYPEFORM GUIDE

## Files
- Spec JSON: [USER_RESEARCH_SURVEY_TYPEFORM_READY.json](c:\Users\moham\Downloads\dawayir-live-agent\USER_RESEARCH_SURVEY_TYPEFORM_READY.json)
- CSV fallback: [USER_RESEARCH_SURVEY_BILINGUAL.csv](c:\Users\moham\Downloads\dawayir-live-agent\USER_RESEARCH_SURVEY_BILINGUAL.csv)

## How To Build in Typeform (5-10 min)
1. Create a new form: `Dawayir User Research Survey v1`.
2. Add questions in order from JSON.
3. Question type mapping:
- `rating` -> Opinion Scale
- `multiple_choice` -> Multiple Choice (single selection)
- `short_text` -> Short Text
4. Use Arabic titles for Arabic form, English titles for English form.
5. Mark all questions as required.

## Recommended Logic
- Keep Q10 always visible.
- Optionally branch from Q7:
  - If `Voice` then show 1 follow-up about privacy in voice.
  - If `Text` then show 1 follow-up about speed of typing under stress.

## Output Schema (for analysis)
- q1_overload_frequency
- q2_first_reaction
- q3_current_solution_effectiveness
- q4_biggest_dislike
- q5_digital_trust
- q6_value_of_single_action
- q7_preferred_mode
- q8_weekly_adoption_intent
- q9_post_session_followup_need
- q10_exact_phrase
