export function concreteVolume(length: number, width: number, depth: number): number {
  return length * width * depth;
}

export function steelWeight(lengthM: number, diaMm: number, count = 1): number {
  // weight = d^2/162 * L (kg)
  return ((diaMm * diaMm) / 162) * lengthM * count;
}

export function brickCount(wallAreaM2: number, bricksPerM2 = 50): number {
  return Math.ceil(wallAreaM2 * bricksPerM2);
}

export function paintLitres(areaM2: number, coveragePerLitre = 10, coats = 2): number {
  return (areaM2 / coveragePerLitre) * coats;
}

export function rateAmount(quantity: number, rate: number): number {
  return +(quantity * rate).toFixed(2);
}

export function variancePercent(budgeted: number, actual: number): number {
  if (!budgeted) return 0;
  return +(((actual - budgeted) / budgeted) * 100).toFixed(2);
}

export function spi(earned: number, planned: number): number {
  if (!planned) return 0;
  return +(earned / planned).toFixed(2);
}

export function riskScore(probability: number, impact: number): number {
  return probability * impact;
}

export function riskRating(score: number): string {
  if (score <= 2) return 'very-low';
  if (score <= 4) return 'low';
  if (score <= 9) return 'medium';
  if (score <= 15) return 'high';
  if (score <= 20) return 'very-high';
  return 'extreme';
}

export function applyWastage(qty: number, pct: number): number {
  return +(qty * (1 + pct / 100)).toFixed(3);
}

export function sCurve(values: number[]): { x: number; y: number }[] {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  let cum = 0;
  return values.map((v, i) => {
    cum += v;
    return { x: i + 1, y: +(cum / total * 100).toFixed(1) };
  });
}
