import { Controller, Get, Module, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type FundingResponse, FundingResponseSchema, IdSchema, type User } from '@greenforce/shared';
import { CurrentUser } from '../auth/auth.decorators.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { FundingService } from './funding.service.js';

@ApiTags('funding')
@Controller('projects/:id/funding')
export class FundingController {
  constructor(private readonly funding: FundingService) {}

  @Get()
  @ApiOperation({ summary: 'Funding programs evaluated against the project' })
  @ApiResponse({ status: 200, standardSchema: FundingResponseSchema })
  evaluate(
    @CurrentUser() user: User,
    @Param('id', { schema: IdSchema }) projectId: string,
  ): Promise<FundingResponse> {
    return this.funding.evaluate(user, projectId);
  }
}

@Module({
  imports: [ProjectsModule],
  controllers: [FundingController],
  providers: [FundingService],
})
export class FundingModule {}
