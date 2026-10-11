import pkg from "exceljs";
import type { Criterion, CriterionScore } from "@/lib/evaluation-criteria";

const { Workbook } = pkg;

export type EvaluationExportStudent = {
  mssv: string;
  fullName: string;
  evaluation?: {
    score: number | null;
    feedback: string;
    criteriaScores?: CriterionScore[];
  };
};

function sanitizeTitle(title: string): string {
  return (
    title
      .normalize("NFC")
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[. ]+$/g, "") || "Bai_tap"
  );
}

export async function buildEvaluationExportWorkbook(
  assignmentTitle: string,
  criteria: Criterion[],
  students: EvaluationExportStudent[],
): Promise<{ buffer: Buffer; fileName: string }> {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("BangDiem");
  const headers = [
    "MSSV",
    "Họ tên",
    ...criteria.map((criterion) => `${criterion.name} (${criterion.weight}%)`),
    "Điểm",
    "Feedback",
  ];

  worksheet.addRow(headers);
  worksheet.getRow(1).font = { bold: true };
  worksheet.columns = headers.map((header, index) => ({
    width:
      index === 0 ? 16 : index === 1 ? 28 : header === "Feedback" ? 45 : 18,
  }));

  for (const student of students) {
    const scores = new Map(
      (student.evaluation?.criteriaScores ?? []).map((item) => [
        item.name,
        item.score,
      ]),
    );
    worksheet.addRow([
      student.mssv,
      student.fullName,
      ...criteria.map((criterion) => scores.get(criterion.name) ?? null),
      student.evaluation?.score ?? null,
      student.evaluation?.feedback || null,
    ]);
  }

  return {
    buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
    fileName: `BangDiem_${sanitizeTitle(assignmentTitle)}.xlsx`,
  };
}
