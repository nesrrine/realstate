export interface CommissionCalculation {
  commissionRate: number;
  fieldAgentShareRate: number;
  officeAgentShareRate: number;
  amount: number;
  agencyAmount: number;
  fieldAgentAmount: number;
  officeAgentAmount: number;
}

export function calculateCommissionAmounts(
  transactionAmount: number,
  commissionRate: number,
  fieldAgentShareRate: number,
  officeAgentShareRate: number,
): CommissionCalculation {
  const amount = Math.round(transactionAmount * commissionRate * 100) / 100;
  const fieldAgentAmount = Math.round(amount * fieldAgentShareRate * 100) / 100;
  const officeAgentAmount = Math.round(amount * officeAgentShareRate * 100) / 100;
  const agencyAmount = Math.round((amount - fieldAgentAmount - officeAgentAmount) * 100) / 100;

  return {
    commissionRate,
    fieldAgentShareRate,
    officeAgentShareRate,
    amount,
    agencyAmount,
    fieldAgentAmount,
    officeAgentAmount,
  };
}
