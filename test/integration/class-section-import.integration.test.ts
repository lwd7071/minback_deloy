import { randomUUID } from "node:crypto";

import { Workbook } from "exceljs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CookieJar, fetchApi } from "./setup";

const TEACHER_A = {
  email: "teacher-a@minback.local",
  password: "DemoTeacherA123!",
};
const TEACHER_B = {
  email: "teacher-b@minback.local",
  password: "DemoTeacherB123!",
};
const CLASS_A = "f1000000-0000-0000-0000-000000000001";
const CLASS_B = "f1000000-0000-0000-0000-000000000002";

async function loginAsTeacher(
  jar: CookieJar,
  credentials = TEACHER_A,
): Promise<void> {
  const response = await fetchApi(
    "/api/v1/teacher/auth/login",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(credentials),
    },
    jar,
  );
  expect(response.status).toBe(200);
}

async function cleanupImportedStudents(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/students?id=in.(${ids.join(",")})`,
    {
      method: "DELETE",
      headers: {
        apikey: process.env.SUPABASE_SECRET_KEY!,
        authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY!}`,
      },
    },
  );
  expect(response.ok).toBe(true);
}

async function getImportedStudents(ids: string[]): Promise<
  Array<{
    id: string;
    mssv: string;
    full_name: string;
    email: string | null;
    nickname: string;
    pin_hash: string;
    must_change_nickname: boolean;
    must_change_pin: boolean;
  }>
> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/students?id=in.(${ids.join(",")})&select=id,mssv,full_name,email,nickname,pin_hash,must_change_nickname,must_change_pin`,
    {
      headers: {
        apikey: process.env.SUPABASE_SECRET_KEY!,
        authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY!}`,
      },
    },
  );
  expect(response.ok).toBe(true);
  return (await response.json()) as Awaited<
    ReturnType<typeof getImportedStudents>
  >;
}

function csvForm(contents: string): FormData {
  const form = new FormData();
  form.set("file", new File([contents], "students.csv", { type: "text/csv" }));
  return form;
}

async function xlsxForm(rows: string[][]): Promise<FormData> {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("Students");
  worksheet.addRows(rows);
  const form = new FormData();
  form.set(
    "file",
    new File([await workbook.xlsx.writeBuffer()], "students.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  return form;
}

async function findStudentsByMssv(
  mssv: string,
): Promise<Array<{ id: string }>> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/students?mssv=eq.${mssv}&select=id`,
    {
      headers: {
        apikey: process.env.SUPABASE_SECRET_KEY!,
        authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY!}`,
      },
    },
  );
  expect(response.ok).toBe(true);
  return (await response.json()) as Array<{ id: string }>;
}

