import { Volume } from "memfs";
import { TRPCError } from "@trpc/server";

export class VfsService {
  private static instance: VfsService;
  private vol: Volume;

  private constructor() {
    this.vol = new Volume();
  }

  public static getInstance(): VfsService {
    if (!VfsService.instance) {
      VfsService.instance = new VfsService();
    }
    return VfsService.instance;
  }

  public async getDirectory(path: string) {
    try {
      const files = this.vol.readdirSync(path);
      return files;
    } catch (error) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Directory not found",
      });
    }
  }

  public async getFile(path: string) {
    try {
      const file = this.vol.readFileSync(path, "utf-8");
      return file;
    } catch (error) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "File not found",
      });
    }
  }

  public async createFile(path: string, content: string) {
    try {
      this.vol.writeFileSync(path, content);
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create file",
      });
    }
  }

  public async createDirectory(path: string) {
    try {
      this.vol.mkdirSync(path);
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create directory",
      });
    }
  }

  public async deleteFile(path: string) {
    try {
      this.vol.unlinkSync(path);
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete file",
      });
    }
  }

  public async deleteDirectory(path: string) {
    try {
      this.vol.rmdirSync(path);
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete directory",
      });
    }
  }
}
