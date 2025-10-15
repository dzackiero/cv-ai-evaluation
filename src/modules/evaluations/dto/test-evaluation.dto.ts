import { IsUUID, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TestEvaluationDto {
  @ApiProperty({
    description: 'Document ID to test',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  documentId: string;

  @ApiProperty({
    description: 'Job title for evaluation',
    example: 'Product Engineer (Backend)',
  })
  @IsString()
  @IsNotEmpty()
  jobTitle: string;
}
