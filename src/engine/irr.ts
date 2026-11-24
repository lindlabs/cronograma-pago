/**
 * Solves periodic Internal Rate of Return (TIR) and annualized TCEA
 * from the borrower's cash flow:
 *   CF_0 = +principal
 *   CF_k = -payment_k  (k = 1..n)
 *
 * Since NPV(r) = P - sum(payment_k / (1 + r)^k) is strictly increasing on r >= 0
 * whenever P > 0 and all payments >= 0 with sum(payments) > P,
 * bracketing + bisection guarantees convergence without divergence even for n = 360+.
 */
export function calculatePeriodicIrr(principal: number, payments: number[]): number {
  if (principal <= 0 || payments.length === 0) return 0;

  const totalOutflow = payments.reduce((acc, p) => acc + p, 0);
  if (totalOutflow <= principal + 1e-9) {
    return 0;
  }

  const npv = (r: number): number => {
    let pv = 0;
    const base = 1 + r;
    let discount = base;
    for (let i = 0; i < payments.length; i++) {
      if (payments[i] !== 0) {
        pv += payments[i] / discount;
      }
      discount *= base;
    }
    return principal - pv;
  };

  let low = 0;
  let high = 0.05;

  // Expand upper bound until NPV(high) >= 0
  let safety = 0;
  while (npv(high) < 0 && safety < 60) {
    high *= 2;
    safety++;
  }

  if (npv(high) < 0) {
    return high;
  }

  // Bisection to high precision (1e-12)
  for (let iter = 0; iter < 100; iter++) {
    const mid = (low + high) / 2;
    const val = npv(mid);
    if (Math.abs(val) < 1e-10 || high - low < 1e-12) {
      return mid;
    }
    if (val < 0) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

export function calculateTcea(periodicIrr: number, periodsPerYear: number): number {
  if (periodicIrr <= 0) return 0;
  return Math.pow(1 + periodicIrr, periodsPerYear) - 1;
}
