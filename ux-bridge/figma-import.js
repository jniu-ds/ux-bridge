const FIGMA_API_BASE_URL = "https://api.figma.com/v1";
const MAX_FIGMA_TREE_NODES = 140;
const MAX_FIGMA_TREE_DEPTH = 8;

function readFigmaAccessToken() {
  return String(
    process.env.UX_BRIDGE_FIGMA_ACCESS_TOKEN ||
      process.env.FIGMA_ACCESS_TOKEN ||
      process.env.FIGMA_TOKEN ||
      "",
  ).trim();
}

function compactPaint(paint = {}) {
  if (!paint || typeof paint !== "object" || paint.visible === false) {
    return null;
  }

  if (paint.type === "SOLID") {
    const color = paint.color || {};
    return {
      type: "SOLID",
      color: {
        r: color.r,
        g: color.g,
        b: color.b,
      },
      opacity: typeof paint.opacity === "number" ? paint.opacity : 1,
    };
  }

  return {
    type: paint.type,
    opacity: typeof paint.opacity === "number" ? paint.opacity : undefined,
  };
}

function compactStyle(style = {}) {
  if (!style || typeof style !== "object") {
    return undefined;
  }

  const result = {};
  [
    "fontFamily",
    "fontPostScriptName",
    "fontWeight",
    "fontSize",
    "lineHeightPx",
    "letterSpacing",
    "textAlignHorizontal",
    "textAlignVertical",
  ].forEach((key) => {
    if (style[key] !== undefined && style[key] !== null) {
      result[key] = style[key];
    }
  });

  return Object.keys(result).length ? result : undefined;
}

function summarizeNode(node, depth = 0, counter = { count: 0 }) {
  if (!node || typeof node !== "object" || counter.count >= MAX_FIGMA_TREE_NODES || depth > MAX_FIGMA_TREE_DEPTH) {
    return null;
  }

  counter.count += 1;

  const box = node.absoluteBoundingBox || {};
  const summary = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible !== false,
    width: typeof box.width === "number" ? Math.round(box.width * 100) / 100 : undefined,
    height: typeof box.height === "number" ? Math.round(box.height * 100) / 100 : undefined,
  };

  if (node.type === "TEXT") {
    summary.text = String(node.characters || "").slice(0, 600);
    summary.style = compactStyle(node.style);
  }

  if (node.layoutMode) {
    summary.layout = {
      mode: node.layoutMode,
      primaryAxisAlignItems: node.primaryAxisAlignItems,
      counterAxisAlignItems: node.counterAxisAlignItems,
      itemSpacing: node.itemSpacing,
      paddingLeft: node.paddingLeft,
      paddingRight: node.paddingRight,
      paddingTop: node.paddingTop,
      paddingBottom: node.paddingBottom,
    };
  }

  const fills = Array.isArray(node.fills) ? node.fills.map(compactPaint).filter(Boolean).slice(0, 4) : [];
  const strokes = Array.isArray(node.strokes) ? node.strokes.map(compactPaint).filter(Boolean).slice(0, 4) : [];

  if (fills.length) {
    summary.fills = fills;
  }

  if (strokes.length) {
    summary.strokes = strokes;
    summary.strokeWeight = node.strokeWeight;
  }

  if (typeof node.cornerRadius === "number") {
    summary.cornerRadius = node.cornerRadius;
  }

  if (Array.isArray(node.effects) && node.effects.length) {
    summary.effects = node.effects
      .filter((effect) => effect && effect.visible !== false)
      .slice(0, 4)
      .map((effect) => ({
        type: effect.type,
        radius: effect.radius,
        offset: effect.offset,
        color: effect.color,
      }));
  }

  if (Array.isArray(node.children) && node.children.length && depth < MAX_FIGMA_TREE_DEPTH) {
    const children = [];

    for (const child of node.children) {
      const childSummary = summarizeNode(child, depth + 1, counter);

      if (childSummary) {
        children.push(childSummary);
      }

      if (counter.count >= MAX_FIGMA_TREE_NODES) {
        break;
      }
    }

    if (children.length) {
      summary.children = children;
    }
  }

  return summary;
}

export function parseFigmaNodeUrl(value) {
  let url;

  try {
    url = new URL(String(value || "").trim());
  } catch {
    throw new Error("Paste a valid Figma design URL.");
  }

  if (!/figma\.com$/i.test(url.hostname) && !/\.figma\.com$/i.test(url.hostname)) {
    throw new Error("Paste a valid Figma design URL.");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const designIndex = parts.findIndex((part) => part === "design" || part === "file");
  const fileKey = designIndex >= 0 ? parts[designIndex + 1] : "";
  const nodeId = String(url.searchParams.get("node-id") || "").replace(/-/g, ":").trim();

  if (!fileKey) {
    throw new Error("The Figma URL is missing a file key.");
  }

  if (!nodeId) {
    throw new Error("Copy a Figma URL for the specific frame or layer you want to import.");
  }

  return { fileKey, nodeId, url: url.toString() };
}

export async function fetchFigmaImportContext(figmaUrl) {
  const token = readFigmaAccessToken();

  if (!token) {
    throw new Error("Add FIGMA_ACCESS_TOKEN to Vercel Environment Variables before importing from Figma.");
  }

  const target = parseFigmaNodeUrl(figmaUrl);
  const headers = { "X-Figma-Token": token };
  const nodeResponse = await fetch(
    `${FIGMA_API_BASE_URL}/files/${encodeURIComponent(target.fileKey)}/nodes?ids=${encodeURIComponent(target.nodeId)}`,
    { headers },
  );

  if (!nodeResponse.ok) {
    const message = await nodeResponse.text().catch(() => "");
    throw new Error(message || "Unable to read that Figma node.");
  }

  const nodePayload = await nodeResponse.json().catch(() => ({}));
  const nodeDocument = nodePayload?.nodes?.[target.nodeId]?.document;

  if (!nodeDocument) {
    throw new Error("Figma did not return a node for that URL.");
  }

  const imageResponse = await fetch(
    `${FIGMA_API_BASE_URL}/images/${encodeURIComponent(target.fileKey)}?ids=${encodeURIComponent(target.nodeId)}&format=png&scale=2`,
    { headers },
  );
  const imagePayload = imageResponse.ok ? await imageResponse.json().catch(() => ({})) : {};
  const box = nodeDocument.absoluteBoundingBox || {};

  return {
    ...target,
    name: nodeDocument.name || "Figma import",
    type: nodeDocument.type || "",
    width: typeof box.width === "number" ? box.width : 0,
    height: typeof box.height === "number" ? box.height : 0,
    imageUrl: String(imagePayload?.images?.[target.nodeId] || "").trim(),
    nodeTree: summarizeNode(nodeDocument),
  };
}
