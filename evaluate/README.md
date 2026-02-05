<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Evaluate.ai - Next-Gen Leadership Assessment Protocol

A professional, high-stakes qualification platform designed for Data Engineering and Data Analytics candidates.
This "Evaluate" tool serves as the primary gateway for assessing candidate skills through timed exams and interview evaluations.

## Key Features

- **Candidate Assessment**: 
  - Strict timed exams with per-question and overall time limits.
  - Randomized questions from categories like SQL, IQ, Behavioural, and Analytical Ability.
  - Immediate scoring and feedback upon completion.
  
- **Admin Dashboard**:
  - Secure login for administrators.
  - Review past candidate results and scores.
  - Launch interview evaluation forms.

- **Interview Evaluation**:
  - Structured form for interviewers to rate candidates (L4/L5-L7).
  - Record detailed notes and final outcomes (Offer/Decline).

## Tech Stack
- **Frontend**: React (Vite), Tailwind CSS
- **Backend**: Supabase (Database & Auth)
- **AI Integration**: Prepared for Google GenAI integration.

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key (optional if only using Supabase features).
   Ensure Supabase credentials are configured in `.env` or local storage.
3. Run the app:
   `npm run dev`
