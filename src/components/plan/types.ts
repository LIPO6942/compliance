
export interface DialogState {
  type: "category" | "subCategory" | "task" | null;
  mode: "add" | "edit" | null;
  data?: any;
  parentId?: string;
  grandParentId?: string;
}

export type ViewMode = 'list' | 'diagram' | 'mindmap';

export type MindMapNodeType = 'process' | 'risk' | 'control' | 'task' | 'document';

export interface MindMapNodeData {
  label: string;
  nodeType: MindMapNodeType;
  entityId: string;
  riskLevel?: string;
  domain?: string;
  isCollapsed?: boolean;
  childCount?: number;
  description?: string;
  owner?: string;
  status?: string;
}
