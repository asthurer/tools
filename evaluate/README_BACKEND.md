
# Google Apps Script Backend Setup

### Sheet Requirements
Create a Google Sheet with three tabs:
1. **Questions** (headers: `question_id`, `category`, `difficulty`, `question_text`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_option`, `is_active`, `updated_at`)
2. **Results** (headers: `attempt_id`, `name`, `email`, `start`, `submit`, `total_sec`, `total_qs`, `att_count`, `miss_count`, `correct`, `wrong`, `avg_sec`, `score`, `json`)
3. **Evaluations** (headers: `eval_id`, `email`, `interviewer`, `level`, `win_exec`, `inspire`, `shape`, `invest`, `outcome`, `comments`, `timestamp`, `raw_json`)

### Script Code
Paste this into the Apps Script editor and click **Deploy > New Deployment > Web App**.
**Crucial**: Set "Who has access" to "Anyone".

```javascript
const SS = SpreadsheetApp.getActiveSpreadsheet();

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getQuestions') {
    const sheet = SS.getSheetByName('Questions');
    if (!sheet) return createResponse([]);
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return createResponse([]);
    const headers = values[0];
    const data = values.slice(1).map(row => {
      let q = {};
      headers.forEach((h, i) => q[h] = row[i]);
      return {
        id: q.question_id, category: q.category, difficulty: q.difficulty, text: q.question_text,
        options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
        correctOption: q.correct_option, isActive: String(q.is_active).toUpperCase() === "TRUE"
      };
    });
    return createResponse(data);
  }

  if (action === 'getAllResults') {
    const sheet = SS.getSheetByName('Results');
    if (!sheet) return createResponse([]);
    const values = sheet.getDataRange().getValues();
    const data = values.slice(1).map(row => {
      return {
        attemptId: row[0], candidateName: row[1], candidateEmail: row[2],
        startedAt: row[3], submittedAt: row[4], totalTimeTakenSec: row[5],
        totalQuestions: row[6], attemptedCount: row[7], missedCount: row[8],
        correctCount: row[9], wrongCount: row[10], avgTimePerAnsweredSec: row[11],
        scorePercent: row[12], answersJson: row[13]
      };
    });
    return createResponse(data);
  }

  if (action === 'getAllEvaluations') {
    const sheet = SS.getSheetByName('Evaluations');
    if (!sheet) return createResponse([]);
    const values = sheet.getDataRange().getValues();
    const data = values.slice(1).map(row => {
      try { return JSON.parse(row[11]); } catch(e) { return null; }
    }).filter(x => x);
    return createResponse(data);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    
    if (action === 'submitResult') {
      const sheet = SS.getSheetByName('Results') || SS.insertSheet('Results');
      const res = body.result;
      sheet.appendRow([
        res.attemptId, res.candidateName, res.candidateEmail, res.startedAt, 
        res.submittedAt, res.totalTimeTakenSec, res.totalQuestions, res.attemptedCount,
        res.missedCount, res.correctCount, res.wrongCount, res.avgTimePerAnsweredSec,
        res.scorePercent, res.answersJson
      ]);
    } else if (action === 'submitEvaluation') {
      const sheet = SS.getSheetByName('Evaluations') || SS.insertSheet('Evaluations');
      const ev = body.evaluation;
      sheet.appendRow([
        ev.evaluationId, ev.candidateEmail, ev.interviewerName, ev.level,
        ev.ratings['win-execution'], ev.ratings['inspire-purpose'],
        ev.ratings['shape-future'], ev.ratings['invest-talent'],
        ev.finalOutcome, ev.finalComments, ev.submittedAt, JSON.stringify(ev)
      ]);
    }
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
  } catch(err) {
    return ContentService.createTextOutput("Error: " + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
```
