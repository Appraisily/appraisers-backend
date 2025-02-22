const { storageService } = require('../services');
const fetch = require('node-fetch');

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
 * Gets customer info from GCS path
 * @param {string} gcsPath GCS path
 * @returns {Promise<Object>} Customer info object
 */
async function getCustomerInfo(gcsPath) {
  const [bucketName, ...pathParts] = gcsPath.split('/');
  const folderPath = pathParts.join('/');
  
  const customerInfoPath = `${bucketName}/${folderPath}/customer_info.json`;
  console.log('Fetching customer info from:', customerInfoPath);
  
  const [customerInfoFiles] = await storageService.storage
    .bucket(bucketName)
    .getFiles({
      prefix: `${folderPath}/customer_info.json`
    });

  if (!customerInfoFiles?.[0]) {
    return null;
  }

  const [signedUrl] = await customerInfoFiles[0].getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 3600 * 1000 // 1 hour
  });
  
  const response = await fetch(signedUrl);
  return response.json();
}

/**
 * Gets appraisal type from GCS path
 * @param {string} gcsPath GCS path
 * @returns {Promise<string>} Appraisal type
 */
async function getAppraisalType(gcsPath) {
  if (!gcsPath) {
    return 'RegularArt';
  }

  try {
    const customerInfo = await getCustomerInfo(gcsPath);
    if (!customerInfo?.appraisal_type) {
      return 'RegularArt';
    }

    return mapAppraisalType(customerInfo.appraisal_type);
  } catch (error) {
    console.error('Error getting appraisal type:', error);
    return 'RegularArt';
  }
}

module.exports = {
  getAppraisalType,
  mapAppraisalType,
  getCustomerInfo
};