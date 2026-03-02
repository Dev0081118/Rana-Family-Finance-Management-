const Loan = require('../models/Loan');
const LoanRepayment = require('../models/LoanRepayment');
const asyncHandler = require('../middleware/asyncHandler');

// Helper function to calculate EMI
const calculateEMI = (principal, annualRate, months) => {
  if (principal <= 0 || annualRate <= 0 || months <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  return emi;
};

// Helper function to calculate loan totals
const calculateLoanTotals = (loan) => {
  const totalAmountToPay = loan.loanAmount + loan.totalInterestPayable;
  const remainingBalance = loan.loanAmount - loan.amountPaid;
  return {
    totalAmountToPay,
    remainingBalance
  };
};

const getAllLoans = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let query = {};

  // Apply filters
  if (req.query.status) {
    query.status = req.query.status;
  }
  if (req.query.startDate || req.query.endDate) {
    query.startDate = {};
    if (req.query.startDate) query.startDate.$gte = new Date(req.query.startDate);
    if (req.query.endDate) query.startDate.$lte = new Date(req.query.endDate);
  }

  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  const loans = await Loan.find(query)
    .populate('member', 'name email')
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Loan.countDocuments(query);

  res.status(200).json({
    success: true,
    count: loans.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: loans
  });
});

const getLoan = asyncHandler(async (req, res, next) => {
  const loan = await Loan.findOne({
    _id: req.params.id,
    member: req.user._id
  }).populate('member', 'name email');

  if (!loan) {
    return res.status(404).json({
      success: false,
      message: 'Loan not found'
    });
  }

  res.status(200).json({
    success: true,
    data: loan
  });
});

const createLoan = asyncHandler(async (req, res, next) => {
  const {
    name,
    lender,
    loanAmount,
    interestRate,
    term,
    startDate,
    endDate,
    purpose,
    collateral,
    memberId
  } = req.body;

  // Calculate EMI and totals
  const monthlyInstallment = calculateEMI(loanAmount, interestRate, term);
  const totalInterestPayable = (monthlyInstallment * term) - loanAmount;
  const totalAmountToPay = loanAmount + totalInterestPayable;
  const remainingBalance = totalAmountToPay; // Initially, full amount is remaining

  const loan = await Loan.create({
    name,
    lender,
    loanAmount,
    interestRate,
    term,
    monthlyInstallment,
    totalAmountToPay,
    totalInterestPayable,
    amountPaid: 0,
    remainingBalance,
    startDate,
    endDate,
    status: 'active',
    collateral,
    purpose,
    member: memberId || req.user._id
  });

  await loan.populate('member', 'name email');

  res.status(201).json({
    success: true,
    data: loan
  });
});

const updateLoan = asyncHandler(async (req, res, next) => {
  const {
    name,
    lender,
    loanAmount,
    interestRate,
    term,
    startDate,
    endDate,
    purpose,
    collateral,
    status
  } = req.body;

  // Build update object
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (lender !== undefined) updateData.lender = lender;
  if (loanAmount !== undefined) updateData.loanAmount = loanAmount;
  if (interestRate !== undefined) updateData.interestRate = interestRate;
  if (term !== undefined) updateData.term = term;
  if (startDate !== undefined) updateData.startDate = startDate;
  if (endDate !== undefined) updateData.endDate = endDate;
  if (purpose !== undefined) updateData.purpose = purpose;
  if (collateral !== undefined) updateData.collateral = collateral;
  if (status !== undefined) updateData.status = status;

  // Recalculate if financial parameters changed
  if (loanAmount !== undefined || interestRate !== undefined || term !== undefined) {
    const currentLoan = await Loan.findById(req.params.id);
    const principal = loanAmount !== undefined ? loanAmount : currentLoan.loanAmount;
    const rate = interestRate !== undefined ? interestRate : currentLoan.interestRate;
    const months = term !== undefined ? term : currentLoan.term;

    const monthlyInstallment = calculateEMI(principal, rate, months);
    const totalInterestPayable = (monthlyInstallment * months) - principal;
    const totalAmountToPay = principal + totalInterestPayable;

    updateData.monthlyInstallment = monthlyInstallment;
    updateData.totalInterestPayable = totalInterestPayable;
    updateData.totalAmountToPay = totalAmountToPay;
  }

  const loan = await Loan.findOneAndUpdate(
    {
      _id: req.params.id,
      member: req.user._id
    },
    updateData,
    {
      new: true,
      runValidators: true
    }
  ).populate('member', 'name email');

  if (!loan) {
    return res.status(404).json({
      success: false,
      message: 'Loan not found'
    });
  }

  res.status(200).json({
    success: true,
    data: loan
  });
});

const deleteLoan = asyncHandler(async (req, res, next) => {
  const loan = await Loan.findOneAndDelete({
    _id: req.params.id,
    member: req.user._id
  });

  if (!loan) {
    return res.status(404).json({
      success: false,
      message: 'Loan not found'
    });
  }

  // Also delete associated repayments
  await LoanRepayment.deleteMany({ loan: loan._id });

  res.status(200).json({
    success: true,
    message: 'Loan deleted successfully'
  });
});

