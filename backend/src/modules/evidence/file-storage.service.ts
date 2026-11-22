import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config/env.js';

/**
 * Local-disk evidence storage (a Docker volume in compose). Paths are generated server-side from UUIDs,
 * never from user-supplied file names. Swap for S3-compatible storage after the MVP.
 */
@Injectable()
export class FileStorageService {
  private readonly root: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.root = path.resolve(config.UPLOAD_DIR);
  }

  async save(projectId: string, fileId: string, data: Buffer): Promise<string> {
    const relative = path.posix.join(projectId, fileId);
    const absolute = this.resolve(relative);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, data, { flag: 'wx' });
    return relative;
  }

  async read(relative: string): Promise<Buffer> {
    try {
      return await readFile(this.resolve(relative));
    } catch {
      throw new NotFoundException('Stored file is missing');
    }
  }

  async remove(relative: string): Promise<void> {
    await rm(this.resolve(relative), { force: true });
  }

  /** Empties the upload directory but keeps it: in Docker it is a mounted volume that cannot be removed. */
  async clear(): Promise<void> {
    const entries = await readdir(this.root).catch(() => []);
    await Promise.all(
      entries.map((entry) => rm(path.join(this.root, entry), { recursive: true, force: true })),
    );
  }

  private resolve(relative: string): string {
    const absolute = path.resolve(this.root, relative);
    if (!absolute.startsWith(this.root + path.sep)) throw new Error('Path escapes the upload directory');
    return absolute;
  }
}
