"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (newPage: number) => void;
  getPageHref?: (page: number) => string;
  onPageSizeChange?: (newPageSize: number) => void;
  pageSizeOptions?: number[];
  disabled?: boolean;
  showSummary?: boolean;
  itemLabel?: string;
};

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  getPageHref,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100],
  disabled = false,
  showSummary = true,
  itemLabel = "sinh viên",
}: PaginationProps) {
  const router = useRouter();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const prefetchedHrefs = useRef(new Set<string>());

  const startItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  const prefetchPage = useCallback(
    (p: number) => {
      if (
        getPageHref &&
        p >= 1 &&
        p <= totalPages &&
        p !== currentPage &&
        router &&
        typeof router.prefetch === "function"
      ) {
        const href = getPageHref(p);
        if (prefetchedHrefs.current.has(href)) return;
        prefetchedHrefs.current.add(href);
        try {
          router.prefetch(href);
        } catch {
          prefetchedHrefs.current.delete(href);
        }
      }
    },
    [currentPage, getPageHref, router, totalPages],
  );

  const prefetchOnPointerDown = useCallback(
    (event: React.PointerEvent, targetPage: number) => {
      if (event.pointerType === "touch" || event.pointerType === "pen") {
        prefetchPage(targetPage);
      }
    },
    [prefetchPage],
  );

  // Generate visible page numbers
  function getPageNumbers(): (number | "...")[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  }

  const pageNumbers = getPageNumbers();

  return (
    <nav
      aria-label="Phân trang danh sách"
      className={`pagination-wrap ${!showSummary && !onPageSizeChange ? "pagination-wrap-controls-only" : ""}`}
    >
      {(showSummary || onPageSizeChange) && (
        <div className="pagination-info">
          {showSummary && (
            <span>
              Hiển thị <strong>{startItem}</strong>–<strong>{endItem}</strong>{" "}
              trên tổng số <strong>{total}</strong> {itemLabel}
            </span>
          )}

          {onPageSizeChange && (
            <label className="pagination-size-label">
              <span>Hiển thị:</span>
              <select
                className="pagination-size-select"
                value={pageSize}
                disabled={disabled}
                onChange={(e) => {
                  const newSize = parseInt(e.target.value, 10);
                  if (!Number.isNaN(newSize)) {
                    onPageSizeChange(newSize);
                  }
                }}
                aria-label="Chọn số lượng mục trên mỗi trang"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size} / trang
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            type="button"
            className="pagination-btn pagination-nav-btn"
            disabled={disabled || currentPage <= 1}
            onClick={() => onPageChange(1)}
            onMouseEnter={() => prefetchPage(1)}
            onFocus={() => prefetchPage(1)}
            onPointerDown={(event) => prefetchOnPointerDown(event, 1)}
            aria-label="Đến trang đầu tiên"
            title="Trang đầu"
          >
            <ChevronsLeft size={16} aria-hidden="true" />
          </button>

          <button
            type="button"
            className="pagination-btn pagination-nav-btn"
            disabled={disabled || currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            onMouseEnter={() => prefetchPage(currentPage - 1)}
            onFocus={() => prefetchPage(currentPage - 1)}
            onPointerDown={(event) =>
              prefetchOnPointerDown(event, currentPage - 1)
            }
            aria-label="Đến trang trước"
            title="Trang trước"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>

          <div className="pagination-pages" role="group" aria-label="Các trang">
            {pageNumbers.map((p, index) => {
              if (p === "...") {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="pagination-ellipsis"
                    aria-hidden="true"
                  >
                    …
                  </span>
                );
              }
              const isCurrent = p === currentPage;
              return (
                <button
                  key={p}
                  type="button"
                  className={`pagination-btn pagination-number-btn ${isCurrent ? "is-active" : ""}`}
                  disabled={disabled}
                  aria-current={isCurrent ? "page" : undefined}
                  aria-label={`Trang ${p}`}
                  onClick={() => onPageChange(p)}
                  onMouseEnter={() => prefetchPage(p)}
                  onFocus={() => prefetchPage(p)}
                  onPointerDown={(event) => prefetchOnPointerDown(event, p)}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="pagination-btn pagination-nav-btn"
            disabled={disabled || currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            onMouseEnter={() => prefetchPage(currentPage + 1)}
            onFocus={() => prefetchPage(currentPage + 1)}
            onPointerDown={(event) =>
              prefetchOnPointerDown(event, currentPage + 1)
            }
            aria-label="Đến trang sau"
            title="Trang sau"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>

          <button
            type="button"
            className="pagination-btn pagination-nav-btn"
            disabled={disabled || currentPage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            onMouseEnter={() => prefetchPage(totalPages)}
            onFocus={() => prefetchPage(totalPages)}
            onPointerDown={(event) => prefetchOnPointerDown(event, totalPages)}
            aria-label="Đến trang cuối cùng"
            title="Trang cuối"
          >
            <ChevronsRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </nav>
  );
}
