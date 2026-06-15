import { AppData } from '../../types';

export interface AgentContext {
  title: string;
  subject: string;
  grade: string;
  week: string;
  requirement: string;
  templateFormat: string;
  templateContext: string;
  additionalRequirements: string;
  mathRestrictions: string;
  referenceContext: string;
  settings: AppData['settings'];
  onStreamChunk?: (chunk: string) => void;
  onStatusChange?: (status: string) => void;
}

export interface PlanningResult {
  outline: string;
  objectives: string;
}

export interface ContentResult {
  rawContent: string;
}

export interface FormatResult {
  finalMarkdown: string;
}

export interface Agent {
  name: string;
  execute: (context: AgentContext, previousResult?: any) => Promise<any>;
}
