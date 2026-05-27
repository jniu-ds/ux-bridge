const FIGMA_API_BASE_URL = "https://api.figma.com/v1";
const MAX_FIGMA_TREE_NODES = 220;
const MAX_FIGMA_TREE_DEPTH = 10;
const MAX_FIGMA_ASSETS = 80;
const MAX_FIGMA_VECTOR_ASSETS = 64;
const VECTOR_ASSET_TYPES = new Set([
  "BOOLEAN_OPERATION",
  "ELLIPSE",
  "LINE",
  "POLYGON",
  "REGULAR_POLYGON",
  "STAR",
  "VECTOR",
]);
const VECTOR_CONTAINER_TYPES = new Set(["COMPONENT", "GROUP", "INSTANCE"]);

function readFigmaAccessToken(explicitToken = "") {
  return String(
    explicitToken ||
      process.env.UX_BRIDGE_FIGMA_ACCESS_TOKEN ||
      process.env.FIGMA_ACCESS_TOKEN ||
      process.env.FIGMA_TOKEN ||
      "",
  ).trim();
}

function roundNumber(value, precision = 100) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value * precision) / precision : undefined;
}

function compactColor(color = {}) {
  if (!color || typeof color !== "object") {
    return undefined;
  }

  return {
    r: roundNumber(color.r, 1000),
    g: roundNumber(color.g, 1000),
    b: roundNumber(color.b, 1000),
    a: roundNumber(color.a, 1000),
  };
}

function compactVector(vector = {}) {
  if (!vector || typeof vector !== "object") {
    return undefined;
  }

  const result = {};
  ["x", "y", "width", "height"].forEach((key) => {
    if (typeof vector[key] === "number") {
      result[key] = roundNumber(vector[key]);
    }
  });

  return Object.keys(result).length ? result : undefined;
}

function compactBox(box = {}, rootBox = null) {
  if (!box || typeof box !== "object") {
    return undefined;
  }

  const result = compactVector(box) || {};

  if (rootBox && typeof box.x === "number" && typeof rootBox.x === "number") {
    result.relativeX = roundNumber(box.x - rootBox.x);
  }

  if (rootBox && typeof box.y === "number" && typeof rootBox.y === "number") {
    result.relativeY = roundNumber(box.y - rootBox.y);
  }

  return Object.keys(result).length ? result : undefined;
}

function compactConstraint(constraints = {}) {
  if (!constraints || typeof constraints !== "object") {
    return undefined;
  }

  const result = {};
  ["horizontal", "vertical"].forEach((key) => {
    if (constraints[key]) {
      result[key] = constraints[key];
    }
  });

  return Object.keys(result).length ? result : undefined;
}

function compactTransform(transform) {
  if (!Array.isArray(transform)) {
    return undefined;
  }

  return transform
    .slice(0, 2)
    .map((row) => (Array.isArray(row) ? row.slice(0, 3).map((value) => roundNumber(value, 10000)) : row));
}

function compactPaint(paint = {}, assetContext = {}) {
  if (!paint || typeof paint !== "object" || paint.visible === false) {
    return null;
  }

  const base = {
    type: paint.type,
    opacity: typeof paint.opacity === "number" ? roundNumber(paint.opacity, 1000) : undefined,
    blendMode: paint.blendMode,
  };

  if (paint.type === "SOLID") {
    return {
      ...base,
      color: compactColor(paint.color),
      opacity: typeof paint.opacity === "number" ? roundNumber(paint.opacity, 1000) : 1,
    };
  }

  if (paint.type === "IMAGE") {
    return {
      ...base,
      imageRef: paint.imageRef,
      url: assetContext.imageFillUrls?.get?.(paint.imageRef),
      scaleMode: paint.scaleMode,
      imageTransform: compactTransform(paint.imageTransform),
      scalingFactor: roundNumber(paint.scalingFactor),
      rotation: roundNumber(paint.rotation),
      filters: paint.filters,
    };
  }

  if (String(paint.type || "").startsWith("GRADIENT")) {
    return {
      ...base,
      gradientHandlePositions: Array.isArray(paint.gradientHandlePositions)
        ? paint.gradientHandlePositions.map(compactVector)
        : undefined,
      gradientStops: Array.isArray(paint.gradientStops)
        ? paint.gradientStops.slice(0, 8).map((stop) => ({
            position: roundNumber(stop.position, 1000),
            color: compactColor(stop.color),
          }))
        : undefined,
    };
  }

  return base;
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
    "lineHeightPercent",
    "lineHeightUnit",
    "letterSpacing",
    "paragraphSpacing",
    "paragraphIndent",
    "textAlignHorizontal",
    "textAlignVertical",
    "textCase",
    "textDecoration",
  ].forEach((key) => {
    if (style[key] !== undefined && style[key] !== null) {
      result[key] = style[key];
    }
  });

  return Object.keys(result).length ? result : undefined;
}

