const express = require('express');
const multer = require('multer');
const csvParser = require('csv-parser');
const { Readable } = require('stream');
const auth = require('../middleware/auth');
const Upload = require('../models/Upload');
const ValidationResult = require('../models/ValidationResult');
const { validateCSV } = require('../services/validator');

const router = express.Router();

// Configure multer for in-memory CSV file uploads (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    // Only accept CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed.'), false);
    }
  },
});

/**
 * Parse a CSV buffer into an array of row objects.
 * @param {Buffer} buffer - The raw file buffer.
 * @returns {Promise<Array<Object>>} - Parsed rows.
 */
const parseCSVBuffer = (buffer) => {
  return new Promise((resolve, reject) => {
    const rows = [];
    const stream = Readable.from(buffer.toString());

    stream
      .pipe(csvParser())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', (err) => reject(err));
  });
};

/**
 * Determine severity based on problem percentage.
 * @param {number} affectedRows - Number of problem rows.
 * @param {number} totalRows - Total rows in dataset.
 * @returns {string} - 'LOW', 'MEDIUM', or 'HIGH'.
 */
const determineSeverity = (affectedRows, totalRows) => {
  if (totalRows === 0) return 'LOW';
  const pct = (affectedRows / totalRows) * 100;
  if (pct > 20) return 'HIGH';
  if (pct > 5) return 'MEDIUM';
  return 'LOW';
};

// ─── POST /api/upload ──────────────────────────────────────────────
// Upload a CSV file, parse it, store metadata, run validations.
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded.',
        message: 'Please attach a CSV file using the "file" form field.',
      });
    }

    // Parse the CSV buffer into row objects
    const rows = await parseCSVBuffer(req.file.buffer);

    if (rows.length === 0) {
      return res.status(400).json({
        error: 'Empty CSV.',
        message: 'The uploaded CSV file contains no data rows.',
      });
    }

    const columnNames = Object.keys(rows[0]);

    // Create the Upload record with metadata
    const uploadRecord = new Upload({
      userId: req.user._id,
      filename: req.file.originalname,
      fileSize: req.file.size,
      rowCount: rows.length,
      columnNames,
      status: 'validating',
      rawData: rows.slice(0, 100), // Store first 100 rows for preview
      originalData: rows,
      cleanedData: rows,
    });

    await uploadRecord.save();

    // Run all validations on the parsed data
    const validationReport = validateCSV(rows);

    // Save individual validation results to the database
    const validationDocs = [];

    for (const validation of validationReport.validations) {
      const affectedRows = validation.affectedRows || validation.count || 0;

      // Only save results that found issues
      if (affectedRows > 0) {
        const doc = new ValidationResult({
          uploadId: uploadRecord._id,
          userId: req.user._id,
          validationType: validation.type,
          affectedRows,
          affectedColumns: validation.columns || [],
          severity: determineSeverity(affectedRows, rows.length),
          details: validation,
          samples: validation.samples || [],
          suggestedFix: validation.suggestedFix || '',
        });

        await doc.save();
        validationDocs.push(doc);
      }
    }

    // Update upload status and validation results
    uploadRecord.status = 'validated';
    
    // Store original and current results
    const resultsSummary = {
      qualityScore: validationReport.qualityScore,
      totalProblems: validationReport.totalProblems,
      durationMs: validationReport.durationMs,
      problems: validationDocs.map(doc => ({
        type: doc.validationType,
        column: doc.affectedColumns[0] || null,
        columns: doc.affectedColumns,
        count: doc.affectedRows,
        severity: doc.severity
      }))
    };
    
    uploadRecord.originalValidationResults = resultsSummary;
    uploadRecord.currentValidationResults = resultsSummary;
    
    await uploadRecord.save();

    res.status(201).json({
      success: true,
      uploadId: uploadRecord._id,
      message: `File "${req.file.originalname}" uploaded and validated successfully.`,
      summary: {
        rowCount: rows.length,
        columnCount: columnNames.length,
        qualityScore: validationReport.qualityScore,
        totalProblems: validationReport.totalProblems,
        issuesFound: validationDocs.length,
        durationMs: validationReport.durationMs,
      },
    });
  } catch (error) {
    // Handle multer errors (file size, file type)
    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        error: 'Upload error.',
        message: error.message,
      });
    }

    console.error('Upload error:', error.message);
    res.status(500).json({
      error: 'Server error.',
      message: 'An error occurred while processing the upload.',
    });
  }
});

// ─── GET /api/upload ──────────────────────────────────────────────
// GET all uploads for current user
router.get('/', auth, async (req, res) => {
  try {
    const uploads = await Upload.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    res.json({ uploads });
  } catch (error) {
    console.error('Error fetching uploads:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/upload/:id ───────────────────────────────────────────
// Return a single upload with its validation results.
router.get('/:id', auth, async (req, res) => {
  try {
    const uploadRecord = await Upload.findOne({
      _id: req.params.id,
      userId: req.user._id, // Ensure user can only access their own uploads
    });

    if (!uploadRecord) {
      return res.status(404).json({
        error: 'Not found.',
        message: 'Upload not found or you do not have access.',
      });
    }

    // Fetch all validation results for this upload (these are the UNFIXED problems)
    const validationResults = await ValidationResult.find({
      uploadId: uploadRecord._id,
    });

    const responseData = uploadRecord.toObject();
    // Override rawData with cleanedData for preview if available
    if (responseData.cleanedData && responseData.cleanedData.length > 0) {
        responseData.rawData = responseData.cleanedData.slice(0, 100);
    }
    // Delete large arrays to avoid massive payloads
    delete responseData.originalData;
    delete responseData.cleanedData;

    res.json({
      upload: responseData,
      validations: validationResults,
      currentResults: responseData.currentValidationResults,
      fixesApplied: responseData.fixesApplied || []
    });
  } catch (error) {
    console.error('Get upload error:', error.message);
    res.status(500).json({
      error: 'Server error.',
      message: 'An error occurred while fetching the upload.',
    });
  }
});

module.exports = router;
