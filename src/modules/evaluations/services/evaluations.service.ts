import { Injectable, Logger } from '@nestjs/common';
import { InternalDocumentsService } from './internal-documents.service';
import { DocumentStorageService } from './document-storage.service';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { ChatOpenAI } from '@langchain/openai';
import { curriculumVitaeSchema } from '../schemas/curriculum-vitae.schema';
import { EvaluationSchema } from '../schemas/evaluations.schema';
import { projectReportSchema } from '../schemas/project-report.schema';
import { OverallEvaluationSchema } from '../schemas/overall-evaluation.schema';
import { ZodSchema } from 'zod';
import { SupabaseService } from '../../../common/services/supabase.service';
import { EvaluationStatus } from '../types/status.enum';
import { EvaluationType } from '../types/evaluation-type.enum';

@Injectable()
export class EvaluationsService {
  private readonly logger = new Logger(EvaluationsService.name);

  constructor(
    private readonly internalDocumentsService: InternalDocumentsService,
    private readonly documentStorageService: DocumentStorageService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async extractDocumentToStructure<T extends ZodSchema>(
    documentId: string,
    schema: T,
  ): Promise<T> {
    let tempFilePath: string | null = null;
    try {
      const storagePath =
        await this.documentStorageService.getDocumentStoragePath(documentId);
      tempFilePath =
        await this.documentStorageService.downloadToTempFile(storagePath);

      const documentLoader = new PDFLoader(tempFilePath);
      const doc = (await documentLoader.load())
        .map((doc) => doc.pageContent)
        .join('\n\n');

      const model = new ChatOpenAI({ model: 'gpt-4o-mini' });
      const structuredModel = model.withStructuredOutput(schema);
      const docAnalysis = (await structuredModel.invoke(`
          You are a precise information extraction system.

          Extract and structure the following document content according to the provided schema **exactly**.
          - Do not infer or fabricate any information not present in the text.
          - If information is missing, mark it clearly as null or "Not provided".
          - Maintain field naming and hierarchy exactly as defined by the schema.
          - Ensure that any date, experience, or skill extracted is represented truthfully and in plain text.

          Document Content:
          ${doc}
        `)) as T;
      return docAnalysis;
    } finally {
      if (tempFilePath) {
        this.documentStorageService.deleteTempFile(tempFilePath);
      }
    }
  }

  async evaluateCv(documentId: string, jobTitle: string, jobId?: string) {
    const [cvData, scoringRubric, jobDescription] = await Promise.all([
      this.extractDocumentToStructure(documentId, curriculumVitaeSchema),
      this.internalDocumentsService.queryInternalDocuments(
        `Scoring Rubric for Evaluating CV for ${jobTitle}`,
        'scoring_rubric',
      ),
      this.internalDocumentsService.queryInternalDocuments(
        `Job Description for ${jobTitle}`,
        'project_brief',
      ),
    ]);

    this.logger.log(
      `[CV Evaluation] CV data extracted, scoring against rubric and job description`,
    );
    const model = new ChatOpenAI({ model: 'gpt-4o', temperature: 0 });
    const structuredModel = model.withStructuredOutput(EvaluationSchema);
    const evaluation = await structuredModel.invoke(`
      You are an expert **technical recruiter and hiring evaluator**.
      Your goal is to **critically assess** the candidate's suitability for the given job role using the provided scoring rubric and job description.

      **Instructions:**
      - Be **objective, evidence-based, and unsparing**.
      - Only reward experience or skills that directly align with the job requirements.
      - Penalize unrelated work experience or vague claims of skill.
      - If the CV lacks specific proof (e.g., measurable impact, concrete projects, or tools used), deduct points.
      - Identify red flags such as career gaps, role mismatches, or lack of domain relevance.
      - Justify every score with a **short, factual explanation** grounded in the CV.
      - Avoid positive bias or generic praise.

      **inputs:**

      CV Data:
      ${JSON.stringify(cvData, null, 2)}

      Scoring Rubric:
      ${scoringRubric as string}

      Job Description:
      ${jobDescription as string}

      **Output:**
      Provide a complete structured evaluation strictly following the schema, reflecting a fair but **critical assessment** of the candidate's real fit.
    `);

    if (jobId) {
      this.logger.log(`[CV Evaluation] Completed evaluation for job: ${jobId}`);
      await this.createEvaluationRecord(
        jobId,
        EvaluationType.CV,
        evaluation,
        documentId,
      );
    }
    return { ...evaluation };
  }

  async evaluateProject(documentId: string, jobTitle: string, jobId?: string) {
    const [projectData, scoringRubric, studyBrief] = await Promise.all([
      this.extractDocumentToStructure(documentId, projectReportSchema),
      this.internalDocumentsService.queryInternalDocuments(
        `Scoring Rubric for Evaluating Project Deliverables for ${jobTitle}`,
        'scoring_rubric',
      ),
      this.internalDocumentsService.queryInternalDocuments(
        `Case Study Brief for ${jobTitle}`,
        'case_study_brief',
      ),
    ]);

    this.logger.log(
      `[Project Evaluation] Project data extracted, scoring against rubric and study brief`,
    );
    const model = new ChatOpenAI({ model: 'gpt-4o', temperature: 0 });
    const structuredModel = model.withStructuredOutput(EvaluationSchema);
    const evaluation = await structuredModel.invoke(`
      You are a senior evaluator assessing a candidate's **technical project submission** for a recruitment case study.

      **Instructions:**
      - Evaluate the project strictly using the provided **scoring rubric** and **study brief**.
      - Be **critical and evidence-based**: do not assume quality if not explicitly demonstrated.
      - Deduct points for:
        - Missing deliverables
        - Unclear structure or lack of implementation detail
        - Weak technical justification
        - Poor communication or documentation quality
      - Reward only **verifiable competence**, clarity, and depth.
      - Provide specific and critical reasoning for each score or comment.

      **Inputs:**
      Project Data: ${JSON.stringify(projectData, null, 2)}

      Scoring Rubric:
      ${scoringRubric as string}

      Study Brief:
      ${studyBrief as string}

      Provide the evaluation as per the schema.
    `);

    if (jobId) {
      this.logger.log(
        `[Project Evaluation] Completed evaluation for job: ${jobId}`,
      );
      await this.createEvaluationRecord(
        jobId,
        EvaluationType.PROJECT,
        evaluation,
        documentId,
      );
    }
    return { projectData, evaluation };
  }

  async overallEvaluation(
    cvDocumentId: string,
    projectDocumentId: string,
    jobTitle: string,
    jobId: string,
  ) {
    this.logger.log(
      `[Evaluation] Starting combined evaluation for job: ${jobId}`,
    );
    const [cvEvaluation, projectEvaluation] = await Promise.all([
      this.evaluateCv(cvDocumentId, jobTitle, jobId),
      this.evaluateProject(projectDocumentId, jobTitle, jobId),
    ]);

    const overallRubric =
      await this.internalDocumentsService.queryInternalDocuments(
        'Overall Scoring Rubric for Candidate Evaluation',
        'scoring_rubric',
      );

    this.logger.log(
      `[Evaluation] Computing final overall score for job: ${jobId}`,
    );
    const model = new ChatOpenAI({ model: 'gpt-4o', temperature: 0 });
    const structuredModel = model.withStructuredOutput(OverallEvaluationSchema);
    const finalEvaluation = await structuredModel.invoke(`
      You are a scoring calculator.
      Your task is to compute the **final overall evaluation** based strictly on the provided *scoring rubric*, which is retrieved from RAG and summarized below.

      Do NOT invent new weights or criteria.
      All calculations must follow the weights and scales exactly as described in the rubric text.

      ---

      **Inputs:**

      CV Evaluation:
      ${JSON.stringify(cvEvaluation, null, 2)}

      Project Evaluation:
      ${JSON.stringify(projectEvaluation, null, 2)}

      Overall Scoring Rubric:
      ${overallRubric as string}

      **Output:**
      Provide the evaluation in strict JSON according to the schema.
    `);

    this.logger.log(
      `[Evaluation] Completed combined evaluation for job: ${jobId}`,
    );

    // Create overall evaluation record in database
    await this.createEvaluationRecord(
      jobId,
      EvaluationType.OVERALL,
      finalEvaluation,
    );

    return { result: finalEvaluation };
  }

  /**
   * Create evaluation record in database
   */
  async createEvaluationRecord(
    jobId: string,
    type: string,
    evaluationData: Record<string, any>,
    documentId?: string,
  ): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('evaluations')
      .insert({
        job_id: jobId,
        type,
        status: EvaluationStatus.COMPLETED,
        data: evaluationData,
        document_id: documentId,
        finished_at: new Date().toISOString(),
      });

    if (error) {
      this.logger.error(`Failed to create evaluation record: ${error.message}`);
      throw new Error(`Failed to create evaluation record: ${error.message}`);
    }
  }
}
