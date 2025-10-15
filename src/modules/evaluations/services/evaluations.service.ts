import { Injectable, Logger } from '@nestjs/common';
import { InternalDocumentsService } from './internal-documents.service';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { ChatOpenAI } from '@langchain/openai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import z, { ZodSchema } from 'zod';
import { curriculumVitaeSchema } from '../schemas/curriculum-vitae.schema';
import { EvaluationSchema } from '../schemas/evaluations.schema';

@Injectable()
export class EvaluationsService {
  private readonly logger = new Logger(EvaluationsService.name);

  constructor(
    private readonly internalDocumentsService: InternalDocumentsService,
  ) {}

  async extractDocumentToStructure<T extends ZodSchema>(
    document: Express.Multer.File,
    schema: T,
  ): Promise<z.infer<T>> {
    const tempDir = os.tmpdir();
    const cvTempFilePath = path.join(
      tempDir,
      `cv-${Date.now()}-${document.originalname}`,
    );

    try {
      this.logger.log(`Processing CV: ${document.originalname}`);
      fs.writeFileSync(cvTempFilePath, document.buffer);

      const cvLoader = new PDFLoader(cvTempFilePath);
      const cv = (await cvLoader.load())
        .map((doc) => doc.pageContent)
        .join('\n\n');

      const model = new ChatOpenAI({ model: 'gpt-4o-mini' });
      const structuredModel = model.withStructuredOutput(schema);
      const cvAnalysis = (await structuredModel.invoke(
        `Extract and structure the following CV content into JSON format according to the schema: ${cv}`,
      )) as T;
      return cvAnalysis;
    } finally {
      try {
        if (fs.existsSync(cvTempFilePath)) {
          fs.unlinkSync(cvTempFilePath);
          this.logger.log(`Cleaned up CV temp file: ${cvTempFilePath}`);
        }
      } catch (error) {
        this.logger.error('Error cleaning up CV temporary file:', error);
      }
    }
  }

  async evaluateCv(document: Express.Multer.File) {
    this.logger.log(`Evaluating CV: ${document.originalname}`);
    const cvData = await this.extractDocumentToStructure(
      document,
      curriculumVitaeSchema,
    );

    this.logger.log(
      `Retrieving scoring rubric and job description for evaluation.`,
    );
    const scoringRubric =
      await this.internalDocumentsService.queryInternalDocuments(
        'Scoring Rubric for Evaluating CV',
        'scoring_rubric',
      );

    this.logger.log(`Retrieving job description for evaluation.`);
    const jobDescription =
      await this.internalDocumentsService.queryInternalDocuments(
        'Job Description for Product Engineer (Backend)',
        'project_brief',
      );

    this.logger.log(`evaluating CV against rubric and job description`);
    const model = new ChatOpenAI({ model: 'gpt-4o', temperature: 0 });
    const structuredModel = model.withStructuredOutput(EvaluationSchema);
    const evaluation = await structuredModel.invoke(`
      Based on the following CV data, scoring rubric, and job description, provide a detailed evaluation of the candidate's suitability for the role.
      CV Data: ${JSON.stringify(cvData, null, 2)}

      Scoring Rubric: ${scoringRubric as string}
      Job Description: ${jobDescription as string}

      Provide the evaluation as per the schema.
    `);

    return { cvData, evaluation };
  }
}
