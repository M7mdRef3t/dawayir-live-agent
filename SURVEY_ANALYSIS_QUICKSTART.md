# Survey Analysis Quickstart

## Script
- [scripts/analyze-survey-responses.mjs](c:\Users\moham\Downloads\dawayir-live-agent\scripts\analyze-survey-responses.mjs)

## Run
```bash
npm run analyze:survey -- --input path/to/responses.csv --output survey-analysis-report.md
```

## Important
- استخدم **CSV الردود الفعلي** من Google Forms/Typeform.
- لا تستخدم ملفات بنك الأسئلة (`USER_RESEARCH_SURVEY_*.csv`) لأنها ليست responses.

## Optional Mapping
إذا أسماء الأعمدة غير قابلة للاكتشاف التلقائي، استخدم ملف mapping:

```json
{
  "q1": "Q1 overload frequency",
  "q2": "Q2 first reaction",
  "q3": "Q3 effectiveness",
  "q4": "Q4 dislike",
  "q5": "Q5 trust",
  "q6": "Q6 one-step value",
  "q7": "Q7 preferred mode",
  "q8": "Q8 adoption intent",
  "q9": "Q9 follow-up need",
  "q10": "Q10 exact phrase"
}
```

ثم:
```bash
npm run analyze:survey -- --input path/to/responses.csv --map path/to/mapping.json --output survey-analysis-report.md
```

## Output
- التقرير النهائي يخرج:
  - المتوسطات الرقمية (Q1,Q3,Q5,Q6,Q8,Q9)
  - توزيعات الاختيارات (Q2,Q4,Q7)
  - عينات نصية من Q10
  - توصيات قرار تلقائية حسب thresholds
