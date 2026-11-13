
import { calculateCommissionAmounts } from "./commission-calculator";

describe("calculateCommissionAmounts", () => {
  it("calcule une commission acheteur de 2 % sur 250 000 DT", () => {
    const result = calculateCommissionAmounts(
      250_000,
      0.02, // Acheteur : 2 %
      0,    // Vendeur : 0 %
      0,    // Agent terrain : 0 %
      0,    // Agent bureau : 0 %
    );

    expect(result.buyerAmount).toBe(5000);
    expect(result.sellerAmount).toBe(0);
    expect(result.amount).toBe(5000);

    expect(result.agencyAmount).toBe(5000);
    expect(result.fieldAgentAmount).toBe(0);
    expect(result.officeAgentAmount).toBe(0);
  });

  it("répartit 30 % terrain / 20 % bureau / 50 % agence", () => {
    const result = calculateCommissionAmounts(
      250_000,
      0.02, // Acheteur : 2 %
      0,    // Vendeur : 0 %
      0.3,  // Agent terrain : 30 %
      0.2,  // Agent bureau : 20 %
    );

    expect(result.amount).toBe(5000);
    expect(result.agencyAmount).toBe(2500);
    expect(result.fieldAgentAmount).toBe(1500);
    expect(result.officeAgentAmount).toBe(1000);
  });

  it("calcule les commissions acheteur et vendeur séparément", () => {
    const result = calculateCommissionAmounts(
      250_000,
      0.02, // Acheteur : 2 %
      0.02, // Vendeur : 2 %
      0.3,
      0.2,
    );

    expect(result.buyerAmount).toBe(5000);
    expect(result.sellerAmount).toBe(5000);
    expect(result.amount).toBe(10000);

    expect(result.fieldAgentAmount).toBe(3000);
    expect(result.officeAgentAmount).toBe(2000);
    expect(result.agencyAmount).toBe(5000);
  });

  it("refuse un montant négatif", () => {
    expect(() =>
      calculateCommissionAmounts(-1000, 0.02, 0, 0, 0),
    ).toThrow("Le montant de la transaction est invalide");
  });

  it("refuse un taux supérieur à 100 %", () => {
    expect(() =>
      calculateCommissionAmounts(250_000, 1.5, 0, 0, 0),
    ).toThrow("Le taux acheteur doit être compris entre 0 et 1");
  });

  it("refuse une répartition des agents supérieure à 100 %", () => {
    expect(() =>
      calculateCommissionAmounts(250_000, 0.02, 0, 0.7, 0.4),
    ).toThrow("La somme des parts agents ne peut pas dépasser 100 %");
  });
});
