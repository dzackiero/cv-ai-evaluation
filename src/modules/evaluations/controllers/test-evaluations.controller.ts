import { Post, Body, Controller } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { TestEvaluationDto } from '../dto/test-evaluation.dto';
import { EvaluationsService } from '../services/evaluations.service';

@Controller('test-evaluations')
export class TestEvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Post('test/cv')
  @ApiBody({
    description: 'Test CV evaluation',
    type: TestEvaluationDto,
  })
  async testCvEvaluation(@Body() dto: TestEvaluationDto) {
    const result = await this.evaluationsService.evaluateCv(
      dto.documentId,
      dto.jobTitle,
    );

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
      dto.jobTitle,
    );

    return {
      documentId: dto.documentId,
      evaluation: result,
    };
  }
}
