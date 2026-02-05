-- ========================================
-- ORGANIZATION DATA MIGRATION SCRIPT
-- Copy data from Diageo to Demo organization
-- ========================================
-- 
-- This script will:
-- 1. Delete all Demo organization data from specified tables
-- 2. Copy questions, candidates, evaluations, results, and settings from Diageo to Demo
-- 3. Modify candidate names and emails during the copy
--
-- IMPORTANT: Review the organization IDs before running!
-- ========================================

-- Define organization IDs (UPDATE THESE IF NEEDED)
DO $$
DECLARE
    diageo_org_id TEXT := 'a956050a-8eb5-44e0-8725-24269181038c'; -- Replace with actual Diageo org ID
    demo_org_id TEXT := '55147170-54ed-4fdd-840b-66f81cbc1883';   -- Replace with actual Demo org ID
BEGIN
    -- ========================================
    -- STEP 1: DELETE DEMO ORGANIZATION DATA
    -- ========================================
    
    RAISE NOTICE 'Deleting Demo organization data...';
    
    -- Delete settings
    DELETE FROM settings WHERE organization_id = demo_org_id;
    RAISE NOTICE 'Deleted % settings records', (SELECT COUNT(*) FROM settings WHERE organization_id = demo_org_id);
    
    -- Delete results (must delete before candidates due to potential FK)
    DELETE FROM results WHERE organization_id = demo_org_id;
    RAISE NOTICE 'Deleted results records';
    
    -- Delete evaluations (must delete before candidates)
    DELETE FROM evaluations WHERE organization_id = demo_org_id;
    RAISE NOTICE 'Deleted evaluations records';
    
    -- Delete candidates
    DELETE FROM candidates WHERE organization_id = demo_org_id;
    RAISE NOTICE 'Deleted candidates records';
    
    -- Delete questions
    DELETE FROM questions WHERE organization_id = demo_org_id;
    RAISE NOTICE 'Deleted questions records';
    
    -- Delete sections
    DELETE FROM sections WHERE organization_id = demo_org_id;
    RAISE NOTICE 'Deleted sections records';
    
    RAISE NOTICE 'Demo organization data deletion complete.';
    
    -- ========================================
    -- STEP 2: COPY SECTIONS
    -- ========================================
    
    RAISE NOTICE 'Copying sections from Diageo to Demo...';
    
    INSERT INTO sections (name, organization_id, is_active, created_at)
    SELECT 
        name,
        demo_org_id,
        is_active,
        created_at
    FROM sections
    WHERE organization_id = diageo_org_id
    ON CONFLICT (name, organization_id) DO UPDATE SET
        is_active = EXCLUDED.is_active,
        created_at = EXCLUDED.created_at;
    
    RAISE NOTICE 'Copied % sections', (SELECT COUNT(*) FROM sections WHERE organization_id = diageo_org_id);
    
    -- ========================================
    -- STEP 3: COPY QUESTIONS
    -- ========================================
    
    RAISE NOTICE 'Copying questions from Diageo to Demo...';
    
    INSERT INTO questions (id, category, organization_id, difficulty, text, options, correct_option, is_active, created_at)
    SELECT 
        id,
        category,
        demo_org_id,
        difficulty,
        text,
        options,
        correct_option,
        is_active,
        created_at
    FROM questions
    WHERE organization_id = diageo_org_id
    ON CONFLICT (id) DO UPDATE SET
        category = EXCLUDED.category,
        organization_id = EXCLUDED.organization_id,
        difficulty = EXCLUDED.difficulty,
        text = EXCLUDED.text,
        options = EXCLUDED.options,
        correct_option = EXCLUDED.correct_option,
        is_active = EXCLUDED.is_active,
        created_at = EXCLUDED.created_at;
    
    RAISE NOTICE 'Copied % questions', (SELECT COUNT(*) FROM questions WHERE organization_id = diageo_org_id);
    
    -- ========================================
    -- STEP 4: COPY CANDIDATES (WITH MODIFIED NAMES/EMAILS)
    -- ========================================
    
    RAISE NOTICE 'Copying candidates from Diageo to Demo with modified names and emails...';
    
    INSERT INTO candidates (id, organization_id, email, full_name, status, created_at)
    SELECT 
        id,
        demo_org_id,
        'demo_' || email,  -- Prefix email with 'demo_'
        'Demo ' || full_name,  -- Prefix name with 'Demo '
        status,
        created_at
    FROM candidates
    WHERE organization_id = diageo_org_id
    ON CONFLICT (id) DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        status = EXCLUDED.status,
        created_at = EXCLUDED.created_at;
    
    RAISE NOTICE 'Copied % candidates', (SELECT COUNT(*) FROM candidates WHERE organization_id = diageo_org_id);
    
    -- ========================================
    -- STEP 5: COPY RESULTS
    -- ========================================
    
    RAISE NOTICE 'Copying results from Diageo to Demo...';
    
    INSERT INTO results (
        id, organization_id, candidate_id,
        started_at, submitted_at, total_time_taken_sec, total_questions,
        attempted_count, missed_count, correct_count, wrong_count,
        avg_time_per_answered_sec, score_percent, answers_json, is_deleted, created_at
    )
    SELECT 
        id,
        demo_org_id,
        candidate_id,
        started_at,
        submitted_at,
        total_time_taken_sec,
        total_questions,
        attempted_count,
        missed_count,
        correct_count,
        wrong_count,
        avg_time_per_answered_sec,
        score_percent,
        answers_json,
        is_deleted,
        created_at
    FROM results
    WHERE organization_id = diageo_org_id
    ON CONFLICT (id) DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        candidate_id = EXCLUDED.candidate_id,
        started_at = EXCLUDED.started_at,
        submitted_at = EXCLUDED.submitted_at,
        total_time_taken_sec = EXCLUDED.total_time_taken_sec,
        total_questions = EXCLUDED.total_questions,
        attempted_count = EXCLUDED.attempted_count,
        missed_count = EXCLUDED.missed_count,
        correct_count = EXCLUDED.correct_count,
        wrong_count = EXCLUDED.wrong_count,
        avg_time_per_answered_sec = EXCLUDED.avg_time_per_answered_sec,
        score_percent = EXCLUDED.score_percent,
        answers_json = EXCLUDED.answers_json,
        is_deleted = EXCLUDED.is_deleted,
        created_at = EXCLUDED.created_at;
    
    RAISE NOTICE 'Copied % results', (SELECT COUNT(*) FROM results WHERE organization_id = diageo_org_id);
    
    -- ========================================
    -- STEP 6: COPY EVALUATIONS
    -- ========================================
    
    RAISE NOTICE 'Copying evaluations from Diageo to Demo...';
    
    INSERT INTO evaluations (
        id, organization_id, candidate_id,
        level, ratings, notes, final_outcome, final_comments, interviewer_name, submitted_at, is_deleted, created_at
    )
    SELECT 
        id,
        demo_org_id,
        candidate_id,
        level,
        ratings,
        notes,
        final_outcome,
        final_comments,
        interviewer_name,
        submitted_at,
        is_deleted,
        created_at
    FROM evaluations
    WHERE organization_id = diageo_org_id
    ON CONFLICT (id) DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        candidate_id = EXCLUDED.candidate_id,
        level = EXCLUDED.level,
        ratings = EXCLUDED.ratings,
        notes = EXCLUDED.notes,
        final_outcome = EXCLUDED.final_outcome,
        final_comments = EXCLUDED.final_comments,
        interviewer_name = EXCLUDED.interviewer_name,
        submitted_at = EXCLUDED.submitted_at,
        is_deleted = EXCLUDED.is_deleted,
        created_at = EXCLUDED.created_at;
    
    RAISE NOTICE 'Copied % evaluations', (SELECT COUNT(*) FROM evaluations WHERE organization_id = diageo_org_id);
    
    -- ========================================
    -- STEP 7: COPY SETTINGS
    -- ========================================
    
    RAISE NOTICE 'Copying settings from Diageo to Demo...';
    
    INSERT INTO settings (key, organization_id, value, updated_at)
    SELECT 
        key,
        demo_org_id,
        value,
        updated_at
    FROM settings
    WHERE organization_id = diageo_org_id;
    
    RAISE NOTICE 'Copied % settings', (SELECT COUNT(*) FROM settings WHERE organization_id = diageo_org_id);
    
    -- ========================================
    -- MIGRATION COMPLETE
    -- ========================================
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Data successfully copied from Diageo to Demo organization.';
    RAISE NOTICE 'Candidate names prefixed with "Demo " and emails prefixed with "demo_"';
    RAISE NOTICE '========================================';
    
END $$;
