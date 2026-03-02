const mongoose = require('mongoose');

const loanRepaymentSchema = new mongoose.Schema({
  loan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0.01, 'Payment amount must be greater than 0'],
    get: v => parseFloat(v.toFixed(2)),
    set: v => parseFloat(v.toFixed(2))
  },
  paymentDate: {
    type: Date,
    required: [true, 'Payment date is required']
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  principalAmount: {
    type: Number,
    required: true,
    min: [0, 'Principal amount cannot be negative'],
    get: v => parseFloat(v.toFixed(2)),
    set: v => parseFloat(v.toFixed(2))
  },
  interestAmount: {
    type: Number,
    required: true,
    min: [0, 'Interest amount cannot be negative'],
    get: v => parseFloat(v.toFixed(2)),
    set: v => parseFloat(v.toFixed(2))
  },
  remainingBalanceAfterPayment: {
    type: Number,
    required: true,
    min: [0, 'Remaining balance cannot be negative'],
    get: v => parseFloat(v.toFixed(2)),
    set: v => parseFloat(v.toFixed(2))
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['cash', 'bank_transfer', 'cheque', 'upi', 'card', 'other']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  status: {
    type: String,
    required: true,
    enum: ['on-time', 'late', 'missed'],
    default: 'on-time'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

loanRepaymentSchema.index({ loan: 1, paymentDate: -1 });
loanRepaymentSchema.index({ dueDate: 1 });

module.exports = mongoose.model('LoanRepayment', loanRepaymentSchema);
