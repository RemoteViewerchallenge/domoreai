import { z } from "zod";
import { protectedProcedure, router } from "../trpc.js";
import { VfsService } from "../services/vfs.service.js";

export const vfsRouter = router({
  getDirectory: protectedProcedure
    .input(z.object({ path: z.string() }))
    .query(async ({ input }: { input: { path: string } }) => {
      const vfs = await VfsService.getInstance();
      const files = await vfs.getDirectory(input.path);
      return files;
    }),

  getFile: protectedProcedure
    .input(z.object({ path: z.string() }))
    .query(async ({ input }: { input: { path: string } }) => {
      const vfs = await VfsService.getInstance();
      const file = await vfs.getFile(input.path);
      return file;
    }),

  createFile: protectedProcedure
    .input(z.object({ path: z.string(), content: z.string() }))
    .mutation(async ({ input }: { input: { path: string; content: string } }) => {
      const vfs = await VfsService.getInstance();
      await vfs.createFile(input.path, input.content);
    }),

  createDirectory: protectedProcedure
    .input(z.object({ path: z.string() }))
    .mutation(async ({ input }: { input: { path: string } }) => {
      const vfs = await VfsService.getInstance();
      await vfs.createDirectory(input.path);
    }),

  deleteFile: protectedProcedure
    .input(z.object({ path: z.string() }))
    .mutation(async ({ input }: { input: { path: string } }) => {
      const vfs = await VfsService.getInstance();
      await vfs.deleteFile(input.path);
    }),

  deleteDirectory: protectedProcedure
    .input(z.object({ path: z.string() }))
    .mutation(async ({ input }: { input: { path: string } }) => {
      const vfs = await VfsService.getInstance();
      await vfs.deleteDirectory(input.path);
    }),
});
