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
    });
  } catch (error) {
    console.error('Analysis error:', error.message);
    res.status(500).json({ error: 'Analysis failed.', message: error.message });
  }
});

module.exports = router;
