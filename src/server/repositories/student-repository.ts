/**
 * src/server/repositories/student-repository.ts
 *
 * Repository quản lý bảng `students`.
 * Dùng createAdminClient() vì Student API không dùng Supabase Auth.
 *
 * Nguyên tắc bảo mật:
 * - Mọi query đều phải scope theo class_section_id để tránh cross-class leak
 * - Không trả pin_hash ra ngoài repository (chỉ dùng nội bộ để verify)
 * - Nickname và MSSV là unique theo từng lớp (enforce ở DB + code)
 */

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { StudentAdminDto, StudentRow } from "@/types/student";

// ─── Mapper: DB row → DTO (loại bỏ pin_hash) ─────────────────────────────────

function toStudentAdminDto(row: StudentRow): StudentAdminDto {
  return {
    id: row.id,
    classSectionId: row.class_section_id,
    mssv: row.mssv,
    fullName: row.full_name,
    email: row.email,
    nickname: row.nickname,
    mustChangeNickname: row.must_change_nickname,
    mustChangePin: row.must_change_pin,
    lockedUntil: row.locked_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Tìm Student theo nickname + classSectionId.
 * Dùng cho login: query bằng code lớp + nickname.
 * Trả toàn bộ row (kể cả pin_hash) để service có thể verify BCrypt.
 */
export async function findStudentByNicknameAndClass(
  nickname: string,
  classSectionId: string,
): Promise<StudentRow | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("nickname", nickname)
    .eq("class_section_id", classSectionId)
    .maybeSingle();

  if (error) {
    console.error("[StudentRepo] Lỗi findStudentByNicknameAndClass:", error.message);
    return null;
  }

  return data as StudentRow | null;
}

/**
 * Tìm classSectionId từ class code.
 * Dùng cho login: user nhập class code → cần resolve ra classSectionId.
 */
export async function findClassSectionIdByCode(
  code: string,
): Promise<string | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("class_sections")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("[StudentRepo] Lỗi findClassSectionIdByCode:", error.message);
    return null;
  }

  return data?.id ?? null;
}

/**
 * Tìm Student theo ID và classSectionId.
 * Luôn scope theo classSectionId để tránh cross-class access.
 */
export async function findStudentById(
  studentId: string,
  classSectionId: string,
): Promise<StudentAdminDto | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .eq("class_section_id", classSectionId)
    .maybeSingle();

  if (error || !data) return null;

  return toStudentAdminDto(data as StudentRow);
}

/**
 * Lấy danh sách Student trong một lớp với phân trang và tìm kiếm.
 * Search theo MSSV, fullName hoặc nickname (không phân biệt hoa thường).
 * Sắp xếp mặc định: mssv asc.
 */
export async function listStudentsByClassSection(
  classSectionId: string,
  options: {
    page: number;
    pageSize: number;
    search?: string;
  },
): Promise<{ students: StudentAdminDto[]; total: number }> {
  const supabase = createAdminClient();
  const { page, pageSize, search } = options;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("students")
    .select("*", { count: "exact" })
    .eq("class_section_id", classSectionId)
    .order("mssv", { ascending: true })
    .range(from, to);

  if (search && search.trim()) {
    const term = search.trim();
    // Tìm kiếm theo mssv, full_name hoặc nickname (case-insensitive)
    query = query.or(
      `mssv.ilike.%${term}%,full_name.ilike.%${term}%,nickname.ilike.%${term}%`,
    );
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(
      `Không thể lấy danh sách Student: ${error.message}`,
    );
  }

  return {
    students: (data as StudentRow[]).map(toStudentAdminDto),
    total: count ?? 0,
  };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Cập nhật failed_login_count và locked_until sau khi login sai.
 * Tăng failed_login_count; set locked_until nếu đã vượt ngưỡng.
 */
export async function incrementStudentFailedLogin(
  studentId: string,
): Promise<void> {
  const supabase = createAdminClient();

  // Lấy count hiện tại
  const { data: current } = await supabase
    .from("students")
    .select("failed_login_count")
    .eq("id", studentId)
    .single();

  const newCount = (current?.failed_login_count ?? 0) + 1;

  await supabase
    .from("students")
    .update({
      failed_login_count: newCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", studentId);
}

/**
 * Reset failed_login_count và locked_until về 0/null sau login thành công.
 */
export async function resetStudentFailedLogin(studentId: string): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from("students")
    .update({
      failed_login_count: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", studentId);
}

/**
 * Cập nhật thông tin Student (nickname, fullName, email) bởi Teacher.
 * Trả null nếu nickname đã tồn tại trong lớp (unique constraint violation).
 */
export async function updateStudentByTeacher(
  studentId: string,
  classSectionId: string,
  updates: {
    fullName?: string;
    email?: string | null;
    nickname?: string;
  },
): Promise<StudentAdminDto | null> {
  const supabase = createAdminClient();

  const dbUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.nickname !== undefined) dbUpdates.nickname = updates.nickname;

  const { data, error } = await supabase
    .from("students")
    .update(dbUpdates)
    .eq("id", studentId)
    .eq("class_section_id", classSectionId) // bắt buộc scope theo class
    .select()
    .single();

  if (error) {
    // PostgreSQL unique violation: code 23505
    if (error.code === "23505") return null;
    throw new Error(`Không thể cập nhật Student: ${error.message}`);
  }

  return toStudentAdminDto(data as StudentRow);
}

/**
 * Cập nhật PIN hash và set must_change_pin=true (sau khi Teacher reset PIN).
 * KHÔNG thay đổi nickname. KHÔNG reset must_change_nickname.
 */
export async function updateStudentPinHash(
  studentId: string,
  newPinHash: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("students")
    .update({
      pin_hash: newPinHash,
      must_change_pin: true,
      failed_login_count: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", studentId);

  if (error) {
    throw new Error(`Không thể cập nhật PIN: ${error.message}`);
  }
}

/**
 * Cập nhật nickname sau khi Student tự đổi (credential change flow).
 * Trả false nếu nickname đã tồn tại trong lớp.
 */
export async function updateStudentNickname(
  studentId: string,
  classSectionId: string,
  newNickname: string,
): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("students")
    .update({
      nickname: newNickname,
      must_change_nickname: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", studentId)
    .eq("class_section_id", classSectionId);

  if (error) {
    if (error.code === "23505") return false; // duplicate nickname
    throw new Error(`Không thể cập nhật nickname: ${error.message}`);
  }

  return true;
}

/**
 * Cập nhật PIN hash sau khi Student tự đổi (credential change flow).
 * Set must_change_pin=false.
 */
export async function updateStudentPin(
  studentId: string,
  newPinHash: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("students")
    .update({
      pin_hash: newPinHash,
      must_change_pin: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", studentId);

  if (error) {
    throw new Error(`Không thể cập nhật PIN: ${error.message}`);
  }
}

/**
 * Lấy thông tin Student theo studentId (internal use — không scope class).
 * Dùng sau khi đã xác thực session (studentId đã tin cậy).
 * Trả full row để service lấy pin_hash khi cần.
 */
export async function findStudentRowById(
  studentId: string,
): Promise<StudentRow | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .maybeSingle();

  if (error || !data) return null;
  return data as StudentRow;
}
