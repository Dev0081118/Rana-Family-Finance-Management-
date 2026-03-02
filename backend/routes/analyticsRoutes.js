const express = require('express');
const router = express.Router();
const { getDashboardAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

// Middleware to validate filter parameter
const validateFilter = (req, res, next) => {
  const { filter } = req.query;
  const allowedFilters = ['today', 'month', 'all'];
  
  if (filter && !allowedFilters.includes(filter)) {
    return res.status(400).json({
      success: false,
      message: `Invalid filter. Allowed values: ${allowedFilters.join(', ')}`
    });
  }
  
  next();
};

router.use(protect);

router.route('/')
  .get(validateFilter, getDashboardAnalytics);

module.exports = router;