function collectImagePaints(node, imageRefs = new Map()) {
  if (!node || typeof node !== "object") {
    return imageRefs;
  }

  const paintCollections = [node.fills, node.strokes].filter(Array.isArray);
  paintCollections.forEach((collection) => {
    collection.forEach((paint) => {
      if (paint?.type !== "IMAGE" || !paint.imageRef) {
        return;
      }

      const existing = imageRefs.get(paint.imageRef) || {
        imageRef: paint.imageRef,
        nodes: [],
        scaleMode: paint.scaleMode,
      };
      existing.nodes.push({
        id: node.id,
        name: node.name,
        type: node.type,
        childCount: Array.isArray(node.children) ? node.children.length : 0,
        hasTextDescendant: hasTextDescendant(node),
        box: compactBox(node.absoluteBoundingBox),
      });
      imageRefs.set(paint.imageRef, existing);
    });
  });

  if (Array.isArray(node.children)) {
    node.children.forEach((child) => collectImagePaints(child, imageRefs));
  }

  return imageRefs;
}

function getImageFillEntries(nodeDocument) {
  return Array.from(collectImagePaints(nodeDocument).values()).slice(0, MAX_FIGMA_ASSETS);
}

function hasTextDescendant(node = {}) {
  if (!node || typeof node !== "object") {
    return false;
  }

  if (node.type === "TEXT") {
    return true;
  }

  return Array.isArray(node.children) ? node.children.some((child) => hasTextDescendant(child)) : false;
}

function hasImagePaint(node = {}) {
  if (!node || typeof node !== "object") {
    return false;
  }

  const paintLists = [node.fills, node.strokes].filter(Array.isArray);
  return paintLists.some((paints) => paints.some((paint) => paint?.type === "IMAGE" && paint?.visible !== false));
}

function isLikelyVectorAssetNode(node = {}) {
  if (!node || typeof node !== "object" || node.visible === false) {
    return false;
  }

  const box = node.absoluteBoundingBox || {};
  const width = typeof box.width === "number" ? box.width : 0;
  const height = typeof box.height === "number" ? box.height : 0;

  if (!width || !height || width > 768 || height > 768) {
    return false;
  }

  const name = String(node.name || "").toLowerCase();
  const isNamedLikeIcon = /\b(icon|svg|glyph|symbol|logo|mark|chevron|arrow|menu|nav|tab|battery|wifi|signal|home|scan|learn|shop|history|close|share|upload|x)\b/.test(
    name,
  );
  const isNamedLikeComplexVector = /\b(gauge|ring|arc|circle|dial|score|scale|progress|meter|chart|graph|spark|constellation|fingerprint|symbol|indicator|radial)\b/.test(
    name,
  );
  const hasExplicitSvgExport = Array.isArray(node.exportSettings)
    ? node.exportSettings.some((setting) => String(setting?.format || "").toUpperCase() === "SVG")
    : false;

  if (hasTextDescendant(node) || hasImagePaint(node)) {
    return false;
  }

  if (VECTOR_ASSET_TYPES.has(node.type) && (width <= 256 || height <= 256 || isNamedLikeComplexVector || hasExplicitSvgExport)) {
    return true;
  }

  if (VECTOR_CONTAINER_TYPES.has(node.type)) {
    return isNamedLikeIcon || isNamedLikeComplexVector || hasExplicitSvgExport;
  }

  return false;
}

function collectVectorAssetNodes(node, vectorNodes = []) {
  if (!node || typeof node !== "object" || vectorNodes.length >= MAX_FIGMA_VECTOR_ASSETS) {
    return vectorNodes;
  }

  if (isLikelyVectorAssetNode(node)) {
    vectorNodes.push({
      id: node.id,
      name: node.name,
      type: node.type,
      box: compactBox(node.absoluteBoundingBox),
    });
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      collectVectorAssetNodes(child, vectorNodes);

      if (vectorNodes.length >= MAX_FIGMA_VECTOR_ASSETS) {
        break;
      }
    }
  }

  return vectorNodes;
}

