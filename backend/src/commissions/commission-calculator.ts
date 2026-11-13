export interface CommissionCalculation {
  commissionRate: number; // taux global = acheteur + vendeur
  buyerCommissionRate: number;
  sellerCommissionRate: number;
  fieldAgentShareRate: number;
  officeAgentShareRate: number;
  buyerAmount: number;
  sellerAmount: number;
  amount: number; // buyerAmount + sellerAmount
  agencyAmount: number;
  fieldAgentAmount: number;
  officeAgentAmount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 1e4) / 1e4;

function assertRate(name: string, value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${name} doit être compris entre 0 et 1`);
  }
}

export function calculateCommissionAmounts(
  transactionAmount: number,
  buyerCommissionRate: number,
  sellerCommissionRate: number,
  fieldAgentShareRate: number,
  officeAgentShareRate: number,
): CommissionCalculation {
  if (!Number.isFinite(transactionAmount) || transactionAmount < 0) {
    throw new Error("Le montant de la transaction est invalide");
  }
  assertRate("Le taux acheteur", buyerCommissionRate);
  assertRate("Le taux vendeur", sellerCommissionRate);
  assertRate("La part agent terrain", fieldAgentShareRate);
  assertRate("La part agent bureau", officeAgentShareRate);

  if (fieldAgentShareRate + officeAgentShareRate > 1) {
    throw new Error("La somme des parts agents ne peut pas dépasser 1");
  }

  const buyerAmount = round2(transactionAmount * buyerCommissionRate);
  const sellerAmount = round2(transactionAmount * sellerCommissionRate);
  const amount = round2(buyerAmount + sellerAmount);
  const fieldAgentAmount = round2(amount * fieldAgentShareRate);
  const officeAgentAmount = round2(amount * officeAgentShareRate);
  const agencyAmount = round2(amount - fieldAgentAmount - officeAgentAmount);

  return {
    commissionRate: round4(buyerCommissionRate + sellerCommissionRate),
    buyerCommissionRate,
    sellerCommissionRate,
    fieldAgentShareRate,
    officeAgentShareRate,
    buyerAmount,
    sellerAmount,
    amount,
    agencyAmount,
    fieldAgentAmount,
    officeAgentAmount,
  };
}