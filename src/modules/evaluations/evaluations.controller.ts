import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { InternalDocumentsService } from './services/internal-documents.service';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { UploadInternalDocumentsDto } from './dto/upload-internal-documents.dto';
import { EvaluationsService } from './services/evaluations.service';
import { DocumentType } from '../types/document-type.enum';

@Controller('evaluations')
export class EvaluationsController {
  constructor(
    private readonly internalDocumentsService: InternalDocumentsService,
    private readonly evaluationsService: EvaluationsService,
  ) {}

  @UseInterceptors(FileInterceptor('document'))
  @Post('internal-documents/upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload an internal document (PDF format)',
    type: UploadInternalDocumentsDto,
  })
  async uploadInternalDocument(
    @Body('documentType') documentType: DocumentType,
    @UploadedFile() document: Express.Multer.File,
  ) {
    return this.internalDocumentsService.storeInternalDocument(
      documentType,
      document,
    );
  }

  @Get('internal-documents/search')
  async queryInternalDocuments(
    @Query('query') query: string,
    @Query('filter') filter?: string,
  ) {
    return this.internalDocumentsService.queryInternalDocuments(query, filter);
  }

  @UseInterceptors(FileInterceptor('cvDocument'))
  @Post('evaluate/cv')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload CV and project documents (PDF format)',
    schema: {
      type: 'object',
      properties: {
        cvDocument: {
          type: 'string',
          format: 'binary',
          description: 'CV document in PDF format',
        },
      },
      required: ['cvDocument'],
    },
  })
  async evaluateCv(@UploadedFile() file: Express.Multer.File) {
    return await this.evaluationsService.evaluateCv(file);
  }

  @UseInterceptors(FileInterceptor('projectDocument'))
  @Post('evaluate/project')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload project document (PDF format)',
    schema: {
      type: 'object',
      properties: {
        projectDocument: {
          type: 'string',
          format: 'binary',
          description: 'Project document in PDF format',
        },
      },
      required: ['projectDocument'],
    },
  })
  async evaluateProject(@UploadedFile() file: Express.Multer.File) {
    return await this.evaluationsService.evaluateProject(file);
  }

  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'cvDocument', maxCount: 1 },
      { name: 'projectDocument', maxCount: 1 },
    ]),
  )
  @Post('evaluate/final')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Upload CV and project documents for comprehensive final evaluation (PDF format)',
    schema: {
      type: 'object',
      properties: {
        cvDocument: {
          type: 'string',
          format: 'binary',
          description: 'CV document in PDF format',
        },
        projectDocument: {
          type: 'string',
          format: 'binary',
          description: 'Project document in PDF format',
        },
      },
      required: ['cvDocument', 'projectDocument'],
    },
  })
  async finalEvaluation(
    @UploadedFiles()
    files: {
      cvDocument: Express.Multer.File[];
      projectDocument: Express.Multer.File[];
    },
  ) {
    return await this.evaluationsService.evaluation(
      files.cvDocument[0],
      files.projectDocument[0],
    );
  }
}
