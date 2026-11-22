import { Injectable } from '@nestjs/common';
import type { ComplianceResult, Material, ProjectDetail } from '@greenforce/shared';
import { type ProjectRow, ProjectsRepository } from '../projects/projects.repository.js';
import { evaluate } from './engine/engine.js';
import type { EvaluationInput } from './engine/types.js';

export interface ProjectEvaluation {
  row: ProjectRow;
  detail: ProjectDetail;
  input: EvaluationInput;
  selected: Material[];
  result: ComplianceResult;
}

/** Evaluates projects on read: the result is always consistent with current setup, evidence and materials. */
@Injectable()
export class ComplianceService {
  constructor(private readonly repository: ProjectsRepository) {}

  async evaluateOwned(projectId: string, ownerId: string): Promise<ProjectEvaluation> {
    return this.evaluateRow(await this.repository.findOwned(projectId, ownerId));
  }

  async evaluateRow(row: ProjectRow): Promise<ProjectEvaluation> {
    const { input, detail, selected } = await this.repository.evaluationInput(row);
    return { row, detail, input, selected, result: evaluate(input) };
  }
}
