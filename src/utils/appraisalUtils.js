/**
 * Maps customer info appraisal type to system type
 * @param {string} type Customer info appraisal type
 * @returns {string} System appraisal type
 */
function mapAppraisalType(type) {
  const typeMap = {
    'regular': 'RegularArt',
    'premium': 'PremiumArt',
    'jewelry': 'Jewelry'
  };

  return typeMap[type.toLowerCase()] || 'RegularArt';
}

/**
 * Extracts appraisal type from bulk identifier
 * @param {string} bulkIdentifier Format: "Bulk_$APPRAISALTYPE_$NUMBEROFITEMS"
 * @returns {string} Appraisal type
 */
function extractBulkInfo(bulkIdentifier) {
  if (!bulkIdentifier?.startsWith('Bulk_')) {
    return { type: 'RegularArt', count: 1 };
  }

  const parts = bulkIdentifier.split('_');
  if (parts.length !== 3) {
    return { type: 'RegularArt', count: 1 };
  }

  return {
    type: mapAppraisalType(parts[1]),
    count: parseInt(parts[2], 10) || 1
  };
}

/**
 * Gets appraisal type from GCS path
 * @param {string} bulkIdentifier Bulk identifier from column B
 * @returns {Promise<string>} Appraisal type
 */
function getAppraisalType(bulkIdentifier) {
  if (!bulkIdentifier) {
    return 'RegularArt';
  }

  const { type } = extractBulkInfo(bulkIdentifier);
  return type;
}

module.exports = {
  getAppraisalType,
  mapAppraisalType,
  extractBulkInfo
};