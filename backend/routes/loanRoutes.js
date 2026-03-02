const express = require('express');
const router = express.Router();
const {
  getAllLoans,
  getLoan,
  createLoan,
  updateLoan,
  deleteLoan,
  getLoanSummary,
  getLoanRepayments,
  addLoanRepayment,
  updateLoanRepayment,
  deleteLoanRepayment
} = require('../controllers/loanController');
const { protect } = require('../middleware/auth');
const { validate, idValidation, paginationValidation, dateRangeValidation } = require('../middleware/validation');

router.use(protect);

router.route('/')
  .get(getAllLoans)
  .post(createLoan);

router.route('/summary')
  .get(getLoanSummary);

router.route('/:id')
  .get(getLoan)
  .put(updateLoan)
  .delete(deleteLoan);

router.route('/:loanId/repayments')
  .get(getLoanRepayments)
  .post(addLoanRepayment);

router.route('/:loanId/repayments/:repaymentId')
  .put(updateLoanRepayment)
  .delete(deleteLoanRepayment);

module.exports = router;
