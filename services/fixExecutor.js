/**
 * fixExecutor.js
 * Executes data cleaning fixes based on problem type.
 */

/**
 * Execute a fix on the uploaded data
 * @param {Array} data - Array of row objects
 * @param {string} problemType - 'NULL_VALUES', 'DUPLICATES', 'OUTLIERS', 'GARBAGE', 'FORMAT'
 * @param {Object} details - Details about the problem (like column name)
 * @returns {Object} { fixedData, changes: { rowsRemoved, rowsModified } }
 */
const executeFixOnData = async (data, problemType, details) => {
  let fixedData = [...data];
  let rowsRemoved = 0;
  let rowsModified = 0;

  const column = details.column || (details.affectedColumns && details.affectedColumns[0]);
  if (!column && problemType !== 'DUPLICATES') {
    return { fixedData, changes: { rowsRemoved, rowsModified } };
  }

  switch (problemType) {
    case 'NULL_VALUES': {
        // Find rows with >50% NULLs or specifically null in this column
        fixedData = fixedData.filter(row => {
            if (row[column] === null || row[column] === undefined || row[column] === '') {
                rowsRemoved++;
                return false;
            }
            return true;
        });
        break;
    }
    
    case 'DUPLICATES': {
        // Find duplicates by stringifying the row
        const seen = new Set();
        fixedData = fixedData.filter(row => {
            const key = JSON.stringify(row);
            if (seen.has(key)) {
                rowsRemoved++;
                return false;
            }
            seen.add(key);
            return true;
        });
        break;
    }

    case 'OUTLIERS': {
        // Calculate median
        const values = fixedData
            .map(row => Number(row[column]))
            .filter(v => !isNaN(v))
            .sort((a, b) => a - b);
        
        if (values.length > 0) {
            const median = values[Math.floor(values.length / 2)];
            const cap = median * 1.5;
            
            fixedData = fixedData.map(row => {
                const val = Number(row[column]);
                if (!isNaN(val) && val > cap) {
                    row[column] = cap;
                    rowsModified++;
                }
                return row;
            });
        }
        break;
    }

    case 'FORMAT': {
        fixedData = fixedData.map(row => {
            const val = row[column];
            if (typeof val === 'string') {
                // simple trim & convert to valid generic string avoiding weird formats
                row[column] = val.trim();
                rowsModified++;
            }
            return row;
        });
        break;
    }

    case 'GARBAGE': {
        fixedData = fixedData.filter(row => {
            const val = String(row[column] || '');
            if (val.includes('#REF!') || val.includes('#N/A') || val.includes('')) {
                rowsRemoved++;
                return false;
            }
            return true;
        });
        break;
    }

    default:
        break;
  }

  return { fixedData, changes: { rowsRemoved, rowsModified } };
};

module.exports = { executeFixOnData };
