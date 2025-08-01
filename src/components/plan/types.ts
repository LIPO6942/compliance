
export interface DialogState {
  type: "category" | "subCategory" | "task" | null;
  mode: "add" | "edit" | null;
  data?: any;
  parentId?: string;
  grandParentId?: string;
}
