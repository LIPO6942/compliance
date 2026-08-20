"use client";

import React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemos } from "@/contexts/MemoContext";
import { MemoEditorModal } from "@/components/memos/MemoEditorModal";
import { APP_SECTIONS } from "@/types/memo";

export const MemoEditorModalWrapper: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const currentFullHref = tab ? `${pathname}?tab=${tab}` : pathname;

  const currentSection = APP_SECTIONS.find(
    (s) => s.href === currentFullHref || s.href === pathname
  );
  const currentSectionLabel = currentSection ? currentSection.label : "Cette page";

  const {
    isEditorOpen,
    setIsEditorOpen,
    activeEditorMemo,
    setActiveEditorMemo,
  } = useMemos();

  return (
    <MemoEditorModal
      isOpen={isEditorOpen}
      onClose={() => {
        setIsEditorOpen(false);
        setActiveEditorMemo(null);
      }}
      memoToEdit={activeEditorMemo}
      defaultSectionHref={activeEditorMemo?.associatedSectionHref || currentFullHref}
      defaultSectionLabel={activeEditorMemo?.associatedSectionLabel || currentSectionLabel}
    />
  );
};
