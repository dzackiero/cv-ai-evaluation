import { z } from 'zod';

const experienceSchema = z.object({
  role: z.string().describe('The job title or role held by the candidate'),
  employmentType: z
    .enum(['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'])
    .describe('The type of employment'),
  company: z.string().describe('The name of the company or organization'),
  industry: z.string().describe('The industry sector of the company'),
  location: z.string().describe('The location of the job (city, country)'),
  description: z
    .string()
    .describe('A brief description of the role and responsibilities'),
  startDate: z.string().describe('The start date of the employment (YYYY-MM)'),
  endDate: z
    .string()
    .describe(
      'The end date of the employment (YYYY-MM), or "Present" if currently employed',
    ),
});

const educationSchema = z.object({
  degree: z.string().describe('The degree or qualification obtained'),
  fieldOfStudy: z.string().describe('The field of study or major'),
  institution: z.string().describe('The name of the educational institution'),
  location: z
    .string()
    .describe('The location of the institution (city, country)'),
  startDate: z.string().describe('The start date of the education (YYYY-MM)'),
  endDate: z.string().describe('The end date of the education (YYYY-MM)'),
});

const profileSchema = z.object({
  name: z.string().describe('The full name of the candidate'),
  email: z.string().describe('The email address of the candidate'),
  phone: z.string().describe('The phone number of the candidate'),
  linkedin: z.string().describe('The LinkedIn profile URL of the candidate'),
  summary: z
    .string()
    .describe('A brief summary or objective statement of the candidate'),
});

export const curriculumVitaeSchema = z.object({
  profile: profileSchema.describe('The personal profile of the candidate'),
  experiences: z
    .array(experienceSchema)
    .describe('A list of professional experiences'),
  education: z
    .array(educationSchema)
    .describe('A list of educational qualifications'),
  skills: z
    .array(z.string())
    .describe('A list of relevant skills and competencies'),
  languages: z
    .array(z.string())
    .describe('A list of languages spoken by the candidate'),
});
