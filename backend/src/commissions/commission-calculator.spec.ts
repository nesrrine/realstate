import { calculateCommissionAmounts } from "./commission-calculator";

describe("calculateCommissionAmounts", () => {
  it("calcule 2 % sur 250 000 DT → 5 000 DT total", () => {
    const result = calculateCommissionAmounts(250_000, 0.02, 0, 0);
    expect(result.amount).toBe(5000);
    expect(result.agencyAmount).toBe(5000);
    expect(result.fieldAgentAmount).toBe(0);
    expect(result.officeAgentAmount).toBe(0);
  });

  it("répartit 30 % terrain / 20 % bureau / 50 % agence", () => {
    const result = calculateCommissionAmounts(250_000, 0.02, 0.3, 0.2);
    expect(result.amount).toBe(5000);
    expect(result.agencyAmount).toBe(2500);
    expect(result.fieldAgentAmount).toBe(1500);
    expect(result.officeAgentAmount).toBe(1000);
  });
});
