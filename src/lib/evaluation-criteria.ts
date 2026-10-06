// Module tính điểm theo tiêu chí (rubric). Thuần hàm, không phụ thuộc DB.

export type Criterion = { name: string; weight: number }; // weight: 0-100
export type CriterionScore = Criterion & { score: number }; // score: thang 10

export const CRITERION_MAX_SCORE = 10;
const WEIGHT_TOLERANCE = 0.01;

// "Báo cáo (30%)" -> { name: "Báo cáo", weight: 30 }; không khớp -> null
export function parseCriteriaHeader(header: string): Criterion | null {
  const match = header.match(/^(.*?)\(\s*(\d+(?:[.,]\d+)?)\s*%\s*\)\s*$/);
  if (!match) return null;
  const name = match[1].trim();
  const weight = Number(match[2].replace(",", "."));
  if (!name || Number.isNaN(weight) || weight <= 0 || weight > 100) return null;
  return { name, weight };
}

// Quét các cột trong [from, to) và lấy cột có (xx%)
export function extractCriteria(
  headers: string[],
  from: number,
  to: number,
): { indexes: number[]; criteria: Criterion[] } {
  const indexes: number[] = [];
  const criteria: Criterion[] = [];
  for (let i = from; i < to; i += 1) {
    const parsed = parseCriteriaHeader(headers[i] ?? "");
    if (parsed) {
      indexes.push(i);
      criteria.push(parsed);
    }
  }
  return { indexes, criteria };
}

// Trả về thông báo lỗi, hoặc null nếu hợp lệ
export function validateWeights(criteria: Criterion[]): string | null {
  const names = new Set<string>();
  for (const c of criteria) {
    const key = c.name.trim().toLowerCase();
    if (names.has(key)) return `Tên tiêu chí bị trùng: "${c.name}"`;
    names.add(key);
  }
  const total = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (Math.abs(total - 100) > WEIGHT_TOLERANCE) {
    return `Tổng trọng số các tiêu chí phải bằng 100% (hiện tại ${Math.round(total * 100) / 100}%)`;
  }
  return null;
}

// Tổng = Σ(điểm × %)/100, quy đổi theo maxScore, chỉ làm tròn 1 chữ số ở cuối
export function computeTotal(scores: CriterionScore[], maxScore: number): number {
  const weighted = scores.reduce((sum, c) => sum + c.score * c.weight, 0) / 100;
  const scaled = (weighted * maxScore) / CRITERION_MAX_SCORE;
  return Math.round(scaled * 10) / 10;
}
