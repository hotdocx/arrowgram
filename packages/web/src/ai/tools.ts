import { tool } from "ai";
import { z } from "zod";

export const tools = {
  updateArtifact: tool({
    description:
      "Update the user's artifact (either a paper markdown document or a diagram JSON spec).",
    inputSchema: z.object({
      commentary: z
        .string()
        .optional()
        .describe("Optional explanation of changes."),
      artifact: z
        .string()
        .describe(
          "The full updated artifact content. For papers: full markdown. For diagrams: full JSON spec."
        ),
    }),
  }),
  uploadFile: tool({
    description:
      "Request that a workspace file be attached as a file part in the next message (read-only). Use this when you need a non-text file or when the user did not mention the file.",
    inputSchema: z.object({
      name: z
        .string()
        .describe("The workspace filename (as shown in the workspace index)."),
    }),
  }),
  getFile: tool({
    description:
      "Read a workspace file by name (read-only) and return its contents when it is a text file.",
    inputSchema: z.object({
      name: z.string().describe("The workspace filename (as shown in the workspace index)."),
      maxBytes: z.number().optional().describe("Maximum bytes to read (default: 200000)."),
      maxChars: z.number().optional().describe("Maximum characters to return (default: 200000)."),
    }),
  }),
};
