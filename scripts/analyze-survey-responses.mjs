import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const getArg = (name, fallback = '') => {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
};

const inputPath = getArg('--input', '');
const outputPath = getArg('--output', '');
const mapPath = getArg('--map', '');

if (!inputPath) {
  console.error('Usage: node scripts/analyze-survey-responses.mjs --input <responses.csv> [--output <report.md>] [--map <mapping.json>]');
  process.exit(1);
}

const csvText = fs.readFileSync(inputPath, 'utf8');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch === '\r') {
      // ignore
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows;
}

const rows = parseCsv(csvText);
if (rows.length < 2) {
  console.error('CSV appears empty or has no data rows.');
  process.exit(1);
}

const headers = rows[0].map((h) => String(h || '').trim());
const records = rows.slice(1).map((row) => {
  const obj = {};
  headers.forEach((h, idx) => {
    obj[h] = String(row[idx] ?? '').trim();
  });
  return obj;
});

const defaultMatchers = {
  q1: ['آخر 7 أيام', '7 days', 'overload block', 'تشوش منعك'],
  q2: ['أول رد فعل', 'first reaction'],
  q3: ['الحل الحالي يساعدني', 'current solution helps'],
  q4: ['أكثر شيء تكرهه', 'dislike most'],
  q5: ['أثق أن أداة رقمية', 'trust that a digital tool'],
  q6: ['أفضل نتيجة', 'ideal outcome'],
  q7: ['الوسيط المفضل', 'preferred mode'],
  q8: ['10 دقائق', '10 minutes'],
  q9: ['أحتاج متابعة', 'post-session follow-up'],
  q10: ['ما الجملة', 'what sentence'],
};

let mapping = {};
if (mapPath) {
  mapping = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
} else {
  for (const [key, patterns] of Object.entries(defaultMatchers)) {
    const found = headers.find((h) => patterns.some((p) => h.toLowerCase().includes(p.toLowerCase())));
    if (found) mapping[key] = found;
  }
}

const toNumber = (v) => {
  const n = Number(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const avg = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);

function distribution(values) {
  const out = {};
  values.forEach((v) => {
    const k = String(v || 'N/A').trim() || 'N/A';
    out[k] = (out[k] || 0) + 1;
  });
  return Object.entries(out).sort((a, b) => b[1] - a[1]);
}

const n = records.length;
const numSeries = {};
['q1', 'q3', 'q5', 'q6', 'q8', 'q9'].forEach((k) => {
  const col = mapping[k];
  numSeries[k] = col ? records.map((r) => toNumber(r[col])).filter((x) => x !== null) : [];
});

const q2Dist = mapping.q2 ? distribution(records.map((r) => r[mapping.q2])) : [];
const q4Dist = mapping.q4 ? distribution(records.map((r) => r[mapping.q4])) : [];
const q7Dist = mapping.q7 ? distribution(records.map((r) => r[mapping.q7])) : [];
const q10Texts = mapping.q10 ? records.map((r) => r[mapping.q10]).filter(Boolean) : [];

const m = {
  q1: avg(numSeries.q1),
  q3: avg(numSeries.q3),
  q5: avg(numSeries.q5),
  q6: avg(numSeries.q6),
  q8: avg(numSeries.q8),
  q9: avg(numSeries.q9),
};

const decisionLines = [];
if (m.q6 !== null) {
  decisionLines.push(m.q6 < 3.5
    ? '- Q6 < 3.5: core value غير واضح للمستخدمين، نعيد صياغة الوعد الأساسي.'
    : '- Q6 >= 3.5: الوعد الأساسي مقبول، نكمل تحسين التنفيذ.');
}
if (m.q5 !== null) {
  decisionLines.push(m.q5 < 3.0
    ? '- Q5 < 3.0: الثقة منخفضة، أولوية لرسائل الخصوصية والشفافية.'
    : '- Q5 >= 3.0: الثقة مقبولة مبدئيًا.');
}
if (q7Dist.length) {
  const voiceCount = q7Dist
    .filter(([k]) => /voice|صوت/i.test(k))
    .reduce((s, [, c]) => s + c, 0);
  const voicePct = (voiceCount / n) * 100;
  decisionLines.push(voicePct < 35
    ? `- صوت < 35% (${voicePct.toFixed(1)}%): عزّز مسار النص/المختلط.`
    : `- صوت >= 35% (${voicePct.toFixed(1)}%): استمر في أولوية الصوت.`);
}
if (m.q9 !== null) {
  decisionLines.push(m.q9 >= 4.0
    ? `- Q9 >= 4.0 (${m.q9.toFixed(2)}): المتابعة بعد الجلسة قيمة أساسية، ثبّتها في الـ core flow.`
    : `- Q9 < 4.0 (${m.q9.toFixed(2)}): المتابعة مفيدة لكنها ليست أول أولوية.`);
}

const toTable = (dist, title) => {
  if (!dist.length) return `### ${title}\n_No data detected._\n`;
  const lines = [
    `### ${title}`,
    '| Option | Count | % |',
    '|---|---:|---:|',
    ...dist.map(([k, c]) => `| ${k} | ${c} | ${((c / n) * 100).toFixed(1)}% |`),
    '',
  ];
  return lines.join('\n');
};

const report = `# Survey Analysis Report

Input: \`${path.basename(inputPath)}\`  
Responses: **${n}**

## Mapped Columns
\`\`\`json
${JSON.stringify(mapping, null, 2)}
\`\`\`

## Numeric Summary
- Q1 overload frequency avg: ${m.q1?.toFixed(2) ?? 'N/A'}
- Q3 current solution effectiveness avg: ${m.q3?.toFixed(2) ?? 'N/A'}
- Q5 digital trust avg: ${m.q5?.toFixed(2) ?? 'N/A'}
- Q6 value of one actionable step avg: ${m.q6?.toFixed(2) ?? 'N/A'}
- Q8 weekly adoption intent avg: ${m.q8?.toFixed(2) ?? 'N/A'}
- Q9 post-session follow-up need avg: ${m.q9?.toFixed(2) ?? 'N/A'}

${toTable(q2Dist, 'Q2 First Reaction')}
${toTable(q4Dist, 'Q4 Biggest Dislike')}
${toTable(q7Dist, 'Q7 Preferred Mode')}

## Open Text Sample (Q10)
${q10Texts.slice(0, 10).map((t, i) => `${i + 1}. ${t}`).join('\n') || '_No open-text data detected._'}

## Decision Recommendations
${decisionLines.join('\n') || '- Not enough mapped data for decision rules.'}
`;

const finalOutput = outputPath || path.join(process.cwd(), 'survey-analysis-report.md');
fs.writeFileSync(finalOutput, report, 'utf8');
console.log(`Survey analysis report generated: ${finalOutput}`);
