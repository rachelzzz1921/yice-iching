/** 对用户展示的 AI 品牌文案（不暴露具体厂商） */

export const AI_PROVIDER_LABEL = "海外顶级大模型";

export const AI_CLOUD_LABEL = "云端 AI";

export function aiFollowUpDisabledHint(): string {
  return import.meta.env.DEV
    ? "深入追问需接入云端 AI，请在服务端配置密钥后重启"
    : "深入追问需接入云端大模型，当前暂未开放，请稍后再试";
}

export function aiFollowUpDisabledTitle(): string {
  return "云端大模型接入后可追问";
}

/** 将可能泄露厂商的错误信息转为用户可读文案 */
export function sanitizeAiUserError(message: string): string {
  let s = message;
  s = s.replace(/智谱[^\s，。]*/g, AI_CLOUD_LABEL);
  s = s.replace(/ZHIPU[_A-Z]*/gi, "云端 AI");
  s = s.replace(/glm-[\w.-]+/gi, AI_PROVIDER_LABEL);
  s = s.replace(/bigmodel\.cn/gi, "云端服务");
  s = s.replace(/open\.bigmodel/gi, "云端");
  if (/未配置|需配置/.test(s) && import.meta.env.PROD) {
    return "云端 AI 服务暂不可用，请稍后再试";
  }
  if (/无法连接|fetch failed|Failed to fetch|network/i.test(s)) {
    return "云端 AI 暂不可用，请检查网络或稍后再试";
  }
  return s;
}