describe("ClassSection import API", () => {
  let jar: CookieJar;
  const createdStudentIds: string[] = [];

  beforeEach(async () => {
    jar = new CookieJar();
    await loginAsTeacher(jar);
  });

  afterEach(async () => {
    await cleanupImportedStudents(createdStudentIds.splice(0));
  });

  it("creates imported students with one-time BCrypt-backed credentials", async () => {
    const suffix = randomUUID().slice(0, 8).toUpperCase();
    const form = new FormData();
    form.set(
      "file",
      new File(
        [
          ` mssv , HỌ TÊN , Email\r\nSV${suffix}1, Nguyễn Văn A, a-${suffix}@example.test\r\nSV${suffix}2, Trần Thị B,\r\n`,
        ],
        "students.csv",
        { type: "text/csv" },
      ),
    );

    const response = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}/import`,
      { method: "POST", body: form },
      jar,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body.data.summary).toEqual({
      total: 2,
      created: 2,
      updated: 0,
      skipped: 0,
    });
    expect(body.data.rows).toHaveLength(2);
    expect(
      body.data.rows.map(
        (row: { initialNickname: string }) => row.initialNickname,
      ),
    ).toEqual([`SV${suffix}1`, `SV${suffix}2`]);

    const pins = body.data.rows.map(
      (row: { initialPin: string }) => row.initialPin,
    );
    expect(pins).toHaveLength(2);
    expect(pins[0]).toMatch(/^\d{6}$/);
    expect(pins[1]).toMatch(/^\d{6}$/);
    expect(pins[0]).not.toBe(pins[1]);
    createdStudentIds.push(
      ...body.data.rows.map((row: { studentId: string }) => row.studentId),
    );

    const storedStudents = await getImportedStudents(createdStudentIds);
    expect(storedStudents).toHaveLength(2);
    for (const [index, student] of storedStudents.entries()) {
      expect(student.pin_hash).toMatch(/^\$2[aby]\$/);
      expect(student.pin_hash).not.toBe(pins[index]);
      expect(student.must_change_nickname).toBe(true);
      expect(student.must_change_pin).toBe(true);
    }

    for (const [index, mssv] of [`SV${suffix}1`, `SV${suffix}2`].entries()) {
      const studentJar = new CookieJar();
      const loginResponse = await fetchApi(
        "/api/v1/student/auth/login",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            classCode: "DEMO_A",
            nickname: mssv,
            pin: pins[index],
          }),
        },
        studentJar,
      );
      expect(loginResponse.status).toBe(200);
      expect((await loginResponse.json()).data).toMatchObject({
        mustChangeNickname: true,
        mustChangePin: true,
      });
    }

    const listResponse = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}/students?page=1&pageSize=100`,
      { method: "GET" },
      jar,
    );
    expect(listResponse.status).toBe(200);
    const listed = await listResponse.text();
    expect(listed).not.toContain(pins[0]);
    expect(listed).not.toContain(pins[1]);
    expect(listed).not.toContain("initialPin");
  });

  it("rejects unauthenticated and cross-Teacher imports", async () => {
    const makeForm = () => {
      const form = new FormData();
      form.set(
        "file",
        new File(["MSSV,Họ Tên\nSV001,Nguyen Van A\n"], "students.csv"),
      );
      return form;
    };

    const unauthenticated = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}/import`,
      { method: "POST", body: makeForm() },
    );
    expect(unauthenticated.status).toBe(401);

    const crossTeacher = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_B}/import`,
      { method: "POST", body: makeForm() },
      jar,
    );
    expect(crossTeacher.status).toBe(404);
  });

  it("preserves valid rows through row errors, duplicates and re-import", async () => {
    const suffix = randomUUID().slice(0, 8).toUpperCase();
    const existingMssv = `SV${suffix}EXISTING`;
    const newMssv = `SV${suffix}NEW`;
    const initialResponse = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}/import`,
      {
        method: "POST",
        body: csvForm(
          `MSSV,Họ Tên,Email\n${existingMssv},Tên ban đầu,initial-${suffix}@example.test\n`,
        ),
      },
      jar,
    );
    const initial = await initialResponse.json();
    expect(initialResponse.status).toBe(200);
    const existingId = initial.data.rows[0].studentId as string;
    createdStudentIds.push(existingId);
    const before = (await getImportedStudents([existingId]))[0];

    const partialResponse = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}/import`,
      {
        method: "POST",
        body: csvForm(
          [
            "MSSV,Họ Tên,Email",
            "",
            ",Thiếu MSSV,missing@example.test",
            `SV${suffix}INVALID,,not-an-email`,
            `${newMssv},Sinh viên mới,new-${suffix}@example.test`,
            `${newMssv},Bản ghi trùng,duplicate-${suffix}@example.test`,
            `${existingMssv},Tên đã cập nhật,updated-${suffix}@example.test`,
            "",
          ].join("\n"),
        ),
      },
      jar,
    );
    const partial = await partialResponse.json();

    expect(partialResponse.status).toBe(200);
    expect(partial.data.summary).toEqual({
      total: 5,
      created: 1,
      updated: 1,
      skipped: 3,
    });
    expect(
      partial.data.rows.map((row: { row: number; status: string }) => [
        row.row,
        row.status,
      ]),
    ).toEqual([
      [3, "skipped"],
      [4, "skipped"],
      [5, "created"],
      [6, "skipped"],
      [7, "updated"],
    ]);
    expect(partial.data.rows[0].errors[0].field).toBe("mssv");
    expect(partial.data.rows[1].errors.length).toBeGreaterThan(0);
    expect(partial.data.rows[3].errors[0].field).toBe("mssv");
    expect(partial.data.rows[4]).not.toHaveProperty("initialPin");

    const newId = partial.data.rows[2].studentId as string;
    createdStudentIds.push(newId);
    const after = await getImportedStudents([existingId, newId]);
    const existing = after.find((student) => student.id === existingId)!;
    const created = after.find((student) => student.id === newId)!;

    expect(existing).toMatchObject({
      mssv: existingMssv,
      full_name: "Tên đã cập nhật",
      email: `updated-${suffix}@example.test`,
      nickname: before.nickname,
      pin_hash: before.pin_hash,
      must_change_nickname: before.must_change_nickname,
      must_change_pin: before.must_change_pin,
    });
    expect(created).toMatchObject({
      mssv: newMssv,
      full_name: "Sinh viên mới",
      email: `new-${suffix}@example.test`,
      nickname: newMssv,
    });
  });

  it("does not update the same MSSV in a different ClassSection", async () => {
    const suffix = randomUUID().slice(0, 8).toUpperCase();
    const mssv = `SV${suffix}`;
    const teacherBJar = new CookieJar();
    await loginAsTeacher(teacherBJar, TEACHER_B);

    const classBImport = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_B}/import`,
      {
        method: "POST",
        body: csvForm(`MSSV,Họ Tên\n${mssv},Tên lớp B\n`),
      },
      teacherBJar,
    );
    const classBBody = await classBImport.json();
    expect(classBImport.status).toBe(200);
    const classBStudentId = classBBody.data.rows[0].studentId as string;
    createdStudentIds.push(classBStudentId);

    const classAImport = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}/import`,
      {
        method: "POST",
        body: csvForm(`MSSV,Họ Tên\n${mssv},Tên lớp A\n`),
      },
      jar,
    );
    const classABody = await classAImport.json();
    expect(classAImport.status).toBe(200);
    const classAStudentId = classABody.data.rows[0].studentId as string;
    createdStudentIds.push(classAStudentId);

    const reimportClassA = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}/import`,
      {
        method: "POST",
        body: csvForm(`MSSV,Họ Tên\n${mssv},Tên lớp A đã cập nhật\n`),
      },
      jar,
    );
    expect(reimportClassA.status).toBe(200);
    expect((await reimportClassA.json()).data.summary).toEqual({
      total: 1,
      created: 0,
      updated: 1,
      skipped: 0,
    });

    const [studentB, studentA] = await getImportedStudents([
      classBStudentId,
      classAStudentId,
    ]);
    const studentsById = new Map([
      [studentB.id, studentB],
      [studentA.id, studentA],
    ]);
    expect(studentsById.get(classBStudentId)).toMatchObject({
      full_name: "Tên lớp B",
    });
    expect(studentsById.get(classAStudentId)).toMatchObject({
      full_name: "Tên lớp A đã cập nhật",
    });
  });

  it("gives XLSX the same normalized row outcomes as CSV", async () => {
    const suffix = randomUUID().slice(0, 8).toUpperCase();
    const csvMssv = `SV${suffix}CSV`;
    const xlsxMssv = `SV${suffix}XLSX`;
    const csvResponse = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}/import`,
      {
        method: "POST",
        body: csvForm(
          ` mSsV , HỌ TÊN , Email\n${csvMssv},Sinh viên hợp lệ,valid-${suffix}@example.test\nSV${suffix}INVALID,,bad-email\n`,
        ),
      },
      jar,
    );
    const csvBody = await csvResponse.json();
    expect(csvResponse.status).toBe(200);
    createdStudentIds.push(csvBody.data.rows[0].studentId);

    const xlsxResponse = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}/import`,
      {
        method: "POST",
        body: await xlsxForm([
          [" mSsV ", " HỌ TÊN ", " Email "],
          [xlsxMssv, "Sinh viên hợp lệ", `valid-${suffix}@example.test`],
          [`SV${suffix}INVALID`, "", "bad-email"],
        ]),
      },
      jar,
    );
    const xlsxBody = await xlsxResponse.json();

    expect(xlsxResponse.status).toBe(200);
    expect(xlsxBody.data.summary).toEqual(csvBody.data.summary);
    expect(
      xlsxBody.data.rows.map((row: { row: number; status: string }) => [
        row.row,
        row.status,
      ]),
    ).toEqual(
      csvBody.data.rows.map((row: { row: number; status: string }) => [
        row.row,
        row.status,
      ]),
    );
    createdStudentIds.push(xlsxBody.data.rows[0].studentId);
  });

  it("rejects whole-file validation failures before creating Students", async () => {
    const suffix = randomUUID().slice(0, 8).toUpperCase();
    const mssv = `SV${suffix}LIMIT`;
    const exactLimitMssv = `SV${suffix}EXACT`;
    const endpoint = `/api/v1/teacher/class-sections/${CLASS_A}/import`;
    const unsupported = new FormData();
    unsupported.set(
      "file",
      new File(["MSSV,Họ Tên\nSV001,Nguyen Van A\n"], "students.txt"),
    );
    const missingHeaders = csvForm(
      `MSSV,Email\n${mssv},valid-${suffix}@example.test\n`,
    );
    const overLimit = new FormData();
    overLimit.set(
      "file",
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "students.csv"),
    );
    const tooManyRows = csvForm(
      [
        "MSSV,Họ Tên",
        ...Array.from({ length: 2001 }, () => `${mssv},Sinh viên`),
      ].join("\n"),
    );

    const exactLimit = await fetchApi(
      endpoint,
      {
        method: "POST",
        body: csvForm(
          [
            "MSSV,Họ Tên",
            ...Array.from(
              { length: 2000 },
              () => `${exactLimitMssv},Sinh viên`,
            ),
          ].join("\n"),
        ),
      },
      jar,
    );
    const exactLimitBody = await exactLimit.json();
    expect(exactLimit.status).toBe(200);
    expect(exactLimitBody.data.summary).toEqual({
      total: 2000,
      created: 1,
      updated: 0,
      skipped: 1999,
    });
    createdStudentIds.push(exactLimitBody.data.rows[0].studentId);

    for (const form of [unsupported, missingHeaders, overLimit, tooManyRows]) {
      const response = await fetchApi(
        endpoint,
        { method: "POST", body: form },
        jar,
      );
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    }
    expect(await findStudentsByMssv(mssv)).toEqual([]);
  });
});
