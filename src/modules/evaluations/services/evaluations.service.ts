import { Injectable, Logger } from '@nestjs/common';
import { InternalDocumentsService } from './internal-documents.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

// Define the evaluation schema
const evaluationItemSchema = z.object({
  criteria: z.string().describe('The criteria being evaluated'),
  score: z.number().min(1).max(10).describe('Score from 1 to 10'),
  justification: z.string().describe('Brief justification for the score'),
  weight: z.number().min(0).max(1).describe('Weight of the criteria'),
  weighted_score: z
    .number()
    .min(1)
    .max(10)
    .describe('Weighted score based on weight and score'),
});

const evaluationSchema = z.object({
  evaluations: z
    .array(evaluationItemSchema)
    .describe('Array of evaluation results'),
});

@Injectable()
export class EvaluationsService {
  private readonly logger = new Logger(EvaluationsService.name);

  constructor(
    private readonly internalDocumentsService: InternalDocumentsService,
    private readonly configService: ConfigService,
  ) {}

  async evaluateCandidate(
    cvDocument: Express.Multer.File,
    projectDocument: Express.Multer.File,
  ) {
    const tempDir = os.tmpdir();
    const cvTempFilePath = path.join(
      tempDir,
      `cv-${Date.now()}-${cvDocument.originalname}`,
    );
    const projectTempFilePath = path.join(
      tempDir,
      `project-${Date.now()}-${projectDocument.originalname}`,
    );

    try {
      this.logger.log(`Processing CV: ${cvDocument.originalname}`);
      fs.writeFileSync(cvTempFilePath, cvDocument.buffer);

      this.logger.log(`Processing project: ${projectDocument.originalname}`);
      fs.writeFileSync(projectTempFilePath, projectDocument.buffer);

      const cvLoader = new PDFLoader(cvTempFilePath);
      const cv = await cvLoader.load();

      const projectLoader = new PDFLoader(projectTempFilePath);
      const project = await projectLoader.load();

      // Initialize the model with structured output
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');
      const model = new ChatOpenAI({
        model: 'gpt-4o-mini',
        temperature: 0,
        openAIApiKey: apiKey,
      });

      const structuredModel = model.withStructuredOutput(evaluationSchema, {
        name: 'evaluation_results',
      });

      const template = ChatPromptTemplate.fromTemplate(
        `You're an expert HR Evaluator. Given the context and scoring rubric below, evaluate the document against each criteria in the rubric.

        Scoring Rubric:
        {rubric}

        Document Scoring Based on:
        {context}

        Document to evaluate:
        {document}

        Provide a thorough evaluation for each criteria mentioned in the rubric.`,
      );

      const chain = template.pipe(structuredModel);

      const cvRubric =
        await this.internalDocumentsService.queryInternalDocuments(
          'Scoring Rubric for CV',
          'scoring_rubric',
        );
      const projectRubric =
        await this.internalDocumentsService.queryInternalDocuments(
          'Scoring Rubric for Project',
          'scoring_rubric',
        );
      const overallRubric =
        await this.internalDocumentsService.queryInternalDocuments(
          'Overall Scoring Rubric for Candidate Evaluation',
          'scoring_rubric',
        );

      const projectBrief =
        await this.internalDocumentsService.queryInternalDocuments(
          'Case Study Brief',
          'case_study_brief',
        );

      const jobDescription =
        await this.internalDocumentsService.queryInternalDocuments(
          'Job Description',
          'job_description',
        );

      const cvResult = await chain.invoke({
        rubric: cvRubric,
        context: jobDescription,
        document: cv.map((doc) => doc.pageContent).join('\n'),
      });

      const projectResult = await chain.invoke({
        context: projectBrief,
        rubric: projectRubric,
        document: project.map((doc) => doc.pageContent).join('\n'),
      });

      const overallResult = await chain.invoke({
        context: `${jobDescription as string}\n\n${projectBrief as string}`,
        rubric: overallRubric,
        document: `${cv.map((doc) => doc.pageContent).join('\n')}\n\n${project.map((doc) => doc.pageContent).join('\n')}`,
      });

      return {
        cvEvaluation: cvResult,
        projectEvaluation: projectResult,
        overallEvaluation: overallResult,
      };
    } finally {
      try {
        if (fs.existsSync(cvTempFilePath)) {
          fs.unlinkSync(cvTempFilePath);
          this.logger.log(`Cleaned up CV temp file: ${cvTempFilePath}`);
        }
      } catch (error) {
        this.logger.error('Error cleaning up CV temporary file:', error);
      }
      try {
        if (fs.existsSync(projectTempFilePath)) {
          fs.unlinkSync(projectTempFilePath);
          this.logger.log(
            `Cleaned up project temp file: ${projectTempFilePath}`,
          );
        }
      } catch (error) {
        this.logger.error('Error cleaning up project temporary file:', error);
      }
    }
  }
}
