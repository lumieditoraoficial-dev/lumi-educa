import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";

export const aiRouter = router({
  // Get AI suggestions for text
  getSuggestions: protectedProcedure
    .input(
      z.object({
        text: z.string().min(10),
        type: z.enum(["grammar", "style", "creativity", "structure"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!["educator", "coordinator", "editor", "admin"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "IA disponível apenas para a equipe pedagógica." });
      }

      try {
        const prompts = {
          grammar: `Analise o seguinte texto e forneça sugestões de correção gramatical. Retorne um JSON com array de sugestões, cada uma com: originalText, suggestedText, explanation.\n\nTexto: "${input.text}"`,
          style: `Analise o estilo de escrita do seguinte texto e forneça sugestões para melhorar a clareza, fluidez e impacto. Retorne um JSON com array de sugestões.\n\nTexto: "${input.text}"`,
          creativity: `Analise o seguinte texto e forneça sugestões criativas para enriquecer a narrativa, adicionar detalhes sensoriais ou melhorar a imaginação. Retorne um JSON com array de sugestões.\n\nTexto: "${input.text}"`,
          structure: `Analise a estrutura do seguinte texto e forneça sugestões para melhorar a organização, coesão e progressão de ideias. Retorne um JSON com array de sugestões.\n\nTexto: "${input.text}"`,
        };

        const selectedType = input.type || "grammar";
        const prompt = prompts[selectedType];

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "Você é um assistente pedagógico especializado em análise de texto e escrita criativa. Forneça sugestões construtivas e encorajadoras.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "suggestions",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        originalText: { type: "string" },
                        suggestedText: { type: "string" },
                        explanation: { type: "string" },
                      },
                      required: ["originalText", "suggestedText", "explanation"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message.content;
        if (!content || typeof content !== "string") throw new Error("No response from LLM");

        return JSON.parse(content);
      } catch (error) {
        console.error("AI suggestion error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao gerar sugestões de IA",
        });
      }
    }),

  // Get writing feedback
  getWritingFeedback: protectedProcedure
    .input(z.object({ text: z.string().min(50) }))
    .mutation(async ({ input, ctx }) => {
      if (!["educator", "coordinator", "editor", "admin"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "IA disponível apenas para a equipe pedagógica." });
      }

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "Você é um professor de escrita criativa experiente. Forneça feedback construtivo, encorajador e detalhado sobre o texto do aluno.",
            },
            {
              role: "user",
              content: `Analise o seguinte texto e forneça feedback sobre: 1) Clareza e coesão, 2) Criatividade e imaginação, 3) Estrutura e organização, 4) Pontos fortes, 5) Áreas para melhorar. Seja encorajador e construtivo.\n\nTexto: "${input.text}"`,
            },
          ],
        });

        const feedback = response.choices[0]?.message.content;
        return {
          feedback: typeof feedback === "string" ? feedback : "",
        };
      } catch (error) {
        console.error("Writing feedback error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao gerar feedback",
        });
      }
    }),

  // Get creative prompts
  getCreativePrompts: protectedProcedure
    .input(z.object({ genre: z.string().optional(), theme: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (!["educator", "coordinator", "editor", "admin"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "IA disponível apenas para a equipe pedagógica." });
      }

      try {
        const genreText = input.genre ? `gênero: ${input.genre}` : "";
        const themeText = input.theme ? `tema: ${input.theme}` : "";
        const context = [genreText, themeText].filter(Boolean).join(", ");

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "Você é um criador de prompts de escrita criativa. Gere prompts inspiradores, desafiadores e divertidos.",
            },
            {
              role: "user",
              content: `Gere 3 prompts de escrita criativa ${context ? `para ${context}` : ""}. Cada prompt deve ser inspirador, específico e desafiador. Forneça como um JSON com array de prompts.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "creative_prompts",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  prompts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        difficulty: { type: "string", enum: ["fácil", "médio", "difícil"] },
                      },
                      required: ["title", "description", "difficulty"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["prompts"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message.content;
        if (!content || typeof content !== "string") throw new Error("No response from LLM");

        return JSON.parse(content);
      } catch (error) {
        console.error("Creative prompts error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao gerar prompts criativos",
        });
      }
    }),
});
