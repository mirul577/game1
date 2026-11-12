export class MathEngine {
  // Gradient: m = (y2 - y1) / (x2 - x1)
  static gradient(x1, y1, x2, y2) {
    if (x2 === x1) return 0; // vertical line: avoid division by zero in damage bonus
    return (y2 - y1) / (x2 - x1);
  }
  // Absolute value / Manhattan distance for grid-like movement.
  static distance(x1, y1, x2, y2) {
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
  }
  // Fibonacci sequence value used for combo milestone rewards.
  static fibonacci(n) {
    let a = 0, b = 1;
    for (let i = 0; i < n; i++) [a, b] = [b, a + b];
    return a;
  }
  // Generate a random permutation using Fisher-Yates.
  static permutation(values) {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  // Probability event: true when random sample is below probability.
  static probability(chance) { return Math.random() < Math.max(0, Math.min(1, chance)); }
}