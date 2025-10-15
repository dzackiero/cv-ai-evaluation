import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EvaluationStatus } from '../types/status.enum';
import { EvaluationsService } from '../services/evaluations.service';
import { EvaluationJobsService } from '../services/evaluation-jobs.service';

interface EvaluationJobData {
  jobId: string;
  cvDocumentId: string;
  projectDocumentId: string;
  jobTitle: string;
}

@Processor('evaluation-queue')
export class EvaluationProcessor extends WorkerHost {
  private readonly logger = new Logger(EvaluationProcessor.name);

  constructor(
    private readonly evaluationsService: EvaluationsService,
    private readonly evaluationJobsService: EvaluationJobsService,
  ) {
    super();
  }

  async process(job: Job<EvaluationJobData>): Promise<void> {
    const { jobId, cvDocumentId, projectDocumentId, jobTitle } = job.data;
    this.logger.log(`Processing evaluation job ${jobId} for "${jobTitle}"`);
    try {
      await this.evaluationJobsService.updateJobStatus(
        jobId,
        EvaluationStatus.PROCESSING,
      );

      const overallResult = await this.evaluationsService.overallEvaluation(
        cvDocumentId,
        projectDocumentId,
        jobId,
      );

      await this.evaluationJobsService.updateJobStatus(
        jobId,
        EvaluationStatus.COMPLETED,
        overallResult.result,
      );

      this.logger.log(`[${jobId}] Overall evaluation completed successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to process job ${jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      await this.evaluationJobsService.updateJobStatus(
        jobId,
        EvaluationStatus.FAILED,
      );
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} failed with error: ${error.message}`,
      error.stack,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed successfully`);
  }
}
