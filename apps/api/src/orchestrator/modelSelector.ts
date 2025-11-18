import { OpenAI } from "openai";
import { z } from "zod";
import { createClient, RedisClientType } from "redis";

import { LLMAdapter } from "../llm-adapters.js";
import { LLMProvider } from "@repo/common";

const adapter = new LLMAdapter();

export class ModelSelector {
  private static instance: ModelSelector;
  private redisClient: RedisClientType;
  private providers: LLMProvider[] = [];
  private constructor() {
    this.redisClient = createClient();
  }

  public static getInstance(): ModelSelector {
    if (!ModelSelector.instance) {
      ModelSelector.instance = new ModelSelector();
    }
    return ModelSelector.instance;
  }

  public async getModels() {
    const models = await adapter.getModels();
    return models;
  }

  public async getProviders() {
    if (this.providers.length > 0) {
      return this.providers;
    }
    const providers = await adapter.getProviders();
    this.providers = providers;
    return providers;
  }

  public async getModel(modelId: string) {
    const models = await this.getModels();
    const model = models.find((model: any) => model.id === modelId);
    return model;
  }

  public async getProvider(providerId: string) {
    const providers = await this.getProviders();
    const provider = providers.find((provider: any) => provider.id === providerId);
    return provider;
  }

  public async getBestModel(prompt: string) {
    const models = await this.getModels();
    const providers = await this.getProviders();

    const availableModels = models.filter((model: any) => {
      const provider = providers.find((provider: any) => provider.id === model.providerId);
      if (!provider) {
        return false;
      }
      return true;
    });

    if (availableModels.length === 0) {
      throw new Error("No available models");
    }

    const randomIndex = Math.floor(Math.random() * availableModels.length);
    return availableModels[randomIndex];
  }
}
