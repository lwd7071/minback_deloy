import type { ReactNode } from "react";

export type DataColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
};
export function DataTable<T>({
  columns,
  data,
  getKey,
}: {
  columns: DataColumn<T>[];
  data: T[];
  getKey: (row: T) => string;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                className={
                  column.key === columns[0]?.key
                    ? "table-sticky-col"
                    : undefined
                }
                key={column.key}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={getKey(row)}>
              {columns.map((column) => (
                <td
                  className={
                    column.key === columns[0]?.key
                      ? "table-sticky-col"
                      : undefined
                  }
                  key={column.key}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
