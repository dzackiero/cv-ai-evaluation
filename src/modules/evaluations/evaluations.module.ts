import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EvaluationsController } from './controllers/evaluations.controller';
import { InternalDocumentsController } from './controllers/internal-documents.controller';
import { InternalDocumentsService } from './services/internal-documents.service';
import { EvaluationsService } from './services/evaluations.service';
import { DocumentStorageService } from './services/document-storage.service';
import { EvaluationJobsService } from './services/evaluation-jobs.service';
import { EvaluationProcessor } from './processors/evaluation.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'evaluation-queue',
    }),
  ],
  controllers: [EvaluationsController, InternalDocumentsController],
  providers: [
    InternalDocumentsService,
    EvaluationsService,
    DocumentStorageService,
    EvaluationJobsService,
    EvaluationProcessor,
  ],
})
export class EvaluationsModule {}
