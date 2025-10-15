import { Module } from '@nestjs/common';
import { EvaluationsController } from './evaluations.controller';
import { InternalDocumentsService } from './services/internal-documents.service';
import { EvaluationsService } from './services/evaluations.service';

@Module({
  controllers: [EvaluationsController],
  providers: [InternalDocumentsService, EvaluationsService],
})
export class EvaluationsModule {}
