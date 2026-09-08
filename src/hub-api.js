import { base44 } from "./api/base44Client";

window.glamHubInvokeLLM = async (request) => {
  const result = await base44.functions.invoke("hubAi", request);
  return result?.data ?? result;
};

window.dispatchEvent(new Event("glam-hub-ai-ready"));
