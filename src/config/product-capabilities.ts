export const PRODUCT_CAPABILITIES = {
  releaseProfile: "feedback-first",
  teacher: {
    assignmentDeadline: false,
    assignmentAttachments: false,
    assignmentDelete: false,
    assignmentTechnicalStatus: false,
    gradebook: false,
    evaluationImport: true,
  },
  student: {
    assignmentCatalog: false,
    submissions: false,
    assignmentDeadline: false,
    assignmentAttachments: false,
    results: true,
    resultNotifications: true,
  },
} as const;

export type ProductCapabilities = typeof PRODUCT_CAPABILITIES;
