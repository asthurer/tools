import { GOOGLE_CONFIG } from './constants';
import { Scores, AssessmentMetadata, Comments } from './types';
import { TRAITS } from './constants';

declare var gapi: any;
declare var google: any;

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

// Initialize the Google API client library
export async function initGoogleClient() {
  if (gapiInited && gisInited) return;

  // Check if gapi script loaded successfully
  if (typeof gapi === 'undefined') {
    throw new Error("Google API Script not loaded. Please disable ad-blockers.");
  }

  await new Promise<void>((resolve, reject) => {
    gapi.load('client', async () => {
      try {
        await gapi.client.init({
          apiKey: GOOGLE_CONFIG.API_KEY,
          discoveryDocs: GOOGLE_CONFIG.DISCOVERY_DOCS,
        });
        gapiInited = true;
        resolve();
      } catch (error) {
        console.error('Error initializing GAPI client', error);
        reject(error);
      }
    });
  });

  await new Promise<void>((resolve) => {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CONFIG.CLIENT_ID,
      scope: GOOGLE_CONFIG.SCOPES,
      callback: '', // defined at request time
    });
    gisInited = true;
    resolve();
  });
}

// Request an access token
async function requestToken() {
  return new Promise<void>((resolve, reject) => {
    tokenClient.callback = (resp: any) => {
      if (resp.error !== undefined) {
        reject(resp);
      }
      resolve(resp);
    };
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

// Ensure the spreadsheet exists, or create it
async function getOrCreateSpreadsheet(): Promise<string> {
  // 1. Search for file
  const q = `name = '${GOOGLE_CONFIG.SPREADSHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
  const response = await gapi.client.drive.files.list({
    q: q,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (response.result.files && response.result.files.length > 0) {
    return response.result.files[0].id;
  }

  // 2. Create if not exists
  const createResponse = await gapi.client.sheets.spreadsheets.create({
    properties: {
      title: GOOGLE_CONFIG.SPREADSHEET_NAME,
    },
  });

  // 3. Add Header Row
  const spreadsheetId = createResponse.result.spreadsheetId;
  
  // Create headers: "Trait Name", "Trait Comment"
  const traitHeaders = TRAITS.flatMap(t => [t.name, `${t.name} Comment`]);
  
  const headers = [
    'Date', 
    'Candidate Name', 
    'Assessor Name', 
    'Overall Score',
    'Final Verdict',
    'Verdict Description',
    ...traitHeaders
  ];

  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'RAW',
    resource: { values: [headers] },
  });

  return spreadsheetId;
}

// Main function to save data
export async function saveAssessmentToSheet(metadata: AssessmentMetadata, scores: Scores, comments: Comments, verdict: any): Promise<void> {
  // 1. Ensure Client is inited
  if (!gapiInited || !gisInited) {
    await initGoogleClient();
  }

  // 2. Request Token
  await requestToken();

  // 3. Get Spreadsheet ID
  const spreadsheetId = await getOrCreateSpreadsheet();

  // 4. Prepare Row Data
  const totalScore = Object.values(scores).reduce((a, b) => a + (b as number), 0);
  const cleanDesc = verdict ? verdict.description.replace(/\*\*/g, '') : '';
  
  // Interleave scores and comments
  const traitValues = TRAITS.flatMap(t => [
      scores[t.id] || '',
      comments[t.id] || ''
  ]);
  
  const row = [
    metadata.date,
    metadata.candidateName,
    metadata.assessorName,
    totalScore,
    verdict ? verdict.title : '',
    cleanDesc,
    ...traitValues
  ];

  // 5. Append Row
  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [row],
    },
  });
}