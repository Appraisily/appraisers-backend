const row = response.data.values ? response.data.values[0] : null;

if (!row) {
  return res.status(404).json({ success: false, message: 'Apreciación no encontrada.' });
}

const appraisal = {
  id: id,
  date: row[0] || '',
  appraisalType: row[1] || '',
  identifier: row[2] || '',
  status: row[5] || '',
  wordpressUrl: row[6] || '',
  iaDescription: row[7] || '',
  customerDescription: row[8] || '',
  value: row[9] || '',
  appraisersDescription: row[10] || '',
};

const wordpressUrl = appraisal.wordpressUrl;