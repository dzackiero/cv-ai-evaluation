import { z } from 'zod';

export const OverallEvaluationSchema = z.object({
  cv_match_rate: z
    .number()
    .describe('The score of the CV matching from cv evaluation'),
  cv_feedback: z.string().describe('The feedback from cv evaluation'),
  cv_calculation_detail: z
    .string()
    .describe('The calculation details from cv evaluation'),
  project_score: z
    .number()
    .describe('The score of the project from project evaluation'),
  project_feedback: z.string().describe('The feedback from project evaluation'),
  project_calculation_detail: z
    .string()
    .describe('The calculation details from project evaluation'),
  overall_summary: z
    .string()
    .describe('The overall summary of the candidate based on evaluations'),
});
