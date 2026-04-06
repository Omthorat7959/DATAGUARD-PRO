/**
 * DataGuard PRO — Claude AI Analyzer
 *
 * Uses Claude to perform root-cause analysis on data quality problems.
 * Includes response caching to reduce API calls and graceful fallback.
 */

const Anthropic = require('@anthropic-ai/sdk');

// ─── Cache for Claude responses (1 hour TTL) ──────────────────────

const responseCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const getCacheKey = (problems) => {
  const normalized = problems.map((p) => ({
    type: p.type,
    column: p.column || p.columns?.[0],
    count: p.count || p.affectedRows,
  }));
  return JSON.stringify(normalized);
};

const getCachedResponse = (key) => {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  return entry.data;
};

// ─── Build the Claude prompt ───────────────────────────────────────

const buildPrompt = (problems, dataContext) => {
  return `You are a data quality expert analyzing a dataset for an enterprise data validation platform called DataGuard PRO.

DATASET CONTEXT:
- Table/File: ${dataContext.tableName || 'Unknown'}
- Total Rows: ${dataContext.rowCount || 'Unknown'}
- Source Type: ${dataContext.sourceType || 'csv_upload'}
- Column Names: ${dataContext.columnNames?.join(', ') || 'Unknown'}
${dataContext.historicalNullRate ? `- Historical Null Rate: ${dataContext.historicalNullRate * 100}%` : ''}
${dataContext.recentChanges?.length ? `- Recent Changes: ${dataContext.recentChanges.join(', ')}` : ''}

PROBLEMS DETECTED:
${problems.map((p, i) => `
Problem ${i + 1}: ${p.type}
- Column(s): ${p.column || p.columns?.join(', ') || 'Multiple'}
- Count: ${p.count || p.affectedRows || 0} affected rows
- Percentage: ${p.percentage || 'Unknown'}%
${p.value !== undefined ? `- Sample Value: ${p.value}` : ''}
${p.zscore !== undefined ? `- Z-Score: ${p.zscore}` : ''}
${p.context ? `- Context: mean=${p.context.mean}, median=${p.context.median}` : ''}
${p.samples ? `- Samples: ${JSON.stringify(p.samples.slice(0, 3))}` : ''}
${p.suggestedFix ? `- Auto-suggested Fix: ${p.suggestedFix}` : ''}
`).join('\n')}

For EACH problem, provide analysis in this EXACT JSON format (return a JSON array only, no markdown):
[
  {
    "problemType": "TYPE_STRING",
    "column": "column_name",
    "rootCause": "Plain English explanation of WHY this data is bad",
    "severity": "HIGH|MEDIUM|LOW",
    "isRealError": true/false,
    "suggestedFix": "Specific actionable fix",
    "confidence": 0-100,
    "reasoning": "Detailed reasoning for your analysis",
    "alternativeFixes": ["Alternative fix 1", "Alternative fix 2"],
    "impact": "Business impact if not fixed"
  }
]

Be specific, actionable, and enterprise-focused. Return ONLY the JSON array.`;
};

// ─── Fallback analysis (when Claude API is unavailable) ────────────

const generateFallback = (problems) => {
  return problems.map((p) => {
    const type = p.type?.toUpperCase() || 'UNKNOWN';
    const column = p.column || p.columns?.[0] || 'unknown';
    const count = p.count || p.affectedRows || 0;

    const fallbacks = {
      NULL_VALUES: {
        rootCause: `Missing values in column "${column}" — likely incomplete data entry or export issue.`,
        severity: count > 10 ? 'HIGH' : count > 3 ? 'MEDIUM' : 'LOW',
        suggestedFix: `Fill missing values with mean/median for numeric columns or "Unknown" for text.`,
        impact: 'Missing data can skew analytics and break downstream pipelines.',
      },
      OUTLIERS: {
        rootCause: `Extreme value detected in "${column}" — possible data entry error or legitimate edge case.`,
        severity: 'MEDIUM',
        suggestedFix: `Review the ${count} outlier(s). Cap at 3σ if data entry error, or flag for manual review.`,
        impact: 'Outliers distort statistical models and aggregate metrics.',
      },
      DUPLICATES: {
        rootCause: `${count} duplicate rows found — may indicate duplicate imports or ETL pipeline issues.`,
        severity: count > 5 ? 'HIGH' : 'MEDIUM',
        suggestedFix: `Deduplicate by keeping the first occurrence. Investigate the import pipeline.`,
        impact: 'Duplicates inflate counts and can cause double-processing.',
      },
      FORMAT: {
        rootCause: `Format mismatches in "${column}" — values don't match expected data types.`,
        severity: 'MEDIUM',
        suggestedFix: `Convert values to the expected format. Check source system encoding.`,
        impact: 'Type mismatches cause processing failures and invalid calculations.',
      },
      GARBAGE: {
        rootCause: `Invalid characters or placeholder values in "${column}" (e.g., #REF!, N/A).`,
        severity: 'LOW',
        suggestedFix: `Replace garbage values with NULL or remove the affected rows.`,
        impact: 'Garbage data corrupts reports and confuses downstream systems.',
      },
    };

    const fb = fallbacks[type] || fallbacks.FORMAT;

    return {
      problemType: type,
      column,
      rootCause: fb.rootCause,
      severity: fb.severity,
      isRealError: true,
      suggestedFix: fb.suggestedFix,
      confidence: 65,
      reasoning: 'Analysis generated by rule-based fallback (Claude API unavailable).',
      alternativeFixes: ['Delete affected rows', 'Flag for manual review'],
      impact: fb.impact,
      isFallback: true,
    };
  });
};

// ─── Main: Analyze with Claude ─────────────────────────────────────

/**
 * Send data quality problems to Claude for root-cause analysis.
 * Falls back to rule-based analysis if the API is unavailable.
 *
 * @param {Array} problems - Problems from the validation engine.
 * @param {Object} dataContext - Metadata about the dataset.
 * @returns {Object} - { analysis: [...], source: 'claude'|'fallback', cached: bool }
 */
const analyzeAnomaliesWithClaude = async (problems, dataContext = {}) => {
  if (!problems || problems.length === 0) {
    return { analysis: [], source: 'none', cached: false };
  }

  // Check cache first
  const cacheKey = getCacheKey(problems);
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    return { analysis: cached, source: 'claude', cached: true };
  }

  // Check for API key
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey || apiKey === 'sk-ant-xxxxxxxxxxxxx' || apiKey.length < 20) {
    console.warn('Claude API key not configured — using fallback analysis.');
    const fallback = generateFallback(problems);
    return { analysis: fallback, source: 'fallback', cached: false };
  }

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: buildPrompt(problems, dataContext),
        },
      ],
    });

    const responseText = message.content[0]?.text || '[]';

    // Parse JSON from Claude's response (strip markdown if present)
    let analysis;
    try {
      const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse Claude response as JSON');
      analysis = generateFallback(problems);
      return { analysis, source: 'fallback', cached: false };
    }

    // Cache the response
    responseCache.set(cacheKey, { data: analysis, timestamp: Date.now() });

    return { analysis, source: 'claude', cached: false };
  } catch (error) {
    console.error('Claude API error:', error.message);

    // Rate limit or other error — use fallback
    const fallback = generateFallback(problems);
    return { analysis: fallback, source: 'fallback', cached: false, error: error.message };
  }
};

/**
 * Clear the response cache.
 */
const clearCache = () => {
  responseCache.clear();
};

module.exports = {
  analyzeAnomaliesWithClaude,
  clearCache,
  generateFallback,
};
