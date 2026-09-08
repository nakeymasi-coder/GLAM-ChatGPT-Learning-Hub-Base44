import { base44 } from "./api/base44Client";

window.glamHubInvokeLLM = (request) =>
  base44.functions.invoke("hub-ai", request);

window.dispatchEvent(new Event("glam-hub-ai-ready"));
