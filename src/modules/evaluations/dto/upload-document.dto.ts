import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadDocumentDto {
  @ApiProperty({
    description: 'Type of document',
    enum: ['cv', 'project'],
    example: 'cv',
  })
  @IsEnum(['cv', 'project'])
  @IsNotEmpty()
  type: 'cv' | 'project';
}
