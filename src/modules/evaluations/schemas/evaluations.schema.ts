import { z } from 'zod';

const criteriaSchema = z.object({
  criteria: z.string().describe('the name of the criteria'),
  reason: z.string().describe('the reason for the given score'),
  weight: z
    .number()
    .min(0)
    .max(1)
    .describe('the weight of the criteria between 0 and 1'),
  score: z
    .number()
    .describe('the score of the criteria according to the rubric'),
  weighted_score: z
    .number()
    .describe('the weighted score of the criteria (weight * score)'),
});

export const EvaluationSchema = z.object({
  criterias: z.array(criteriaSchema).describe('list of evaluation criterias'),
});
