import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../../common/services/supabase.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class DocumentStorageService {
  private readonly logger = new Logger(DocumentStorageService.name);
  private readonly bucketName: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.bucketName = this.configService.get<string>(
      'SUPABASE_STORAGE_BUCKET',
      'document',
    );
  }

  async uploadDocument(
    file: Express.Multer.File,
    type: 'cv' | 'project',
  ): Promise<{ id: string }> {
    this.logger.log(
      `Uploading ${type} document: ${file.originalname} (${file.size} bytes)`,
    );

    const documentId = `${type}-${Date.now()}`;
    const storagePath = await this.uploadToStorage(file, documentId, type);
    const { data, error } = await this.supabaseService.client
      .from('uploaded_documents')
      .insert({
        file_name: file.originalname,
        file_type: type,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.mimetype,
        metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      })
      .select('id')
      .single();

    if (error) {
      this.logger.error(`Failed to store document metadata: ${error.message}`);
      throw new Error(`Failed to upload document: ${error.message}`);
    }

    this.logger.log(`Document uploaded successfully with ID: ${data.id}`);
    return { id: data.id };
  }

  async getDocumentById(id: string) {
    const { data, error } = await this.supabaseService.client
      .from('uploaded_documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      this.logger.error(`Document not found: ${id}`);
      throw new NotFoundException(`Document not found: ${id}`);
    }

    return data;
  }

  async getDocumentStoragePath(id: string): Promise<string> {
    const document = await this.getDocumentById(id);
    return document.storage_path;
  }

  async deleteDocument(filePath: string): Promise<void> {
    const { error } = await this.supabaseService.client.storage
      .from(this.bucketName)
      .remove([filePath]);

    if (error) {
      this.logger.error(
        `Failed to delete document from storage: ${error.message}`,
      );
    } else {
      this.logger.log(`Document deleted from storage: ${filePath}`);
    }
  }

  async downloadToTempFile(filePath: string): Promise<string> {
    this.logger.log(`Downloading document from Supabase Storage: ${filePath}`);

    const { data, error } = await this.supabaseService.client.storage
      .from(this.bucketName)
      .download(filePath);

    if (error) {
      this.logger.error(`Failed to download document: ${error.message}`);
      throw new Error(`Failed to download document: ${error.message}`);
    }

    const tempDir = os.tmpdir();
    const tempFileName = `eval-${Date.now()}-${path.basename(filePath)}`;
    const tempFilePath = path.join(tempDir, tempFileName);

    const buffer = Buffer.from(await data.arrayBuffer());
    fs.writeFileSync(tempFilePath, buffer);

    this.logger.log(`Document downloaded to temp file: ${tempFilePath}`);
    return tempFilePath;
  }

  deleteTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.debug(`Temp file deleted: ${filePath}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to delete temp file ${filePath}: ${errorMessage}`,
      );
    }
  }

  private async uploadToStorage(
    file: Express.Multer.File,
    jobId: string,
    type: string,
  ): Promise<string> {
    const timestamp = Date.now();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${jobId}/${type}-${timestamp}-${sanitizedFilename}`;

    this.logger.log(
      `Uploading document to Supabase Storage: ${filePath} (${file.size} bytes)`,
    );

    const { data, error } = await this.supabaseService.client.storage
      .from(this.bucketName)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      this.logger.error(`Failed to upload document: ${error.message}`);
      throw new Error(`Failed to upload document: ${error.message}`);
    }

    this.logger.log(`Document uploaded successfully: ${data.path}`);
    return data.path;
  }
}
