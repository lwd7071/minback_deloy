export type ApiMeta = {
  page: number;
  pageSize: number;
  total: number;
  [key: string]: unknown;
};

export type ApiSuccess<T> = {
  data: T;
  meta?: ApiMeta;
};

export type ApiErrorDetail = {
  field?: string;
  message: string;
};

export type ApiFailure = {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
};
