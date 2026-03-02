const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Loan name is required'],
    trim: true
  },
  lender: {
    type: String,
    required: [true, 'Lender name is required'],
    trim: true
  },
  loanAmount: {
    type: Number,
    required: [true, 'Loan amount is required'],
    min: [0, 'Loan amount cannot be negative'],
    get: v => parseFloat(v.toFixed(2)),
    set: v => parseFloat(v.toFixed(2))
  },
  interestRate: {
    type: Number,
    required: [true, 'Interest rate is required'],
    min: [0, 'Interest rate cannot be negative'],
    max: [100, 'Interest rate cannot exceed 100'],
    get: v => parseFloat(v.toFixed(2)),
    set: v => parseFloat(v.toFixed(2))
  },
  term: {
    type: Number,
    required: [true, 'Loan term is required'],
    min: [1, 'Term must be at least 1 month'],
    get: v => Math.floor(v),
    set: v => Math.floor(v)
  },
  monthlyInstallment: {
    type: Number,
    required: true,
    min: [0, 'Monthly installment cannot be negative'],
    get: v => parseFloat(v.toFixed(2)),
    set: v => parseFloat(v.toFixed(2))
  },
  totalAmountToPay: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative'],
    get: v => parseFloat(v.toFixed(2)),
    set: v => parseFloat(v.toFixed(2))
  },
  totalInterestPayable: {
    type: Number,
    required: true,
    min: [0, 'Interest cannot be negative'],
    get: v => parseFloat(v.toFixed(2)),
    set: v => parseFloat(v.toFixed(2))
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: [0, 'Amount paid cannot be negative'],
    get: v => parseFloat(v.toFixed(2)),
    set: v => parseFloat(v.toFixed(2))
  },
  remainingBalance: {
    type: Number,
    required: true,
    min: [0, 'Remaining balance cannot be negative'],
    get: v => parseFloat(v.toFixed(2)),
    set: v => parseFloat(v.toFixed(2))
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'completed', 'overdue', 'pending'],
    default: 'active'
  },
  collateral: {
    type: String,
    trim: true,
    maxlength: [500, 'Collateral description cannot exceed 500 characters']
  },
  purpose: {
    type: String,
    required: [true, 'Purpose is required'],
    trim: true
  },
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

loanSchema.index({ member: 1, status: 1 });
loanSchema.index({ status: 1 });
loanSchema.index({ startDate: 1 });
loanSchema.index({ endDate: 1 });

module.exports = mongoose.model('Loan', loanSchema);
