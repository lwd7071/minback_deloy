"use client";

import type { ReactNode } from "react";
import { Modal } from "./modal";

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      {children}
    </Modal>
  );
}