function summarizeNode(node, depth = 0, counter = { count: 0 }, rootBox = null, assetContext = {}) {
  if (!node || typeof node !== "object" || counter.count >= MAX_FIGMA_TREE_NODES || depth > MAX_FIGMA_TREE_DEPTH) {
    return null;
  }

  counter.count += 1;

  const box = node.absoluteBoundingBox || {};
  const currentRootBox = rootBox || box;
  const summary = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible !== false,
    box: compactBox(box, currentRootBox),
    renderBounds: compactBox(node.absoluteRenderBounds, currentRootBox),
    constraints: compactConstraint(node.constraints),
    opacity: roundNumber(node.opacity, 1000),
    blendMode: node.blendMode,
    clipsContent: node.clipsContent,
    preserveRatio: node.preserveRatio,
    layoutAlign: node.layoutAlign,
    layoutGrow: roundNumber(node.layoutGrow),
    layoutSizingHorizontal: node.layoutSizingHorizontal,
    layoutSizingVertical: node.layoutSizingVertical,
    renderedAssetUrl: assetContext.nodeExportUrls?.get?.(node.id),
    vectorAssetUrl: assetContext.vectorAssetUrls?.get?.(node.id),
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
      counterAxisSpacing: node.counterAxisSpacing,
      primaryAxisSizingMode: node.primaryAxisSizingMode,
      counterAxisSizingMode: node.counterAxisSizingMode,
      strokesIncludedInLayout: node.strokesIncludedInLayout,
      paddingLeft: node.paddingLeft,
      paddingRight: node.paddingRight,
      paddingTop: node.paddingTop,
      paddingBottom: node.paddingBottom,
    };
  }

  const fills = Array.isArray(node.fills)
    ? node.fills.map((paint) => compactPaint(paint, assetContext)).filter(Boolean).slice(0, 4)
    : [];
  const strokes = Array.isArray(node.strokes)
    ? node.strokes.map((paint) => compactPaint(paint, assetContext)).filter(Boolean).slice(0, 4)
    : [];

  if (fills.length) {
    summary.fills = fills;
  }

  if (strokes.length) {
    summary.strokes = strokes;
    summary.strokeWeight = node.strokeWeight;
    summary.strokeAlign = node.strokeAlign;
    summary.strokeDashes = node.strokeDashes;
  }

  if (typeof node.cornerRadius === "number") {
    summary.cornerRadius = node.cornerRadius;
  }

  ["topLeftRadius", "topRightRadius", "bottomRightRadius", "bottomLeftRadius"].forEach((key) => {
    if (typeof node[key] === "number") {
      summary[key] = roundNumber(node[key]);
    }
  });

  if (Array.isArray(node.effects) && node.effects.length) {
    summary.effects = node.effects
      .filter((effect) => effect && effect.visible !== false)
      .slice(0, 4)
      .map((effect) => ({
        type: effect.type,
        radius: roundNumber(effect.radius),
        offset: compactVector(effect.offset),
        spread: roundNumber(effect.spread),
        color: compactColor(effect.color),
      }));
  }

  if (node.styles && typeof node.styles === "object") {
    summary.styles = node.styles;
  }

  if (Array.isArray(node.exportSettings) && node.exportSettings.length) {
    summary.exportSettings = node.exportSettings.slice(0, 4).map((setting) => ({
      format: setting.format,
      suffix: setting.suffix,
      constraint: setting.constraint,
    }));
  }

  if (Array.isArray(node.children) && node.children.length && depth < MAX_FIGMA_TREE_DEPTH) {
    const children = [];

    for (const child of node.children) {
      const childSummary = summarizeNode(child, depth + 1, counter, currentRootBox, assetContext);

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

function buildAssetReferences(imageFillEntries, imageFillPayload = {}, nodeExportPayload = {}, vectorExportPayload = {}) {
  const imageFillUrls = imageFillPayload?.images || {};
  const nodeExportUrls = nodeExportPayload?.images || {};
  const vectorExportUrls = vectorExportPayload?.images || {};
  const assets = [];

  imageFillEntries.forEach((asset) => {
    const imageFillUrl = String(imageFillUrls[asset.imageRef] || "").trim();

    if (imageFillUrl) {
      assets.push({
        kind: "image-fill",
        imageRef: asset.imageRef,
        url: imageFillUrl,
        scaleMode: asset.scaleMode,
        nodes: asset.nodes.slice(0, 8),
      });
    }

    asset.nodes.slice(0, 4).forEach((node) => {
      const nodeExportUrl = String(nodeExportUrls[node.id] || "").trim();

      if (!nodeExportUrl || node.hasTextDescendant) {
        return;
      }

      assets.push({
        kind: "rendered-node",
        nodeId: node.id,
        name: node.name,
        type: node.type,
        childCount: node.childCount,
        hasTextDescendant: node.hasTextDescendant,
        box: node.box,
        sourceImageRef: asset.imageRef,
        url: nodeExportUrl,
      });
    });
  });

  Object.entries(vectorExportUrls).forEach(([nodeId, url]) => {
    const trimmedUrl = String(url || "").trim();

    if (!trimmedUrl || assets.some((asset) => asset.nodeId === nodeId && asset.url === trimmedUrl)) {
      return;
    }

    assets.push({
      kind: "svg-icon",
      nodeId,
      url: trimmedUrl,
    });
  });

  return [
    ...assets.filter((asset) => asset.kind === "svg-icon"),
    ...assets.filter((asset) => asset.kind !== "svg-icon"),
  ].slice(0, MAX_FIGMA_ASSETS);
}

function buildFigmaAssetPlan(nodeDocument, assets = []) {
  const imageFillAssets = assets.filter((asset) => asset.kind === "image-fill");
  const renderedNodeAssets = assets.filter((asset) => asset.kind === "rendered-node");
  const svgIconAssets = assets.filter((asset) => asset.kind === "svg-icon");
  const rootBox = compactBox(nodeDocument?.absoluteBoundingBox) || {};

  return {
    nativeFrame: {
      id: nodeDocument?.id,
      name: nodeDocument?.name,
      type: nodeDocument?.type,
      width: rootBox.width,
      height: rootBox.height,
      instruction:
        "At this exact width, position the generated preview from the Figma node's top-left origin and match the screenshot before adding wider/narrower responsive rules.",
    },
    backgroundImages: imageFillAssets.slice(0, 24).map((asset) => ({
      imageRef: asset.imageRef,
      url: asset.url,
      scaleMode: asset.scaleMode,
      nodes: (asset.nodes || []).slice(0, 6).map((node) => ({
        id: node.id,
        name: node.name,
        type: node.type,
        childCount: node.childCount,
        hasTextDescendant: node.hasTextDescendant,
        box: node.box,
        usage: node.hasTextDescendant || node.childCount
          ? "Use this image as that node's background/fill only, then recreate editable child text and controls once."
          : "Use this image as the node's visual content.",
      })),
    })),
    atomicRenderedImages: renderedNodeAssets.slice(0, 18).map((asset) => ({
      nodeId: asset.nodeId,
      name: asset.name,
      type: asset.type,
      url: asset.url,
      box: asset.box,
      instruction:
        "Render this exported node once as an img/background and do not recreate this same visual from child shapes.",
    })),
    svgVectors: svgIconAssets.slice(0, 36).map((asset) => ({
      nodeId: asset.nodeId,
      name: asset.name,
      type: asset.type,
      url: asset.url,
      box: asset.box,
      instruction:
        "Use this SVG asset exactly for icons, rings, gauges, arcs, logos, and vector artwork. Do not approximate it with CSS doodles.",
    })),
  };
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

export async function fetchFigmaImportContext(figmaUrl, options = {}) {
  const token = readFigmaAccessToken(options.accessToken);

  if (!token) {
    throw new Error("Connect your Figma account before importing from Figma.");
  }

  const target = parseFigmaNodeUrl(figmaUrl);
  const headers =
    options.authScheme === "bearer" ? { Authorization: `Bearer ${token}` } : { "X-Figma-Token": token };
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

  const imageFillEntries = getImageFillEntries(nodeDocument);
  const vectorAssetNodes = collectVectorAssetNodes(nodeDocument);
  const imageFillResponse = await fetch(`${FIGMA_API_BASE_URL}/files/${encodeURIComponent(target.fileKey)}/images`, {
    headers,
  });
  const imageFillPayload = imageFillResponse.ok ? await imageFillResponse.json().catch(() => ({})) : {};
  const imageFillNodeIds = Array.from(
    new Set(imageFillEntries.flatMap((asset) => asset.nodes.map((node) => node.id)).filter(Boolean)),
  ).slice(0, MAX_FIGMA_ASSETS);
  let nodeExportPayload = {};
  let vectorExportPayload = {};

  if (imageFillNodeIds.length) {
    const nodeExportResponse = await fetch(
      `${FIGMA_API_BASE_URL}/images/${encodeURIComponent(target.fileKey)}?ids=${encodeURIComponent(imageFillNodeIds.join(","))}&format=png&scale=2`,
      { headers },
    );
    nodeExportPayload = nodeExportResponse.ok ? await nodeExportResponse.json().catch(() => ({})) : {};
  }

  const vectorNodeIds = vectorAssetNodes.map((node) => node.id).filter(Boolean);

  if (vectorNodeIds.length) {
    const vectorExportResponse = await fetch(
      `${FIGMA_API_BASE_URL}/images/${encodeURIComponent(target.fileKey)}?ids=${encodeURIComponent(vectorNodeIds.join(","))}&format=svg`,
      { headers },
    );
    const payload = vectorExportResponse.ok ? await vectorExportResponse.json().catch(() => ({})) : {};
    const exportedUrls = payload?.images || {};
    vectorExportPayload = {
      images: Object.fromEntries(
        vectorAssetNodes
          .map((node) => [node.id, String(exportedUrls[node.id] || "").trim(), node])
          .filter(([, url]) => Boolean(url))
          .map(([nodeId, url, node]) => [
            nodeId,
            {
              url,
              name: node.name,
              type: node.type,
              box: node.box,
            },
          ]),
      ),
    };
  }

  const imageResponse = await fetch(
    `${FIGMA_API_BASE_URL}/images/${encodeURIComponent(target.fileKey)}?ids=${encodeURIComponent(target.nodeId)}&format=png&scale=2`,
    { headers },
  );
  const imagePayload = imageResponse.ok ? await imageResponse.json().catch(() => ({})) : {};
  const box = nodeDocument.absoluteBoundingBox || {};
  const assets = buildAssetReferences(imageFillEntries, imageFillPayload, nodeExportPayload, {
    images: Object.fromEntries(
      Object.entries(vectorExportPayload.images || {}).map(([nodeId, asset]) => [nodeId, asset.url]),
    ),
  }).map((asset) => {
    if (asset.kind !== "svg-icon") {
      return asset;
    }

    const vectorAsset = vectorExportPayload.images?.[asset.nodeId] || {};
    return {
      ...asset,
      name: vectorAsset.name,
      type: vectorAsset.type,
      box: vectorAsset.box,
    };
  });
  const assetContext = {
    imageFillUrls: new Map(
      assets
        .filter((asset) => asset.kind === "image-fill" && asset.imageRef && asset.url)
        .map((asset) => [asset.imageRef, asset.url]),
    ),
    nodeExportUrls: new Map(
      assets
        .filter((asset) => asset.kind === "rendered-node" && asset.nodeId && asset.url)
        .map((asset) => [asset.nodeId, asset.url]),
    ),
    vectorAssetUrls: new Map(
      assets
        .filter((asset) => asset.kind === "svg-icon" && asset.nodeId && asset.url)
        .map((asset) => [asset.nodeId, asset.url]),
    ),
  };

  return {
    ...target,
    name: nodeDocument.name || "Figma import",
    type: nodeDocument.type || "",
    width: typeof box.width === "number" ? box.width : 0,
    height: typeof box.height === "number" ? box.height : 0,
    imageUrl: String(imagePayload?.images?.[target.nodeId] || "").trim(),
    nodeTree: summarizeNode(nodeDocument, 0, { count: 0 }, null, assetContext),
    assetPlan: buildFigmaAssetPlan(nodeDocument, assets),
    assets,
    components: nodePayload?.components || undefined,
    componentSets: nodePayload?.componentSets || undefined,
    styles: nodePayload?.styles || undefined,
  };
}
