import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { InternalDocumentsService } from '../services/internal-documents.service';
import { UploadInternalDocumentsDto } from '../dto/upload-internal-documents.dto';
import { DocumentType } from '../types/document-type.enum';

@ApiTags('internal-documents')
@Controller('internal-documents')
export class InternalDocumentsController {
  constructor(
    private readonly internalDocumentsService: InternalDocumentsService,
  ) {}

  @UseInterceptors(FileInterceptor('document'))
  @Post('upload')
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

  @Get('search')
  async queryInternalDocuments(
    @Query('query') query: string,
    @Query('filter') filter?: string,
  ) {
    return this.internalDocumentsService.queryInternalDocuments(query, filter);
  }
}
