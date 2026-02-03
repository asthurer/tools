import * as XLSX from 'xlsx';
import { AssessmentMetadata, Scores, SCORING_SCALE, Comments } from './types';
import { TRAITS } from './constants';

export const generateAndDownloadXLS = (metadata: AssessmentMetadata, scores: Scores, comments: Comments, categoryStats: any[], verdict: any) => {
  // 1. Prepare Summary Data
  const summaryRows: (string | number)[][] = [
    ["Organization Potential Assessment - Report"],
    [""],
    ["Assessment Details"],
    ["Candidate Name", metadata.candidateName],
    ["Assessor Name", metadata.assessorName],
    ["Date", metadata.date],
    [""],
    ["Overall Results"],
    ["Category", "Score", "Max Possible", "Percentage"],
  ];

  categoryStats.forEach(cat => {
    summaryRows.push([
      cat.category,
      cat.score,
      cat.max,
      `${cat.percentage.toFixed(1)}%`
    ]);
  });
  
  // Calculate Total
  const totalScore = categoryStats.reduce((acc, curr) => acc + curr.score, 0);
  const totalMax = categoryStats.reduce((acc, curr) => acc + curr.max, 0);
  const totalPercent = ((totalScore / totalMax) * 100).toFixed(1);
  
  summaryRows.push(["TOTAL", totalScore, totalMax, `${totalPercent}%`]);

  // Add Verdict
  if (verdict) {
      summaryRows.push([""]);
      summaryRows.push(["Final Verdict", verdict.title]);
      // Remove markdown bolding for excel
      const cleanDesc = verdict.description.replace(/\*\*/g, '');
      summaryRows.push(["Meaning", cleanDesc]);
  }

  // 2. Prepare Detailed Responses Data
  const detailRows: (string | number)[][] = [
    ["Trait", "Category", "Score Value", "Rating Label", "Comments", "Description", "Prompt"]
  ];

  TRAITS.forEach(trait => {
    const scoreVal = scores[trait.id];
    const scoreLabel = SCORING_SCALE.find(s => s.value === scoreVal)?.label || "Not Rated";
    const comment = comments[trait.id] || "";
    
    detailRows.push([
      trait.name,
      trait.category,
      scoreVal || 0,
      scoreLabel,
      comment,
      trait.description,
      trait.prompt
    ]);
  });

  // 3. Create Workbook and Sheets
  const wb = XLSX.utils.book_new();
  
  // Sheet 1: Summary
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  // Set column widths
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // Sheet 2: Details
  const wsDetails = XLSX.utils.aoa_to_sheet(detailRows);
  // Set column widths
  wsDetails['!cols'] = [
    { wch: 20 }, // Trait
    { wch: 25 }, // Category
    { wch: 10 }, // Score
    { wch: 20 }, // Label
    { wch: 40 }, // Comments
    { wch: 50 }, // Description
    { wch: 50 }  // Prompt
  ];
  XLSX.utils.book_append_sheet(wb, wsDetails, "Detailed Responses");

  // 4. Generate File Name
  const cleanName = metadata.candidateName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const fileName = `Potential_Assessment_${cleanName}_${new Date().toISOString().split('T')[0]}.xlsx`;

  // 5. Download
  XLSX.writeFile(wb, fileName);
};