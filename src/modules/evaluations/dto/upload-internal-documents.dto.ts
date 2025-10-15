import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { DocumentType } from 'src/modules/types/document-type.enum';

export class UploadInternalDocumentsDto {
  @ApiProperty({ enum: DocumentType })
  @IsNotEmpty()
  documentType: DocumentType;

  @ApiProperty({ type: 'string', format: 'binary' })
  @IsNotEmpty()
  document: Express.Multer.File;
}
