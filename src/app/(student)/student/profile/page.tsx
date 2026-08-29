import { StudentProfileView } from "@/components/student/student-profile-view";

export const metadata = {
  title: "Hồ sơ Học tập — MinBack",
  description:
    "Xem hồ sơ học tập cá nhân, bài tập, điểm số, nhận xét và tiến độ học tập.",
};

export default function StudentProfilePage() {
  return (
    <section className="surface">
      <p className="eyebrow">Hồ sơ cá nhân</p>
      <h1>Hồ sơ Học tập</h1>
      <StudentProfileView />
    </section>
  );
}
