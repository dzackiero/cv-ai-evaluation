import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentStorageService } from '../services/document-storage.service';
import { EvaluationJobsService } from '../services/evaluation-jobs.service';
import { EvaluationsService } from '../services/evaluations.service';
import { UploadDocumentDto } from '../dto/upload-document.dto';
import { CreateEvaluationDto } from '../dto/create-evaluation.dto';
import { TestEvaluationDto } from '../dto/test-evaluation.dto';

@ApiTags('evaluations')
@Controller()
export class EvaluationsController {
  constructor(
    private readonly documentStorageService: DocumentStorageService,
    private readonly evaluationJobsService: EvaluationJobsService,
    private readonly evaluationsService: EvaluationsService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload CV or Project document (PDF format)',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file in PDF format',
        },
        type: {
          type: 'string',
          enum: ['cv', 'project'],
          description: 'Type of document',
        },
      },
      required: ['file', 'type'],
    },
  })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    return await this.documentStorageService.uploadDocument(file, dto.type);
  }

  @Post('evaluate')
  @ApiBody({
    description: 'Start evaluation with uploaded document IDs and job title',
    type: CreateEvaluationDto,
  })
  async createEvaluation(@Body() dto: CreateEvaluationDto) {
    return await this.evaluationJobsService.createAndQueueJob(dto);
  }

  @Get('result/:id')
  async getEvaluationResult(@Param('id') id: string) {
    return await this.evaluationJobsService.getJobStatus(id);
  }

  @Post('test/cv')
  @ApiBody({
    description: 'Test CV evaluation',
    type: TestEvaluationDto,
  })
  async testCvEvaluation(@Body() dto: TestEvaluationDto) {
    const result = await this.evaluationsService.evaluateCv(dto.documentId);

    return {
      documentId: dto.documentId,
      evaluation: result,
    };
  }

  @Post('test/project')
  @ApiBody({
    description: 'Test project evaluation',
    type: TestEvaluationDto,
  })
  async testProjectEvaluation(@Body() dto: TestEvaluationDto) {
    const result = await this.evaluationsService.evaluateProject(
      dto.documentId,
    );

    return {
      documentId: dto.documentId,
      evaluation: result,
    };
  }
}
