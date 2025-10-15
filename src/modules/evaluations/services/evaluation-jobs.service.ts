import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../../../common/services/supabase.service';
import { EvaluationStatus } from '../types/status.enum';

@Injectable()
export class EvaluationJobsService {
  private readonly logger = new Logger(EvaluationJobsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    @InjectQueue('evaluation-queue') private evaluationQueue: Queue,
  ) {}

  async createAndQueueJob(data: {
    cvDocumentId: string;
    projectDocumentId: string;
    jobTitle: string;
  }): Promise<{ id: string; status: string }> {
    const jobId = randomUUID();

    this.logger.log(
      `Creating evaluation job ${jobId} for job title: ${data.jobTitle}`,
    );

    // Create evaluation job record
    const { error } = await this.supabaseService.client
      .from('evaluation_jobs')
      .insert({
        id: jobId,
        cv_document_id: data.cvDocumentId,
        project_document_id: data.projectDocumentId,
        job_title: data.jobTitle,
        status: EvaluationStatus.PROCESSING,
      });

    if (error) {
      this.logger.error(
        `Failed to create evaluation job: ${error.message}`,
        error,
      );
      throw new Error(`Failed to create evaluation job: ${error.message}`);
    }

    await this.evaluationQueue.add('evaluate-overall', {
      jobId,
      cvDocumentId: data.cvDocumentId,
      projectDocumentId: data.projectDocumentId,
      jobTitle: data.jobTitle,
    });

    this.logger.log(`Job ${jobId} created and queued successfully`);

    return {
      id: jobId,
      status: 'queued',
    };
  }

  async updateJobStatus(
    jobId: string,
    status: EvaluationStatus,
    data?: Partial<{
      cv_match_rate: number;
      cv_feedback: string;
      cv_calculation_detail: string;
      project_score: number;
      project_feedback: string;
      project_calculation_detail: string;
      overall_summary: string;
    }>,
  ): Promise<void> {
    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === EvaluationStatus.COMPLETED) {
      updateData['finished_at'] = new Date().toISOString();
    }

    if (data) {
      Object.assign(updateData, data);
    }

    const { error } = await this.supabaseService.client
      .from('evaluation_jobs')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      this.logger.error(
        `Failed to update job status for ${jobId}: ${error.message}`,
      );
      throw new Error(`Failed to update job status: ${error.message}`);
    }

    this.logger.log(`Job ${jobId} status updated to ${status}`);
  }

  async getJobById(jobId: string) {
    const { data, error } = await this.supabaseService.client
      .from('evaluation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      this.logger.error(`Failed to get job ${jobId}: ${error.message}`);
      throw new NotFoundException(`Job not found: ${jobId}`);
    }

    return data;
  }

  async getJobStatus(jobId: string) {
    const job = await this.getJobById(jobId);
    const resultData = {
      cv_match_rate: job.cv_match_rate,
      cv_feedback: job.cv_feedback,
      project_score: job.project_score,
      project_feedback: job.project_feedback,
      overall_summary: job.overall_summary,
    };

    const response = {
      id: job.id,
      status: job.status,
    } as { id: string; status: string; result?: typeof resultData };

    if (job.status === 'completed') {
      response.result = resultData;
    }

    return response;
  }
}
