-- ========================================
-- VERIFICATION SCRIPT
-- Check organization IDs and data counts
-- ========================================
-- Run this BEFORE the migration to verify organization IDs and see what will be copied
-- ========================================

-- Check all organizations
SELECT 'Organizations:' as info;
SELECT id, name, admin_name, admin_email FROM organizations ORDER BY name;

-- Check Diageo organization data counts
SELECT '' as spacer;
SELECT '========================================' as info;
SELECT 'DIAGEO ORGANIZATION DATA COUNTS:' as info;
SELECT '========================================' as info;

-- Diageo sections
SELECT 'Sections: ' || COUNT(*)::text as count 
FROM sections 
WHERE organization_id = 'a956050a-8eb5-44e0-8725-24269181038c';

-- Diageo questions
SELECT 'Questions: ' || COUNT(*)::text as count 
FROM questions 
WHERE organization_id = 'a956050a-8eb5-44e0-8725-24269181038c';

-- Diageo candidates
SELECT 'Candidates: ' || COUNT(*)::text as count 
FROM candidates 
WHERE organization_id = 'a956050a-8eb5-44e0-8725-24269181038c';

-- Diageo results
SELECT 'Results: ' || COUNT(*)::text as count 
FROM results 
WHERE organization_id = 'a956050a-8eb5-44e0-8725-24269181038c';

-- Diageo evaluations
SELECT 'Evaluations: ' || COUNT(*)::text as count 
FROM evaluations 
WHERE organization_id = 'a956050a-8eb5-44e0-8725-24269181038c';

-- Diageo settings
SELECT 'Settings: ' || COUNT(*)::text as count 
FROM settings 
WHERE organization_id = 'a956050a-8eb5-44e0-8725-24269181038c';

-- Check Demo organization data counts
SELECT '' as spacer;
SELECT '========================================' as info;
SELECT 'DEMO ORGANIZATION DATA COUNTS (WILL BE DELETED):' as info;
SELECT '========================================' as info;

-- Demo sections
SELECT 'Sections: ' || COUNT(*)::text as count 
FROM sections 
WHERE organization_id = '55147170-54ed-4fdd-840b-66f81cbc1883';

-- Demo questions
SELECT 'Questions: ' || COUNT(*)::text as count 
FROM questions 
WHERE organization_id = '55147170-54ed-4fdd-840b-66f81cbc1883';

-- Demo candidates
SELECT 'Candidates: ' || COUNT(*)::text as count 
FROM candidates 
WHERE organization_id = '55147170-54ed-4fdd-840b-66f81cbc1883';

-- Demo results
SELECT 'Results: ' || COUNT(*)::text as count 
FROM results 
WHERE organization_id = '55147170-54ed-4fdd-840b-66f81cbc1883';

-- Demo evaluations
SELECT 'Evaluations: ' || COUNT(*)::text as count 
FROM evaluations 
WHERE organization_id = '55147170-54ed-4fdd-840b-66f81cbc1883';

-- Demo settings
SELECT 'Settings: ' || COUNT(*)::text as count 
FROM settings 
WHERE organization_id = '55147170-54ed-4fdd-840b-66f81cbc1883';

-- Sample candidate names from Diageo (to see what will be copied)
SELECT '' as spacer;
SELECT '========================================' as info;
SELECT 'SAMPLE DIAGEO CANDIDATES (first 5):' as info;
SELECT '========================================' as info;

SELECT full_name, email, status 
FROM candidates 
WHERE organization_id = 'a956050a-8eb5-44e0-8725-24269181038c'
LIMIT 5;
