import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in env",
  );
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  console.log("Checking teachers...");
  const { data: teachers, error: tErr } = await supabase
    .from("teachers")
    .select("id, display_name")
    .limit(5);

  if (tErr || !teachers || teachers.length === 0) {
    console.error("No teachers found:", tErr);
    process.exit(1);
  }

  console.log("Found teachers:", teachers);
  const teacher = teachers[0];
  console.log(`Using teacher: ${teacher.display_name} (${teacher.id})`);

  const code = "TEST15";
  const name = "test nhieu bt";

  // Check if class already exists
  const { data: existingClass } = await supabase
    .from("class_sections")
    .select("id, code, name")
    .eq("code", code)
    .maybeSingle();

  let classId;
  if (existingClass) {
    console.log(`Class ${code} already exists:`, existingClass);
    classId = existingClass.id;
  } else {
    console.log(`Creating class ${code} - "${name}"...`);
    const { data: newClass, error: cErr } = await supabase
      .from("class_sections")
      .insert({
        teacher_id: teacher.id,
        code,
        name,
      })
      .select()
      .single();

    if (cErr) {
      console.error("Error creating class:", cErr);
      process.exit(1);
    }
    console.log("Created class:", newClass);
    classId = newClass.id;
  }

  // Generate 25 assignments
  console.log(`Generating 25 assignments for class ${classId}...`);
  const now = new Date();
  const assignments = [];
  for (let i = 1; i <= 25; i++) {
    const assignedDate = new Date(
      now.getTime() - (26 - i) * 86400000,
    ).toISOString();
    const dueDate = new Date(now.getTime() + i * 86400000).toISOString();
    const status = i <= 15 ? "published" : i <= 20 ? "closed" : "draft";

    assignments.push({
      class_section_id: classId,
      title: `Bài tập ${i.toString().padStart(2, "0")}: Thực hành Lab ${i}`,
      description: `Nội dung và yêu cầu thực hành cho bài tập số ${i}`,
      assigned_date: assignedDate,
      due_date: dueDate,
      status,
      max_score: 10.0,
    });
  }

  const { data: inserted, error: aErr } = await supabase
    .from("assignments")
    .insert(assignments)
    .select("id, title, status");

  if (aErr) {
    console.error("Error inserting assignments:", aErr);
    process.exit(1);
  }

  console.log(`Successfully inserted ${inserted.length} assignments!`);
  console.log("Sample assignments:", inserted.slice(0, 5));
  console.log(`Done! Class Section ID: ${classId}, Code: ${code}`);
}

main().catch(console.error);
