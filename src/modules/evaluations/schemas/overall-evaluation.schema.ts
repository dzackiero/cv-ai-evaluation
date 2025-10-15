import { z } from 'zod';

const OverallCriteriaSchema = z.object({
  criteria: z.string().describe('The name of the overall evaluation criteria'),
  score: z
    .number()
    .nullable()
    .describe(
      'The score for the overall criteria if the criteria is score type, null otherwise',
    ),
  description: z
    .string()
    .nullable()
    .describe(
      'The description of the overall criteria if the criteria is description type, null otherwise',
    ),
  calculation: z.string().describe('How the overall score is calculated'),
});

export const OverallEvaluationSchema = z.object({
  overallCriterias: z
    .array(OverallCriteriaSchema)
    .describe('List of overall evaluation criterias'),
});
