import ollama from "ollama";

const MODEL = "qwen2.5-coder:14b";

export { MODEL };

export const generateOllamaResponse = async (prompt, opts = {}) => {
  const response = await ollama.chat({
    model: MODEL,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    options: {
      temperature: opts.temperature ?? 0.7,
      num_ctx: opts.num_ctx ?? 8192,
    },
  });

  return response.message.content;
};