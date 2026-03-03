/**
 * Parse Mermaid diagram code to extract nodes and create tasks
 */

export interface MermaidNode {
  id: string;
  label: string;
  nodeType: 'rectangle' | 'rounded' | 'diamond' | 'circle' | 'parallelogram' | 'unknown';
}

/**
 * Parse Mermaid flowchart code and extract nodes
 * Supports: graph TD, graph LR, flowchart TD, flowchart LR, etc.
 */
export function parseMermaidNodes(mermaidCode: string): MermaidNode[] {
  const nodes: MermaidNode[] = [];
  const nodeMap = new Map<string, MermaidNode>();

  // Regex patterns for different node types in Mermaid
  const patterns = [
    // Rectangle: A["Text"]
    { regex: /(\w+)\s*\[\s*"([^"]+)"\s*\]/g, type: 'rectangle' as const },
    // Rounded: A(["Text"])
    { regex: /(\w+)\s*\(\s*\[\s*"([^"]+)"\s*\]\s*\)/g, type: 'rounded' as const },
    // Diamond: A{"Text"}
    { regex: /(\w+)\s*\{\s*"([^"]+)"\s*\}/g, type: 'diamond' as const },
    // Circle: A(("Text"))
    { regex: /(\w+)\s*\(\s*\(\s*"([^"]+)"\s*\)\s*\)/g, type: 'circle' as const },
    // Parallelogram: A[/"Text"/]
    { regex: /(\w+)\s*\[\s*\/\s*"([^"]+)"\s*\/\s*\]/g, type: 'parallelogram' as const },
  ];

  // Custom HTML labels - higher priority
  const htmlLabelRegex = /(\w+)\s*\[\s*"<div[^>]*>([^<]+)<\/div>([^"]*)"?\s*\]/g;
  let match;
  while ((match = htmlLabelRegex.exec(mermaidCode)) !== null) {
    const [, id, label] = match;
    nodeMap.set(id, {
      id: id.trim(),
      label: label.trim(),
      nodeType: 'rectangle',
    });
  }

  // Parse all pattern types
  for (const pattern of patterns) {
    const regex = pattern.regex;
    while ((match = regex.exec(mermaidCode)) !== null) {
      const [, id, label] = match;
      const cleanId = id.trim();
      const cleanLabel = label
        .trim()
        .replace(/^"+|"+$/g, '')
        .replace(/<br>/gi, ' ')
        .trim();

      // Don't overwrite if already found (HTML labels have priority)
      if (!nodeMap.has(cleanId)) {
        nodeMap.set(cleanId, {
          id: cleanId,
          label: cleanLabel,
          nodeType: pattern.type,
        });
      }
    }
  }

  // Convert map to array
  return Array.from(nodeMap.values());
}

/**
 * Generate task objects from Mermaid nodes
 */
export interface GeneratedTask {
  name: string;
  description: string;
  deadline?: string;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'one_time' | 'custom';
}

export function generateTasksFromNodes(
  nodes: MermaidNode[],
  workflowName: string,
  deadline?: Date
): GeneratedTask[] {
  return nodes.map((node) => ({
    name: node.label,
    description: `Tâche du workflow "${workflowName}": ${node.label} (Nœud: ${node.id})`,
    deadline: deadline ? deadline.toISOString() : undefined,
    frequency: 'quarterly' as const,
  }));
}

/**
 * Priority-based task assignment based on node type
 */
export function assignTaskPriority(nodeType: MermaidNode['nodeType']): 'high' | 'medium' | 'low' {
  switch (nodeType) {
    case 'diamond':
      return 'high'; // Decision points = critical
    case 'circle':
      return 'high'; // Terminal nodes = important
    case 'rectangle':
      return 'medium';
    case 'rounded':
      return 'medium';
    case 'parallelogram':
      return 'low'; // Input/output steps
    default:
      return 'medium';
  }
}
