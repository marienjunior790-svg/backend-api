export interface AiChatInput {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export type AiAnalyzeDto = {
  analysisType: 'overview' | 'revenue' | 'occupancy' | 'delinquency';
};
