import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  DocumentType,
  InternalDocumentsService,
} from './services/internal-documents.service';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadInternalDocumentsDto } from './dto/upload-internal-documents.dto';
import { EvaluationsService } from './services/evaluations.service';

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
}
