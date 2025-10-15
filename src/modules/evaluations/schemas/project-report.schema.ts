import { z } from 'zod';

const candidateSchema = z.object({
  name: z.string().describe('The full name of the candidate'),
  email: z.string().describe('The email address of the candidate'),
});

const approachSchema = z.object({
  title: z.string().describe('The title of the project approach'),
  description: z
    .string()
    .describe('A brief description of the project approach'),
});

const resultSchema = z.object({
  title: z.string().describe('The title of the project result'),
  description: z.string().describe('A brief description of the project result'),
});

export const projectReportSchema = z.object({
  projectTitle: z.string().describe('The title of the project'),
  candidate: candidateSchema.describe('Information about the candidate'),
  github_repository: z.string().describe('Link to the GitHub repository'),
  approaches: z
    .array(approachSchema)
    .describe('Information about the project approaches and designs'),
  results: z
    .array(resultSchema)
    .describe('Information about the project results and reflections'),
  real_responses: z
    .array(z.string())
    .describe('The actual responses provided by the candidate'),
  bonus_works: z
    .string()
    .describe('description about any additional bonus works'),
});
