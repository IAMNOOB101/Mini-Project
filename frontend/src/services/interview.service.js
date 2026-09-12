import api from "./api";

export const startInterview = (payload, forceNew = false) => api.post("/interview/session/start", { ...payload, forceNew });
export const submitAnswer = (payload) => api.post("/interview/session/submit", payload);
export const getNextQuestion = (sessionId) => api.get(`/interview/session/question/${sessionId}`);
export const getHistory = () => api.get("/interview/sessions");
export const getTranscript = (sessionId) => api.get(`/interview/report/${sessionId}`);
export const setupProfile = (profile) => api.post("/interview/setup", profile);

