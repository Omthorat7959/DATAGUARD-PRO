/**
 * DataGuard Validation Engine
 * Provides 6 validation functions for CSV data quality analysis.
 * Uses statistical methods (Z-score) for outlier detection and
 * pattern matching for format / garbage detection.
 */

// ─── Helper Functions ──────────────────────────────────────────────

/**
 * Calculate the arithmetic mean of an array of numbers.
 * Filters out non-numeric and NaN values before computing.
 * @param {Array} values - Array of numeric values.
 * @returns {number} - The mean, or 0 if no valid values.
 */
const calculateMean = (values) => {
  const nums = values.filter((v) => typeof v === 'number' && !isNaN(v));
  if (nums.length === 0) return 0;
  return nums.reduce((sum, val) => sum + val, 0) / nums.length;
};

/**
 * Calculate the standard deviation of an array of numbers.
 * Uses the population standard deviation formula.
 * @param {Array} values - Array of numeric values.
 * @returns {number} - The standard deviation, or 0 if < 2 values.
 */
const calculateStdDev = (values) => {
  const nums = values.filter((v) => typeof v === 'number' && !isNaN(v));
  if (nums.length < 2) return 0;
  const mean = calculateMean(nums);
  const squaredDiffs = nums.map((val) => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / nums.length;
  return Math.sqrt(variance);
};

/**
 * Detect the data type of a single value.
 * Returns one of: 'null', 'number', 'email', 'date', 'string'.
 * @param {*} value - The value to inspect.
 * @returns {string} - Detected data type label.
 */
const detectDataType = (value) => {
  if (value === null || value === undefined || value === '') return 'null';

  // Check if it's a number (or numeric string)
  if (typeof value === 'number' || (!isNaN(value) && !isNaN(parseFloat(value)))) {
    return 'number';
  }

  const strValue = String(value).trim();

  // Check for email pattern
  if (/^\S+@\S+\.\S+$/.test(strValue)) return 'email';

  // Check for common date formats (YYYY-MM-DD, MM/DD/YYYY, DD-MM-YYYY, ISO 8601)
  if (
    /^\d{4}-\d{2}-\d{2}/.test(strValue) ||
    /^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(strValue)
  ) {
    const parsed = new Date(strValue);
    if (!isNaN(parsed.getTime())) return 'date';
  }

  return 'string';
};

// ─── Validation Functions ──────────────────────────────────────────

/**
 * Check for NULL / undefined / empty values in each column.
 * Flags columns where the null percentage exceeds 5%.
 * @param {Array<Object>} rows - Array of row objects.
 * @returns {Object} - Validation result for null values.
 */
const checkNullValues = (rows) => {
  if (!rows || rows.length === 0) {
    return { type: 'null_values', columns: [], nullPercentage: {}, affectedRows: 0, samples: [] };
  }

  const columns = Object.keys(rows[0]);
  const flaggedColumns = [];
  const nullPercentage = {};
  let totalAffectedRows = new Set();
  const samples = [];

  columns.forEach((col) => {
    let nullCount = 0;

    rows.forEach((row, index) => {
      const val = row[col];
      if (val === null || val === undefined || val === '' || val === 'NULL' || val === 'null') {
        nullCount++;
        totalAffectedRows.add(index);
      }
    });

    const pct = (nullCount / rows.length) * 100;
    nullPercentage[col] = parseFloat(pct.toFixed(2));

    // Flag if null percentage exceeds 5%
    if (pct > 5) {
      flaggedColumns.push(col);
    }
  });

  // Collect up to 5 sample rows with null values
  const affectedIndices = [...totalAffectedRows].slice(0, 5);
  affectedIndices.forEach((idx) => {
    samples.push({ rowIndex: idx, data: rows[idx] });
  });

  return {
    type: 'null_values',
    columns: flaggedColumns,
    nullPercentage,
    affectedRows: totalAffectedRows.size,
    samples,
    suggestedFix: flaggedColumns.length > 0
      ? `Fill missing values in columns: ${flaggedColumns.join(', ')}. Consider using mean/median for numeric columns or "Unknown" for text columns.`
      : 'No significant null value issues detected.',
  };
};

/**
 * Check for duplicate rows based on a key column.
 * If no key column is specified, checks on all columns combined.
 * @param {Array<Object>} rows - Array of row objects.
 * @param {string|null} keyColumn - Column to check for duplicates (optional).
 * @returns {Object} - Validation result for duplicates.
 */
const checkDuplicates = (rows, keyColumn = null) => {
  if (!rows || rows.length === 0) {
    return { type: 'duplicates', count: 0, affectedRows: 0, samples: [] };
  }

  const seen = new Map();
  const duplicates = [];

  rows.forEach((row, index) => {
    // Build a key from the specified column or all columns
    const key = keyColumn
      ? String(row[keyColumn] ?? '')
      : JSON.stringify(row);

    if (seen.has(key)) {
      duplicates.push({ rowIndex: index, data: row, duplicateOf: seen.get(key) });
    } else {
      seen.set(key, index);
    }
  });

  return {
    type: 'duplicates',
    count: duplicates.length,
    affectedRows: duplicates.length,
    keyColumn: keyColumn || 'all_columns',
    samples: duplicates.slice(0, 5),
    suggestedFix: duplicates.length > 0
      ? `Remove ${duplicates.length} duplicate row(s) based on ${keyColumn || 'all columns'}. Consider keeping the first occurrence.`
      : 'No duplicates detected.',
  };
};

/**
 * Check for statistical outliers in numeric columns using the Z-score method.
 * A value is flagged as an outlier if |value - mean| / stdDev > 3.
 * @param {Array<Object>} rows - Array of row objects.
 * @param {Array<string>|null} numericColumns - Columns to check (auto-detected if null).
 * @returns {Object} - Validation result for outliers.
 */
const checkOutliers = (rows, numericColumns = null) => {
  if (!rows || rows.length === 0) {
    return { type: 'outliers', columns: [], outliers: [], count: 0, samples: [] };
  }

  // Auto-detect numeric columns if not specified
  const columns = numericColumns || Object.keys(rows[0]).filter((col) => {
    const sampleValues = rows.slice(0, 20).map((r) => r[col]);
    return sampleValues.some((v) => typeof v === 'number' || (!isNaN(v) && v !== '' && v !== null));
  });

  const allOutliers = [];
  const affectedColumns = [];

  columns.forEach((col) => {
    const values = rows.map((r) => parseFloat(r[col])).filter((v) => !isNaN(v));

    if (values.length < 3) return; // Need enough data for meaningful statistics

    const mean = calculateMean(values);
    const stdDev = calculateStdDev(values);

    if (stdDev === 0) return; // All values are the same, no outliers possible

    rows.forEach((row, index) => {
      const val = parseFloat(row[col]);
      if (isNaN(val)) return;

      const zScore = Math.abs(val - mean) / stdDev;
      if (zScore > 3) {
        allOutliers.push({
          rowIndex: index,
          column: col,
          value: val,
          zScore: parseFloat(zScore.toFixed(2)),
          mean: parseFloat(mean.toFixed(2)),
          stdDev: parseFloat(stdDev.toFixed(2)),
        });

        if (!affectedColumns.includes(col)) {
          affectedColumns.push(col);
        }
      }
    });
  });

  return {
    type: 'outliers',
    columns: affectedColumns,
    outliers: allOutliers,
    count: allOutliers.length,
    samples: allOutliers.slice(0, 5),
    suggestedFix: allOutliers.length > 0
      ? `Found ${allOutliers.length} outlier(s) in columns: ${affectedColumns.join(', ')}. Consider capping values at 3 standard deviations or investigating for data entry errors.`
      : 'No outliers detected.',
  };
};

/**
 * Check that values in each column match expected data types.
 * Validates: numeric, string, date, email.
 * @param {Array<Object>} rows - Array of row objects.
 * @param {Object|null} expectedTypes - Map of column → expected type (auto-inferred if null).
 * @returns {Object} - Validation result for format issues.
 */
const checkFormat = (rows, expectedTypes = null) => {
  if (!rows || rows.length === 0) {
    return { type: 'format', columns: [], count: 0, samples: [] };
  }

  const columns = Object.keys(rows[0]);
  const formatIssues = [];
  const affectedColumns = [];

  // Auto-infer expected types from the first 10 non-null values if not provided
  const inferred = expectedTypes || {};
  if (!expectedTypes) {
    columns.forEach((col) => {
      const sampleVals = rows
        .slice(0, 10)
        .map((r) => r[col])
        .filter((v) => v !== null && v !== undefined && v !== '');

      if (sampleVals.length === 0) return;

      // Use majority type from the sample
      const types = sampleVals.map(detectDataType);
      const typeCounts = {};
      types.forEach((t) => {
        typeCounts[t] = (typeCounts[t] || 0) + 1;
      });
      inferred[col] = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0];
    });
  }

  // Validate every row against expected types
  columns.forEach((col) => {
    if (!inferred[col]) return;

    rows.forEach((row, index) => {
      const val = row[col];
      if (val === null || val === undefined || val === '') return; // Skip nulls (handled by checkNullValues)

      const actualType = detectDataType(val);
      if (actualType !== inferred[col]) {
        formatIssues.push({
          rowIndex: index,
          column: col,
          value: val,
          expectedType: inferred[col],
          actualType,
        });

        if (!affectedColumns.includes(col)) {
          affectedColumns.push(col);
        }
      }
    });
  });

  return {
    type: 'format',
    columns: affectedColumns,
    count: formatIssues.length,
    expectedTypes: inferred,
    samples: formatIssues.slice(0, 5),
    suggestedFix: formatIssues.length > 0
      ? `Found ${formatIssues.length} format mismatch(es) in columns: ${affectedColumns.join(', ')}. Convert values to the expected data types.`
      : 'All values match expected formats.',
  };
};

