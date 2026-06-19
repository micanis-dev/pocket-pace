import { createAccountSchema, cycleSchema, expenseSchema } from '../src/schemas/api';

describe('API schemas', () => {
  it('requires integer amounts', () => {
    expect(() => createAccountSchema.parse({ name: 'Wallet', type: 'wallet', initialBalance: 1.5 })).toThrow();
  });

  it('requires a credit card for card payments', () => {
    expect(() => expenseSchema.parse({ cycleId: 'cycle', categoryId: 'cat', name: 'Lunch', amount: 850, expenseDate: '2026-06-19', paymentMethod: 'credit_card' })).toThrow('creditCardId is required');
  });

  it('rejects normalized but nonexistent calendar dates', () => {
    expect(() => cycleSchema.parse({ name: 'Invalid', startDate: '2026-02-30', endDate: '2026-03-01', resetType: 'custom' })).toThrow('date is invalid');
  });
});
