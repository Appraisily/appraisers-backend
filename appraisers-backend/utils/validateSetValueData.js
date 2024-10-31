
// utils/validateSetValueData.js

module.exports = function validateSetValueData(req, res, next) {
  const { appraisalValue, description } = req.body;

  if (appraisalValue === undefined || description === undefined) {
    return res.status(400).json({ success: false, message: 'Appraisal Value and description are required.' });
  }

  // Puedes agregar más validaciones si es necesario
  // Por ejemplo, verificar que appraisalValue sea un número válido

  next();
};
