import "server-only";

/**
 * @deprecated Tệp này đã được tái cấu trúc theo chuẩn Single Responsibility Principle (SRP).
 * - Các hàm quản lý lớp (Class Section): chuyển sang `@/server/repositories/classes/class-section-repository`
 * - Các hàm bảng điểm (Gradebook): chuyển sang `@/server/repositories/evaluations/gradebook-repository`
 *
 * Vui lòng import trực tiếp từ domain repository tương ứng.
 */

export {
  findPublicClassSectionByCode,
  consumePublicLookupRateLimit,
  listClassSectionSummaries,
} from "@/server/repositories/classes/class-section-repository";

export { getGradebookRows } from "@/server/repositories/evaluations/gradebook-repository";
