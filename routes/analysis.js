const express = require('express');
const auth = require('../middleware/auth');
const Upload = require('../models/Upload');
const ValidationResult = require('../models/ValidationResult');
const { analyzeAnomaliesWithClaude } = require('../services/claudeAnalyzer');

const router = express.Router();

// ─── POST /api/analyze/problems ────────────────────────────────────
// Analyze validation problems with Claude AI.
router.post('/problems', auth, async (req, res) => {
  try {
    const { uploadId, includeAI = true } = req.body;

    if (!uploadId) {
      return res.status(400).json({ error: 'Missing uploadId.' });
    }

    // Get upload and its validations
    const upload = await Upload.findOne({ _id: uploadId, userId: req.user._id });
    if (!upload) {
      return res.status(404).json({ error: 'Upload not found.' });
    }

    const validations = await ValidationResult.find({ uploadId });
    if (validations.length === 0) {
      return res.json({ problems: [], aiAnalysis: null, message: 'No problems found to analyze.' });
    }

    // Transform validations into problems format for Claude
    const problems = validations.map((v) => ({
      type: v.validationType?.toUpperCase() || 'UNKNOWN',
      column: v.affectedColumns?.[0] || 'unknown',
      columns: v.affectedColumns || [],
      count: v.affectedRows || 0,
      affectedRows: v.affectedRows || 0,
      percentage: upload.rowCount > 0 ? ((v.affectedRows / upload.rowCount) * 100).toFixed(1) : 0,
      severity: v.severity,
      suggestedFix: v.suggestedFix || '',
      samples: v.samples?.slice(0, 3) || [],
      details: v.details || {},
    }));

    // Build data context for Claude
    const dataContext = {
      tableName: upload.filename || 'Unknown',
      rowCount: upload.rowCount || 0,
      columnNames: upload.columnNames || [],
      sourceType: 'csv_upload',
      historicalNullRate: 0.02,
      recentChanges: ['File uploaded by user'],
    };

    let aiAnalysis = null;

    if (includeAI) {
      const result = await analyzeAnomaliesWithClaude(problems, dataContext);
      aiAnalysis = result;
    }

    res.json({
      success: true,
      uploadId,
      filename: upload.filename,
      rowCount: upload.rowCount,
      problems,
      aiAnalysis: aiAnalysis?.analysis || null,
      analysisSource: aiAnalysis?.source || 'none',
      cached: aiAnalysis?.cached || false,
      suggestedFixes: aiAnalysis?.analysis?.map((a) => ({
        problemType: a.problemType,
        column: a.column,
        fix: a.suggestedFix,
        confidence: a.confidence,
        alternatives: a.alternativeFixes || [],
      })) || [],
      fixesApplied: upload.fixesApplied || [],
      currentQualityScore: upload.currentValidationResults?.qualityScore,
      originalQualityScore: upload.originalValidationResults?.qualityScore,
    });
  } catch (error) {
    console.error('Analysis error:', error.message);
    res.status(500).json({ error: 'Analysis failed.', message: error.message });
  }
});

// ─── POST /api/analyze/approve-fix ─────────────────────────────────
const { executeFixOnData } = require('../services/fixExecutor');
const { validateCSV } = require('../services/validator');

router.post('/approve-fix', auth, async (req, res) => {
  try {
    const { uploadId, problemType, column } = req.body;

    const upload = await Upload.findOne({
      _id: uploadId,
      userId: req.user._id
    });

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found or access denied.' });
    }

    const validationResults = await ValidationResult.findOne({
      uploadId: uploadId,
      validationType: { $regex: new RegExp(problemType, 'i') },
      affectedColumns: column ? column : { $exists: true }
    });

    // Details for execution
    const problem = validationResults ? validationResults.toObject() : { validationType: problemType, affectedColumns: [column] };

    // Get current data (use cleaned if already fixed, else original)
    // If neither exists, fallback to rawData (migration)
    let currentData = upload.cleanedData?.length ? upload.cleanedData : 
                      (upload.originalData?.length ? upload.originalData : upload.rawData);

    // Execute fix on data
    const { fixedData, changes } = await executeFixOnData(
      currentData,
      problemType,
      problem
    );

    // Save cleaned data
    upload.cleanedData = fixedData;
    
    // Re-validate the cleaned data
    const newValidationReport = validateCSV(fixedData);
    
    // Format new results
    const resultsSummary = {
      qualityScore: newValidationReport.qualityScore,
      totalProblems: newValidationReport.totalProblems,
      durationMs: newValidationReport.durationMs,
      problems: newValidationReport.validations.map(doc => ({
        type: doc.type,
        column: doc.columns?.[0] || null,
        columns: doc.columns,
        count: doc.count || doc.affectedRows,
        severity: doc.severity || 'MEDIUM'
      }))
    };

    // Store new validation results
    const oldQualityScore = upload.currentValidationResults?.qualityScore || 0;
    upload.currentValidationResults = resultsSummary;
    
    // Log this fix
    upload.fixesApplied.push({
      type: problemType,
      appliedAt: new Date(),
      rowsAffected: changes.rowsRemoved || changes.rowsModified || 0,
      qualityBefore: oldQualityScore,
      qualityAfter: newValidationReport.qualityScore
    });

    // Also clear out the specific old ValidationResult doc so it doesn't show up again
    if (validationResults) {
        await ValidationResult.deleteOne({ _id: validationResults._id });
    }

    await upload.save();

    return res.json({
      success: true,
      oldQualityScore: oldQualityScore,
      newQualityScore: newValidationReport.qualityScore,
      rowsAffected: changes.rowsRemoved || changes.rowsModified || 0,
      newValidationResults: resultsSummary
    });
  } catch (error) {
    console.error('Approve fix error:', error);
    res.status(500).json({ error: 'Failed to apply fix', message: error.message });
  }
});

module.exports = router;
