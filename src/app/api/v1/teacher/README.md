# Teacher API boundary

Dev A sở hữu Teacher auth, class section, assignment, current evaluation và Student Profile API. Dev B sở hữu Student management, EvaluationHistory và notification settings theo execution plan.

Mỗi endpoint được tạo bằng `route.ts` trong đúng resource folder và phải dùng response helper tại `src/lib/api`.
