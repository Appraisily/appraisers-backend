function validateSetValue(req, res, next) {
  const { appraisalValue, description } = req.body;

  if (appraisalValue === undefined || description === undefined) {
    return res.status(400).json({ 
      success: false, 
      message: 'Appraisal Value and description are required.' 
    });
  }

  next();
}

module.exports = { validateSetValue };