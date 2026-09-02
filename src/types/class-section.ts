import type { ImportResultDto } from "@/types/import";

export type ClassSectionDto = {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type ClassSectionSetupDto = {
  classSection: ClassSectionDto;
  import: ImportResultDto | null;
};
