import { IsString, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEvaluationDto {
  @ApiProperty({
    description: 'CV Document ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  cvDocumentId: string;

  @ApiProperty({
    description: 'Project Document ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  @IsNotEmpty()
  projectDocumentId: string;

  @ApiProperty({
    description: 'Job title for evaluation',
    example: 'Product Engineer (Backend)',
  })
  @IsString()
  @IsNotEmpty()
  jobTitle: string;
}
