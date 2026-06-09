/**
 * Mock Allowlist for External Tools (MVP Phase 1).
 * 
 * AI phải chọn toolId STRICTLY từ danh sách này.
 * Tuyệt đối không được tự bịa toolId.
 * Khi backend RAG (Firestore) sẵn sàng, danh sách này sẽ được thay bằng top-K query.
 */

import type { ExternalTool } from '../types';

export const EXTERNAL_TOOL_ALLOWLIST: ExternalTool[] = [
  {
    toolId: 'geogebra_1',
    title: 'GeoGebra Classic',
    description: 'Công cụ hình học động đa năng: vẽ hình, tọa độ, hàm số, thống kê.',
    url: 'https://www.geogebra.org/classic',
    sourceDomain: 'geogebra.org',
    tags: ['hình học', 'đồ thị', 'đại số', 'tọa độ'],
    subject: 'math',
    gradeRange: '10-12',
    heightPreset: 'large',
    sandboxPreset: 'geogebra',
    status: 'active',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    toolId: 'geogebra_geometry',
    title: 'GeoGebra Geometry',
    description: 'Công cụ chuyên vẽ và khám phá hình học phẳng.',
    url: 'https://www.geogebra.org/geometry',
    sourceDomain: 'geogebra.org',
    tags: ['hình học phẳng', 'tam giác', 'tứ giác', 'đường tròn'],
    subject: 'math',
    gradeRange: '10-12',
    heightPreset: 'large',
    sandboxPreset: 'geogebra',
    status: 'active',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    toolId: 'geogebra_graphing',
    title: 'GeoGebra Graphing Calculator',
    description: 'Máy tính đồ thị hàm số, vẽ đường cong, phân tích hàm số.',
    url: 'https://www.geogebra.org/graphing',
    sourceDomain: 'geogebra.org',
    tags: ['hàm số', 'đồ thị', 'đạo hàm', 'tích phân'],
    subject: 'math',
    gradeRange: '10-12',
    heightPreset: 'large',
    sandboxPreset: 'geogebra',
    status: 'active',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    toolId: 'geogebra_3d',
    title: 'GeoGebra 3D Calculator',
    description: 'Công cụ hình học không gian 3D: vẽ mặt phẳng, khối hình học.',
    url: 'https://www.geogebra.org/3d',
    sourceDomain: 'geogebra.org',
    tags: ['hình học không gian', '3D', 'mặt phẳng', 'khối cầu'],
    subject: 'math',
    gradeRange: '11-12',
    heightPreset: 'large',
    sandboxPreset: 'geogebra',
    status: 'active',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    toolId: 'desmos_1',
    title: 'Desmos Graphing Calculator',
    description: 'Máy tính đồ thị trực quan, dễ dùng cho hàm số và phương trình.',
    url: 'https://www.desmos.com/calculator',
    sourceDomain: 'desmos.com',
    tags: ['hàm số', 'đồ thị', 'phương trình', 'xác suất'],
    subject: 'math',
    gradeRange: '10-12',
    heightPreset: 'standard',
    sandboxPreset: 'strict',
    status: 'active',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    toolId: 'desmos_geometry',
    title: 'Desmos Geometry',
    description: 'Công cụ hình học động từ Desmos.',
    url: 'https://www.desmos.com/geometry',
    sourceDomain: 'desmos.com',
    tags: ['hình học phẳng', 'tam giác', 'tứ giác'],
    subject: 'math',
    gradeRange: '10-12',
    heightPreset: 'standard',
    sandboxPreset: 'strict',
    status: 'active',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    toolId: 'congcutoanhoc_3',
    title: 'Công Cụ Toán Học - Bảng biến thiên',
    description: 'Vẽ bảng biến thiên hàm số tự động từ congcutoanhoc.com.',
    url: 'https://congcutoanhoc.com',
    sourceDomain: 'congcutoanhoc.com',
    tags: ['bảng biến thiên', 'đạo hàm', 'cực trị', 'hàm số'],
    subject: 'math',
    gradeRange: '10-12',
    heightPreset: 'compact',
    sandboxPreset: 'strict',
    status: 'active',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
];

/** Lookup tool by ID from the mock allowlist */
export const getToolById = (toolId: string): ExternalTool | undefined =>
  EXTERNAL_TOOL_ALLOWLIST.find(t => t.toolId === toolId);

/** Lookup multiple tools by IDs */
export const getToolsByIds = (toolIds: string[]): ExternalTool[] =>
  toolIds.map(id => getToolById(id)).filter((t): t is ExternalTool => Boolean(t));

/** Generate the prompt snippet that AI should receive for tool selection */
export const generateToolAllowlistPromptSnippet = (): string => {
  const toolList = EXTERNAL_TOOL_ALLOWLIST
    .filter(t => t.status === 'active')
    .map(t => `- "${t.toolId}": ${t.title} — ${t.description} [Tags: ${t.tags.join(', ')}]`)
    .join('\n');

  return `
DANH SÁCH TOOL ID ĐƯỢC PHÉP (Mock Allowlist — AI PHẢI chọn từ đây, KHÔNG được tự bịa):
${toolList}

Cách dùng: Trong simulationSpec, nếu bài cần công cụ tương tác ngoài, hãy điền externalToolIds: ["toolId_1", "toolId_2"] với ID lấy từ danh sách trên.
`.trim();
};
