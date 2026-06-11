/**
 * AI 解读 prompt 语料层组装（1/2/3/5/6）
 */
import { buildEssenceContext } from "@/lib/hexagramEssence";
import { buildYaoContext } from "@/lib/yaoWeights";
import { buildTransitionContext } from "@/lib/bianguaTransitions";
import { buildOpenerContext } from "@/lib/hexagramOpeners";
import { buildCuratedContext } from "@/lib/curatedReadings";

export function resolveYaoNature(position, yinyang) {
  if (yinyang === "阳") return 1;
  if (yinyang === "阴") return 0;
  if (!position) return null;
  if (/九/.test(position)) return 1;
  if (/六/.test(position)) return 0;
  return null;
}

export function buildPrompt(params) {
  const {
    benGuaId,
    bianGuaId = null,
    category,
    changingLine = 0,
    yaoPosition,
    yaoYinyang = null,
  } = params;

  const layers = [];

  const essence = buildEssenceContext(benGuaId, bianGuaId, category);
  if (essence) {
    layers.push({ key: "essence", title: "卦性速查", content: essence });
  }

  if (changingLine >= 1 && changingLine <= 6) {
    const nature = resolveYaoNature(yaoPosition, yaoYinyang);
    if (nature !== null) {
      const yaoCtx = buildYaoContext(changingLine, nature, category);
      if (yaoCtx) {
        layers.push({ key: "yao", title: "动爻权重", content: yaoCtx });
      }
    }
  }

  const transition = buildTransitionContext(benGuaId, bianGuaId, category);
  if (transition) {
    layers.push({ key: "transition", title: "变卦转化", content: transition });
  }

  const opener = buildOpenerContext(benGuaId, category);
  if (opener) {
    layers.push({ key: "opener", title: "一句话定性备选", content: opener });
  }

  const curated = buildCuratedContext(benGuaId, bianGuaId, category);
  if (curated) {
    layers.push({ key: "curated", title: "解读范例", content: curated });
  }

  return layers;
}

export function formatPromptLayers(layers) {
  return layers
    .map(
      (layer) =>
        `## ${layer.title}（白话锚点，结合卦辞爻辞使用，勿照抄）\n${layer.content}`,
    )
    .join("\n\n");
}

export function buildFollowUpPromptLayers(params) {
  return buildPrompt(params).filter((layer) =>
    ["essence", "yao", "transition"].includes(layer.key),
  );
}