const getLoanSummary = asyncHandler(async (req, res, next) => {
  // Members and admin can view all data
  let query = {};
  
  const summary = await Loan.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalLoans: { $sum: 1 },
        totalLoanAmount: { $sum: '$loanAmount' },
        totalRemainingBalance: { $sum: '$remainingBalance' },
        totalMonthlyPayments: { $sum: '$monthlyInstallment' },
        totalInterestPayable: { $sum: '$totalInterestPayable' },
        overdueLoans: {
          $sum: {
            $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0]
          }
        }
      }
    }
  ]);

  const result = summary[0] || {
    totalLoans: 0,
    totalLoanAmount: 0,
    totalRemainingBalance: 0,
    totalMonthlyPayments: 0,
    totalInterestPayable: 0,
    overdueLoans: 0
  };

  res.status(200).json({
    success: true,
    data: result
  });
});

const getLoanRepayments = asyncHandler(async (req, res, next) => {
  const { loanId } = req.params;

  // Verify loan belongs to user
  const loan = await Loan.findOne({
    _id: loanId,
    member: req.user._id
  });

  if (!loan) {
    return res.status(404).json({
      success: false,
      message: 'Loan not found'
    });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  const repayments = await LoanRepayment.find({ loan: loanId })
    .sort({ paymentDate: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await LoanRepayment.countDocuments({ loan: loanId });

  res.status(200).json({
    success: true,
    count: repayments.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: repayments
  });
});

const addLoanRepayment = asyncHandler(async (req, res, next) => {
  const { loanId } = req.params;
  const { amount, paymentDate, paymentMethod, notes } = req.body;

  // Get the loan
  const loan = await Loan.findOne({
    _id: loanId,
    member: req.user._id
  });

  if (!loan) {
    return res.status(404).json({
      success: false,
      message: 'Loan not found'
    });
  }

  // Calculate principal and interest portion (simple amortization)
  const principalPortion = (amount / loan.totalAmountToPay) * loan.loanAmount;
  const interestPortion = amount - principalPortion;

  // Calculate remaining balance
  const newRemainingBalance = loan.remainingBalance - amount;
  const newAmountPaid = loan.amountPaid + amount;

  // Create repayment record
  const repayment = await LoanRepayment.create({
    loan: loanId,
    amount,
    paymentDate,
    dueDate: paymentDate, // In a real app, this would be calculated based on schedule
    principalAmount: principalPortion,
    interestAmount: interestPortion,
    remainingBalanceAfterPayment: newRemainingBalance,
    paymentMethod,
    notes,
    status: 'on-time' // Could be determined based on paymentDate vs dueDate
  });

  // Update loan
  loan.amountPaid = newAmountPaid;
  loan.remainingBalance = newRemainingBalance;

  // Update status based on remaining balance
  if (newRemainingBalance <= 0) {
    loan.status = 'completed';
  } else if (newRemainingBalance > 0 && loan.status !== 'overdue') {
    loan.status = 'active';
  }

  await loan.save();

  res.status(201).json({
    success: true,
    data: repayment
  });
});

const updateLoanRepayment = asyncHandler(async (req, res, next) => {
  const { loanId, repaymentId } = req.params;
  const { amount, paymentDate, paymentMethod, notes } = req.body;

  // Verify loan belongs to user
  const loan = await Loan.findOne({
    _id: loanId,
    member: req.user._id
  });

  if (!loan) {
    return res.status(404).json({
      success: false,
      message: 'Loan not found'
    });
  }

  const repayment = await LoanRepayment.findOne({
    _id: repaymentId,
    loan: loanId
  });

  if (!repayment) {
    return res.status(404).json({
      success: false,
      message: 'Repayment not found'
    });
  }

  // Update repayment
  if (amount !== undefined) repayment.amount = amount;
  if (paymentDate !== undefined) repayment.paymentDate = paymentDate;
  if (paymentMethod !== undefined) repayment.paymentMethod = paymentMethod;
  if (notes !== undefined) repayment.notes = notes;

  await repayment.save();

  res.status(200).json({
    success: true,
    data: repayment
  });
});

const deleteLoanRepayment = asyncHandler(async (req, res, next) => {
  const { loanId, repaymentId } = req.params;

  // Verify loan belongs to user
  const loan = await Loan.findOne({
    _id: loanId,
    member: req.user._id
  });

  if (!loan) {
    return res.status(404).json({
      success: false,
      message: 'Loan not found'
    });
  }

  const repayment = await LoanRepayment.findOneAndDelete({
    _id: repaymentId,
    loan: loanId
  });

  if (!repayment) {
    return res.status(404).json({
      success: false,
      message: 'Repayment not found'
    });
  }

  // Recalculate loan totals (in a real app, you'd recalculate based on remaining repayments)
  // For simplicity, we'll just subtract the deleted repayment amount
  loan.amountPaid -= repayment.amount;
  loan.remainingBalance += repayment.amount;
  
  if (loan.remainingBalance <= 0) {
    loan.status = 'completed';
  } else if (loan.status === 'completed') {
    loan.status = 'active';
  }

  await loan.save();

  res.status(200).json({
    success: true,
    message: 'Repayment deleted successfully'
  });
});

module.exports = {
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
};
