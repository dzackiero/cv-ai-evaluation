import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Utility class for managing temporary file operations.
 * Provides safe creation, deletion, and automatic cleanup of temporary files.
 */
export class TempFileManager {
  private static readonly logger = new Logger(TempFileManager.name);

  static createTempFile(file: Express.Multer.File, prefix: string): string {
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const tempFilePath = path.join(
      tempDir,
      `${prefix}-${timestamp}-${sanitizedFilename}`,
    );

    try {
      this.logger.debug(
        `Creating temp file: ${tempFilePath} (${file.size} bytes)`,
      );
      fs.writeFileSync(tempFilePath, file.buffer);
      this.logger.debug(`Temp file created successfully: ${tempFilePath}`);
      return tempFilePath;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to create temp file ${tempFilePath}: ${errorMessage}`,
      );
      throw new Error(`Failed to create temporary file: ${errorMessage}`);
    }
  }

  static deleteTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.debug(`Temp file deleted: ${filePath}`);
      } else {
        this.logger.warn(`Temp file not found for deletion: ${filePath}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to delete temp file ${filePath}: ${errorMessage}`,
      );
    }
  }

  static async withTempFile<T>(
    file: Express.Multer.File,
    prefix: string,
    operation: (filePath: string) => Promise<T>,
  ): Promise<T> {
    const tempFilePath = this.createTempFile(file, prefix);

    try {
      this.logger.log(
        `Processing file: ${file.originalname} (temp: ${path.basename(tempFilePath)})`,
      );
      const result = await operation(tempFilePath);
      this.logger.log(`File processing completed: ${file.originalname}`);
      return result;
    } finally {
      this.deleteTempFile(tempFilePath);
    }
  }

  static validateFileExists(filePath: string): boolean {
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }
}
