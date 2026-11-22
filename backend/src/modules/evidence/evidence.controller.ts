import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  EVIDENCE_UPLOAD,
  type EvidenceItem,
  EvidenceItemSchema,
  IdSchema,
  type LinkMaterialEvidenceRequest,
  LinkMaterialEvidenceRequestSchema,
  type UploadEvidenceFields,
  UploadEvidenceFieldsSchema,
  type User,
  type VerifyEvidenceRequest,
  VerifyEvidenceRequestSchema,
} from '@greenforce/shared';
import type { Response } from 'express';
import { CurrentUser } from '../auth/auth.decorators.js';
import { EvidenceService, type UploadedFile as EvidenceFile } from './evidence.service.js';

@ApiTags('evidence')
@Controller('projects/:id/evidence')
export class EvidenceController {
  constructor(private readonly evidence: EvidenceService) {}

  @Post()
  // No `dest`/`storage`: multer keeps the file in memory so it can be sniffed and hashed before it is stored.
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: EVIDENCE_UPLOAD.maxBytes, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'ruleId', 'requirementKey'],
      properties: {
        file: { type: 'string', format: 'binary' },
        ruleId: { type: 'string' },
        requirementKey: { type: 'string' },
        note: { type: 'string' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a document as evidence for a requirement (SHA-256 fingerprinted)' })
  @ApiResponse({ status: 201, standardSchema: EvidenceItemSchema })
  upload(
    @CurrentUser() user: User,
    @Param('id', { schema: IdSchema }) projectId: string,
    @Body({ schema: UploadEvidenceFieldsSchema }) fields: UploadEvidenceFields,
    @UploadedFile() file: EvidenceFile | undefined,
  ): Promise<EvidenceItem> {
    return this.evidence.upload(user, projectId, fields, file);
  }

  @Post('link-material')
  @ApiOperation({ summary: "Use a selected catalog material's EPD or product data as evidence" })
  @ApiResponse({ status: 201, standardSchema: EvidenceItemSchema })
  linkMaterial(
    @CurrentUser() user: User,
    @Param('id', { schema: IdSchema }) projectId: string,
    @Body({ schema: LinkMaterialEvidenceRequestSchema }) body: LinkMaterialEvidenceRequest,
  ): Promise<EvidenceItem> {
    return this.evidence.linkMaterial(user, projectId, body);
  }

  @Patch(':evidenceId/verify')
  @ApiOperation({ summary: 'Mark evidence as verified (or withdraw verification)' })
  @ApiResponse({ status: 200, standardSchema: EvidenceItemSchema })
  verify(
    @CurrentUser() user: User,
    @Param('id', { schema: IdSchema }) projectId: string,
    @Param('evidenceId', { schema: IdSchema }) evidenceId: string,
    @Body({ schema: VerifyEvidenceRequestSchema }) body: VerifyEvidenceRequest,
  ): Promise<EvidenceItem> {
    return this.evidence.setVerified(user, projectId, evidenceId, body.verified);
  }

  @Delete(':evidenceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove evidence and its stored file' })
  remove(
    @CurrentUser() user: User,
    @Param('id', { schema: IdSchema }) projectId: string,
    @Param('evidenceId', { schema: IdSchema }) evidenceId: string,
  ): Promise<void> {
    return this.evidence.remove(user, projectId, evidenceId);
  }

  @Get(':evidenceId/file')
  @ApiOperation({ summary: 'Download the stored evidence file' })
  async download(
    @CurrentUser() user: User,
    @Param('id', { schema: IdSchema }) projectId: string,
    @Param('evidenceId', { schema: IdSchema }) evidenceId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.evidence.download(user, projectId, evidenceId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(file.data, {
      type: file.mimeType,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      length: file.data.length,
    });
  }
}