/**
 * Check for garbage / invalid characters in the data.
 * Looks for control characters, excessive special characters,
 * and other unexpected values.
 * @param {Array<Object>} rows - Array of row objects.
 * @returns {Object} - Validation result for garbage values.
 */
const checkGarbage = (rows) => {
  if (!rows || rows.length === 0) {
    return { type: 'garbage', columns: [], count: 0, samples: [] };
  }

  const columns = Object.keys(rows[0]);
  const garbageIssues = [];
  const affectedColumns = [];

  // Patterns that indicate garbage data
  const garbagePatterns = [
    /[\x00-\x08\x0B\x0C\x0E-\x1F]/, // Control characters (excluding \t, \n, \r)
    /^[!@#$%^&*()_+=\[\]{}|\\:;"'<>,.?\/~`]{3,}$/, // Strings of only special chars (3+)
    /(.)\1{5,}/, // Same character repeated 6+ times (e.g., "aaaaaa")
    /^(N\/A|n\/a|NA|na|NaN|nan|#REF!|#VALUE!|#N\/A|#DIV\/0!|#NAME\?|#NULL!|ERROR|undefined)$/i, // Common error/placeholder values
  ];

  columns.forEach((col) => {
    rows.forEach((row, index) => {
      const val = row[col];
      if (val === null || val === undefined || val === '') return;

      const strVal = String(val);

      for (const pattern of garbagePatterns) {
        if (pattern.test(strVal)) {
          garbageIssues.push({
            rowIndex: index,
            column: col,
            value: strVal,
            reason: `Matched garbage pattern: ${pattern.source}`,
          });

          if (!affectedColumns.includes(col)) {
            affectedColumns.push(col);
          }
          break; // One match per cell is enough
        }
      }
    });
  });

  return {
    type: 'garbage',
    columns: affectedColumns,
    count: garbageIssues.length,
    samples: garbageIssues.slice(0, 5),
    suggestedFix: garbageIssues.length > 0
      ? `Found ${garbageIssues.length} garbage value(s) in columns: ${affectedColumns.join(', ')}. Remove or replace invalid characters and placeholder error values.`
      : 'No garbage values detected.',
  };
};

// ─── Main Validation Orchestrator ──────────────────────────────────

/**
 * Run all 5 validation checks on a dataset and compute a quality score.
 * Quality Score = 100 - (total problems / total cells * 100)
 *
 * @param {Array<Object>} rows - Array of row objects from the CSV.
 * @param {Object|null} schema - Optional schema with expected types and key column.
 * @returns {Object} - Combined validation results with quality score.
 */
const runAllValidations = (rows, schema = null) => {
  if (!rows || rows.length === 0) {
    return {
      qualityScore: 0,
      validations: [],
      totalProblems: 0,
      message: 'No data to validate.',
    };
  }

  const keyColumn = schema?.keyColumn || null;
  const numericColumns = schema?.numericColumns || null;
  const expectedTypes = schema?.expectedTypes || null;

  // Run all 5 validation checks
  const nullResult = checkNullValues(rows);
  const duplicateResult = checkDuplicates(rows, keyColumn);
  const outlierResult = checkOutliers(rows, numericColumns);
  const formatResult = checkFormat(rows, expectedTypes);
  const garbageResult = checkGarbage(rows);

  const validations = [nullResult, duplicateResult, outlierResult, formatResult, garbageResult];

  // Calculate total problems across all checks
  const totalProblems =
    nullResult.affectedRows +
    duplicateResult.count +
    outlierResult.count +
    formatResult.count +
    garbageResult.count;

  // Calculate data quality score
  const totalColumns = Object.keys(rows[0]).length;
  const totalCells = rows.length * totalColumns;
  const qualityScore = totalCells > 0
    ? parseFloat((100 - (totalProblems / totalCells) * 100).toFixed(2))
    : 0;

  // Clamp score between 0 and 100
  const clampedScore = Math.max(0, Math.min(100, qualityScore));

  return {
    qualityScore: clampedScore,
    validations,
    totalProblems,
    totalRows: rows.length,
    totalColumns,
    totalCells,
  };
};

/**
 * Full CSV validation entry point.
 * Wraps runAllValidations with extra metadata.
 * @param {Array<Object>} fileData - Parsed CSV rows.
 * @param {Object|null} schema - Optional validation schema.
 * @returns {Object} - Complete validation report.
 */
const validateCSV = (fileData, schema = null) => {
  const startTime = Date.now();
  const results = runAllValidations(fileData, schema);
  const duration = Date.now() - startTime;

  return {
    ...results,
    validatedAt: new Date().toISOString(),
    durationMs: duration,
  };
};

module.exports = {
  validateCSV,
  runAllValidations,
  checkNullValues,
  checkDuplicates,
  checkOutliers,
  checkFormat,
  checkGarbage,
  calculateMean,
  calculateStdDev,
  detectDataType,
};
