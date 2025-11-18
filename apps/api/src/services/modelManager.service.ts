import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class ModelManager {
  public async getModels() {
    return await prisma.model.findMany();
  }

  public async updateModel(model: any) {
    return await prisma.model.update({
      where: { id: model.id },
      data: model,
    });
  }

  public async getProviders(userId: string) {
    return await prisma.provider.findMany({
      where: { userId: userId },
    });
  }

  public async createProvider(userId: string, provider: any) {
    return await prisma.provider.create({
      data: {
        ...provider,
        userId,
      },
    });
  }

  public async updateProvider(userId: string, provider: any) {
    return await prisma.provider.update({
      where: { id: provider.id },
      data: provider,
    });
  }

  public async getRoles(userId: string) {
    return await prisma.role.findMany({
      where: { userId: userId },
    });
  }

  public async createRole(userId: string, role: any) {
    return await prisma.role.create({
      data: {
        ...role,
        userId,
      },
    });
  }

  public async updateRole(userId: string, role: any) {
    return await prisma.role.update({
      where: { id: role.id },
      data: role,
    });
  }

  public async deleteRole(userId: string, roleId: string) {
    return await prisma.role.delete({
      where: { id: roleId },
    });
  }
}

export const modelManager = new ModelManager();
