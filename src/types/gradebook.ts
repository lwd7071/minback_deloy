import type { AssignmentStatus } from "@/types/assignment";
import type { EvaluationStatus } from "@/types/evaluation";

/**
 * Hợp đồng dữ liệu cho cột thông tin sinh viên trên bảng điểm (ISP).
 * Dành riêng cho các component hiển thị thông tin sinh viên ở cột cố định (sticky column).
 */
export interface GradebookStudentColumnDto {
  id: string;
  mssv: string;
  fullName: string;
  nickname: string;
}

/**
 * Hợp đồng dữ liệu cho tiêu đề bài tập trên bảng điểm (ISP).
 * Dành riêng cho table header và các tính toán liên quan đến phổ điểm bài tập.
 */
export interface GradebookAssignmentHeaderDto {
  id: string;
  title: string;
  maxScore: number;
  status: AssignmentStatus;
}

/**
 * Hợp đồng dữ liệu cho một ô điểm đơn lẻ (Cell Evaluation) trong ma trận (ISP).
 */
export interface GradebookCellEvaluationDto {
  id: string;
  score: number | null;
  status: EvaluationStatus;
}

/**
 * Ma trận điểm đánh giá 2 chiều:
 * Record<studentId, Record<assignmentId, GradebookCellEvaluationDto>>
 */
export type GradebookEvaluationMatrixDto = Record<
  string,
  Record<string, GradebookCellEvaluationDto>
>;

/**
 * Phân trang 2 chiều độc lập cho bảng điểm:
 * Phân trang danh sách sinh viên (chiều dọc) và phân trang bài tập (chiều ngang).
 */
export interface GradebookPaginationMetaDto {
  students: { page: number; pageSize: number; total: number };
  assignments: { page: number; pageSize: number; total: number };
}

/**
 * DTO tổng hợp của bảng điểm được cấu thành từ các Interface thành phần (ISP).
 * Đảm bảo tính toàn vẹn cấu trúc và tương thích ngược hoàn toàn.
 */
export interface GradebookDto {
  students: GradebookStudentColumnDto[];
  assignments: GradebookAssignmentHeaderDto[];
  evaluations: GradebookEvaluationMatrixDto;
  meta: GradebookPaginationMetaDto;
}
