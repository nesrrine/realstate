
export interface CommissionCalculation {
  commissionRate: number;

  buyerCommissionRate: number;
  sellerCommissionRate: number;

  fieldAgentShareRate: number;
  officeAgentShareRate: number;

  buyerAmount: number;
  sellerAmount: number;
  amount: number;

  agencyAmount: number;
  fieldAgentAmount: number;
  officeAgentAmount: number;
}

const round2 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100;

const round4 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 10000) / 10000;

function assertRate(name: string, value: number): void {
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
  // Vérification du montant
  if (
    !Number.isFinite(transactionAmount) ||
    transactionAmount < 0
  ) {
    throw new Error("Le montant de la transaction est invalide");
  }

  // Vérification des taux
  assertRate("Le taux acheteur", buyerCommissionRate);
  assertRate("Le taux vendeur", sellerCommissionRate);
  assertRate("La part agent terrain", fieldAgentShareRate);
  assertRate("La part agent bureau", officeAgentShareRate);

  // Les parts des agents ne peuvent pas dépasser 100 %
  if (fieldAgentShareRate + officeAgentShareRate > 1) {
    throw new Error(
      "La somme des parts agents ne peut pas dépasser 100 %",
    );
  }

  // 1. Commission acheteur
  const buyerAmount = round2(
    transactionAmount * buyerCommissionRate,
  );

  // 2. Commission vendeur
  const sellerAmount = round2(
    transactionAmount * sellerCommissionRate,
  );

  // 3. Commission totale
  const amount = round2(buyerAmount + sellerAmount);

  // 4. Part agent terrain
  const fieldAgentAmount = round2(
    amount * fieldAgentShareRate,
  );

  // 5. Part agent bureau
  const officeAgentAmount = round2(
    amount * officeAgentShareRate,
  );

  // 6. Part restante pour l'agence
  const agencyAmount = round2(
    amount - fieldAgentAmount - officeAgentAmount,
  );

  return {
    commissionRate: round4(
      buyerCommissionRate + sellerCommissionRate,
    ),

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
