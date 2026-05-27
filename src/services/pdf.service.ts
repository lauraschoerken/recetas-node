import { PrismaClient } from "@prisma/client";
import PDFDocument from "pdfkit";

const prisma = new PrismaClient();

// ──────────────────────────────────────────
// i18n labels for PDF
// ──────────────────────────────────────────
const PDF_LABELS = {
  es: {
    servings: "porciones",
    description: "Descripción",
    ingredients: "Ingredientes",
    mainIngredients: "INGREDIENTES PRINCIPALES",
    neededPreps: "PREPARACIONES NECESARIAS",
    linkedRecipe: "Receta enlazada",
    linkedRecipeHint: "Preparación previa necesaria",
    neededServings: "Necesitas {{count}} raciones",
    instructions: "Instrucciones",
    traditionalRecipe: "RECETA TRADICIONAL",
    time: "Tiempo",
    difficulty: "Dificultad",
    easy: "Fácil",
    medium: "Media",
    hard: "Difícil",
    min: "min",
    hr: "h",
    author: "Por",
    public: "Pública",
    private: "Privada",
    recipeUnit: "receta",
    subRecipeNote: "se descargará otro PDF con esta receta",
    footer: "Exportado desde Recetas App",
  },
  en: {
    servings: "servings",
    description: "Description",
    ingredients: "Ingredients",
    mainIngredients: "MAIN INGREDIENTS",
    neededPreps: "REQUIRED PREPARATIONS",
    linkedRecipe: "Linked recipe",
    linkedRecipeHint: "Previous preparation needed",
    neededServings: "You need {{count}} servings",
    instructions: "Instructions",
    traditionalRecipe: "TRADITIONAL RECIPE",
    time: "Time",
    difficulty: "Difficulty",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    min: "min",
    hr: "h",
    author: "By",
    public: "Public",
    private: "Private",
    recipeUnit: "recipe",
    subRecipeNote: "another PDF will be downloaded for this recipe",
    footer: "Exported from Recetas App",
  },
} as const;

type PdfLang = keyof typeof PDF_LABELS;
function getLabels(lang?: string) {
  return PDF_LABELS[(lang === "en" ? "en" : "es") as PdfLang];
}

function splitInstructionSteps(raw: string | null | undefined): string[] {
  const value = raw || "";
  const separatorPattern = /\r?\n---\r?\n/;
  const fallbackPattern = /\r?\n/;

  return (
    separatorPattern.test(value)
      ? value.split(separatorPattern)
      : value.split(fallbackPattern)
  )
    .map((s) => s.trim())
    .map((s) => s.replace(/^\d+\s*[\)\.\-:]\s*/, "").trim())
    .filter(Boolean);
}

// ──────────────────────────────────────────
// Image helper — silently returns null on any error
// ──────────────────────────────────────────
// ──────────────────────────────────────────
// Markdown → plain text with preview-like formatting for PDF rendering
// ──────────────────────────────────────────
function mdToPlain(md: string): string {
  return md
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => {
      let normalized = line.trim();
      if (!normalized) return "";

      normalized = normalized
        .replace(/^#{1,6}\s+/, "")
        .replace(/^>\s?/, "")
        .replace(/^!\[(.*?)\]\((.*?)\)$/g, "$1")
        .replace(/^!\s*/, "")
        .replace(/\[(.+?)\]\(.+?\)/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/__([^_]+)__/g, "$1")
        .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")
        .replace(/(?<!_)_([^_]+)_(?!_)/g, "$1")
        .replace(/~~([^~]+)~~/g, "$1");

      if (/^[-*+]\s+\[( |x|X)\]\s+/.test(normalized)) {
        normalized = normalized.replace(/^[-*+]\s+\[( |x|X)\]\s+/, "");
      } else if (/^\d+[.)]\s+/.test(normalized)) {
        normalized = normalized.replace(/^(\d+)[.)]\s+/, "$1. ");
      } else if (/^[-*+]\s+/.test(normalized)) {
        normalized = normalized.replace(/^[-*+]\s+/, "• ");
      }

      return normalized;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mdToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    html.push(`<p>${paragraph.join("<br>")}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = null;
  };

  const inline = (value: string) =>
    escapeHtml(value)
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
      .replace(/(?<!_)_([^_]+)_(?!_)/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/~~([^~]+)~~/g, "<del>$1</del>");

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = Math.min(6, heading[1].length);
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    const image = line.match(/^!\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/i);
    if (image) {
      flushParagraph();
      closeList();
      html.push(
        `<figure class="md-image"><img src="${escapeHtml(image[2])}" alt="${escapeHtml(image[1])}">${
          image[1] ? `<figcaption>${escapeHtml(image[1])}</figcaption>` : ""
        }</figure>`,
      );
      continue;
    }

    const taskItem = line.match(/^[-*+]\s+\[( |x|X)\]\s+(.*)$/);
    if (taskItem) {
      flushParagraph();
      if (listType !== "ul") {
        closeList();
        listType = "ul";
        html.push("<ul>");
      }
      const marker = taskItem[1].toLowerCase() === "x" ? "☑" : "☐";
      html.push(
        `<li class="task-item"><span class="task-marker">${marker}</span><span>${inline(taskItem[2])}</span></li>`,
      );
      continue;
    }

    const ulItem = line.match(/^[-*+]\s+(.*)$/);
    if (ulItem) {
      flushParagraph();
      if (listType !== "ul") {
        closeList();
        listType = "ul";
        html.push("<ul>");
      }
      html.push(`<li>${inline(ulItem[1])}</li>`);
      continue;
    }

    const olItem = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (olItem) {
      flushParagraph();
      if (listType !== "ol") {
        closeList();
        listType = "ol";
        html.push("<ol>");
      }
      html.push(`<li>${inline(olItem[2])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(inline(line.replace(/^!\s*/, "")));
  }

  flushParagraph();
  closeList();

  return html.join("\n");
}

function htmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<\/li>\s*<li>/gi, "\n")
    .replace(/<li>/gi, "")
    .replace(/<\/li>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | {
      type: "list";
      ordered: boolean;
      items: { text: string; checked?: boolean | null }[];
    }
  | { type: "paragraph"; lines: string[] }
  | { type: "image"; alt: string; url: string };

function parseMarkdownBlocks(md: string): MarkdownBlock[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: {
    type: "list";
    ordered: boolean;
    items: { text: string; checked?: boolean | null }[];
  } | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ type: "paragraph", lines: [...paragraph] });
    paragraph = [];
  };

  const flushList = () => {
    if (!list || list.items.length === 0) return;
    blocks.push(list);
    list = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const imageMatch = line.match(/^!\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/i);
    if (imageMatch) {
      flushParagraph();
      flushList();
      blocks.push({ type: "image", alt: imageMatch[1], url: imageMatch[2] });
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: Math.min(4, headingMatch[1].length),
        text: mdToPlain(headingMatch[2]),
      });
      continue;
    }

    const taskMatch = line.match(/^[-*+]\s+\[( |x|X)\]\s+(.*)$/);
    if (taskMatch) {
      flushParagraph();
      if (!list || list.ordered) {
        flushList();
        list = { type: "list", ordered: false, items: [] };
      }
      list.items.push({
        text: mdToPlain(taskMatch[2]),
        checked: taskMatch[1].toLowerCase() === "x",
      });
      continue;
    }

    const orderedMatch = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (!list || !list.ordered) {
        flushList();
        list = { type: "list", ordered: true, items: [] };
      }
      list.items.push({ text: mdToPlain(orderedMatch[2]), checked: null });
      continue;
    }

    const bulletMatch = line.match(/^[-*+]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      if (!list || list.ordered) {
        flushList();
        list = { type: "list", ordered: false, items: [] };
      }
      list.items.push({ text: mdToPlain(bulletMatch[1]), checked: null });
      continue;
    }

    flushList();
    paragraph.push(mdToPlain(line.replace(/^!\s*/, "")));
  }

  flushParagraph();
  flushList();

  return blocks;
}

async function renderMarkdownDescriptionPages(
  doc: any,
  recipe: any,
  options: { lang?: string },
): Promise<void> {
  if (!recipe.description?.trim()) return;

  const blocks = parseMarkdownBlocks(recipe.description);
  if (blocks.length === 0) return;

  const lbl = getLabels(options.lang);
  const pageW = 595.28;
  const left = 26;
  const contentW = pageW - left * 2;
  const darkBlue = "#1F3A5F";
  const textDark = "#222222";
  const bodyMuted = "#5a6472";
  const border = "#d7dbe3";
  const surface = "#ffffff";
  const footerY = 770;
  const titleFont = "Times-Bold";
  const bodyFont = "Helvetica";
  const bodyBold = "Helvetica-Bold";

  let blockIndex = 0;

  while (blockIndex < blocks.length) {
    doc.addPage();
    doc.rect(0, 0, pageW, 42).fill(darkBlue);
    doc
      .font(titleFont)
      .fontSize(15)
      .fillColor("#ffffff")
      .text(recipe.title || "", left + 8, 8, {
        width: contentW - 16,
        lineBreak: false,
      });
    doc
      .font(bodyBold)
      .fontSize(8)
      .fillColor("#cdd9ee")
      .text(lbl.description, left + 8, 24, {
        width: contentW - 16,
        lineBreak: false,
      });

    let y = 58;
    const maxY = 812;

    while (blockIndex < blocks.length) {
      const block = blocks[blockIndex];

      if (block.type === "image") {
        const imageBuffer = await fetchImageBuffer(block.url);
        if (!imageBuffer) {
          blockIndex += 1;
          continue;
        }

        let image;
        try {
          image = doc.openImage(imageBuffer);
        } catch {
          blockIndex += 1;
          continue;
        }

        const maxWidth = contentW * 0.62;
        const maxHeight = 210;
        const scale = Math.min(
          maxWidth / image.width,
          maxHeight / image.height,
          1,
        );
        const drawW = image.width * scale;
        const drawH = image.height * scale;
        const drawX = left + (contentW - drawW) / 2;

        if (y + drawH + 22 > maxY && y > 58) break;

        doc
          .roundedRect(drawX, y, drawW, drawH, 12)
          .fillAndStroke(surface, border);
        doc.image(imageBuffer, drawX, y, {
          fit: [drawW, drawH],
          align: "center",
          valign: "center",
        });
        y += drawH + 10;
        if (block.alt) {
          doc
            .font(bodyFont)
            .fontSize(9)
            .fillColor(bodyMuted)
            .text(block.alt, drawX, y, { width: drawW, align: "center" });
          y += 18;
        }
        blockIndex += 1;
        continue;
      }

      if (block.type === "heading") {
        const fontSize = block.level === 1 ? 18 : block.level === 2 ? 15 : 13;
        const height = doc.heightOfString(block.text, {
          width: contentW,
          fontSize,
          lineGap: 1,
        });
        if (y + height + 12 > maxY && y > 58) break;
        doc
          .font(titleFont)
          .fontSize(fontSize)
          .fillColor(textDark)
          .text(block.text, left, y, { width: contentW, lineGap: 1 });
        y += height + 10;
        blockIndex += 1;
        continue;
      }

      if (block.type === "paragraph") {
        const text = block.lines.join("\n");
        const height = doc.heightOfString(text, {
          fontSize: 11,
          lineGap: 3,
        });
        if (y + height + 8 > maxY && y > 58) break;
        doc
          .font(bodyFont)
          .fontSize(11)
          .fillColor(textDark)
          .text(text, left, y, { width: contentW, lineGap: 3 });
        y += height + 10;
        blockIndex += 1;
        continue;
      }

      const listHeights = block.items.map((item, index) => {
        const prefix = block.ordered
          ? `${index + 1}. `
          : item.checked === true
            ? "☑ "
            : item.checked === false
              ? "☐ "
              : "• ";
        return {
          prefix,
          height: doc.heightOfString(item.text, {
            width: contentW - 24,
            fontSize: 11,
            lineGap: 2,
          }),
        };
      });
      const totalHeight = listHeights.reduce(
        (sum, item) => sum + item.height + 6,
        0,
      );
      if (y + totalHeight > maxY && y > 58) break;

      for (let index = 0; index < block.items.length; index += 1) {
        const item = block.items[index];
        const prefix = listHeights[index].prefix;
        doc
          .font(bodyBold)
          .fontSize(11)
          .fillColor(textDark)
          .text(prefix, left, y, { lineBreak: false });
        doc
          .font(bodyFont)
          .fontSize(11)
          .fillColor(textDark)
          .text(item.text, left + 18, y, { width: contentW - 18, lineGap: 2 });
        y += listHeights[index].height + 6;
      }

      y += 4;
      blockIndex += 1;
    }

    doc
      .font(bodyFont)
      .fontSize(8)
      .fillColor(bodyMuted)
      .text(lbl.footer, left, footerY, { align: "center", width: contentW });
  }
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    if (!url || !url.startsWith("http")) return null;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: {
        "User-Agent": "RecetasApp/1.0 (+https://recetas-app.local)",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

type ExportIngredientMeta = { name: string; quantity: number; unit: string };
type ExportRequiredRecipeMeta = {
  id?: number;
  title: string;
  servings: number;
};
type ExportRecipeMeta = {
  title: string;
  description?: string | null;
  instructions?: string | null;
  imageUrl?: string | null;
  servings: number;
  cookTimeMinutes?: number | null;
  difficulty?: string | null;
  ingredients: ExportIngredientMeta[];
  requiredRecipes: ExportRequiredRecipeMeta[];
};

type ExportPdfPayload = {
  app: "recetas-app";
  version: 2;
  recipes: ExportRecipeMeta[];
};

const METADATA_START = "RECETAS_EXPORT_JSON_START:";
const METADATA_END = ":RECETAS_EXPORT_JSON_END";

function appendMetadataToBuffer(
  buffer: Buffer,
  payload?: ExportPdfPayload,
): Buffer {
  if (!payload) return buffer;
  // Appended after %%EOF — PDF viewers ignore trailing data, parser finds it via indexOf.
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64",
  );
  const marker = `\n${METADATA_START}${encoded}${METADATA_END}\n`;
  return Buffer.concat([buffer, Buffer.from(marker, "ascii")]);
}

function sanitizeNumber(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getStepCardHeight(doc: any, step: string, textWidth: number): number {
  return Math.max(34, doc.heightOfString(step, { width: textWidth }) + 14);
}

function countFittingSteps(
  doc: any,
  steps: string[],
  textWidth: number,
  availableHeight: number,
): number {
  let usedHeight = 0;
  let count = 0;

  for (const step of steps) {
    const cardH = getStepCardHeight(doc, step, textWidth);
    if (usedHeight + cardH > availableHeight) break;
    usedHeight += cardH + 8;
    count += 1;
  }

  return count;
}

function countFittingDenseSteps(
  doc: any,
  steps: string[],
  textWidth: number,
  availableHeight: number,
): number {
  let usedHeight = 0;
  let count = 0;

  for (let index = 0; index < steps.length; index += 1) {
    const stepH = Math.max(
      12,
      doc.heightOfString(steps[index], {
        width: textWidth,
        fontSize: 9,
        lineGap: 0.2,
      }),
    );
    if (usedHeight + stepH > availableHeight) break;
    usedHeight += stepH + 4;
    count += 1;
  }

  return count;
}

function drawDenseSteps(
  doc: any,
  steps: string[],
  options: {
    startIndex: number;
    startNumber: number;
    x: number;
    y: number;
    width: number;
    height: number;
    textDark: string;
    titleColor: string;
    bodyFont: string;
    bodyBold: string;
  },
): { nextIndex: number; nextNumber: number } {
  const { x, y, width, height, textDark, titleColor, bodyFont, bodyBold } =
    options;
  let currentY = y;
  let stepIndex = options.startIndex;
  let stepNumber = options.startNumber;

  while (stepIndex < steps.length) {
    const stepLabel = `${stepNumber}.`;
    const numberW =
      doc.widthOfString(stepLabel, { font: bodyBold, fontSize: 9 }) + 6;
    const textW = width - numberW;
    const stepH = Math.max(
      12,
      doc.heightOfString(steps[stepIndex], {
        width: textW,
        fontSize: 9,
        lineGap: 0.2,
      }),
    );

    if (currentY + stepH > y + height) break;

    doc
      .font(bodyBold)
      .fontSize(9)
      .fillColor(titleColor)
      .text(stepLabel, x, currentY, {
        width: numberW,
        lineBreak: false,
      });
    doc
      .font(bodyFont)
      .fontSize(9)
      .fillColor(textDark)
      .text(steps[stepIndex], x + numberW, currentY, {
        width: textW,
        lineGap: 0.2,
      });

    currentY += stepH + 4;
    stepIndex += 1;
    stepNumber += 1;
  }

  return { nextIndex: stepIndex, nextNumber: stepNumber };
}

function drawStepCards(
  doc: any,
  steps: string[],
  options: {
    startIndex: number;
    startNumber: number;
    x: number;
    y: number;
    width: number;
    height: number;
    darkBlue: string;
    textDark: string;
    bodyFont: string;
    bodyBold: string;
  },
): { nextIndex: number; nextNumber: number } {
  const { x, y, width, height, darkBlue, textDark, bodyFont, bodyBold } =
    options;
  let currentY = y;
  let stepIndex = options.startIndex;
  let stepNumber = options.startNumber;

  while (stepIndex < steps.length) {
    const step = steps[stepIndex];
    const cardH = getStepCardHeight(doc, step, width - 74);
    if (currentY + cardH > y + height) break;

    doc
      .roundedRect(x + 10, currentY, width - 20, cardH, 12)
      .fillAndStroke("#ffffff", "#d7dbe3");
    doc
      .lineWidth(1.1)
      .strokeColor("#d7dbe3")
      .roundedRect(x + 10, currentY, width - 20, cardH, 12)
      .stroke();

    doc.roundedRect(x + 20, currentY + 8, 28, 22, 9).fill(darkBlue);
    doc
      .font(bodyBold)
      .fontSize(11)
      .fillColor("#ffffff")
      .text(String(stepNumber), x + 20, currentY + 14, {
        lineBreak: false,
        align: "center",
        width: 28,
      });

    doc
      .font(bodyFont)
      .fontSize(11)
      .fillColor(textDark)
      .text(step, x + 58, currentY + 9, {
        width: width - 74,
        height: cardH - 14,
        lineGap: 1.3,
      });

    currentY += cardH + 8;
    stepIndex += 1;
    stepNumber += 1;
  }

  return { nextIndex: stepIndex, nextNumber: stepNumber };
}

function buildRecipeExportMeta(
  recipe: any,
  selectedOptions: Record<number, number>,
): ExportRecipeMeta {
  const ingredients: ExportIngredientMeta[] = [];
  const requiredRecipes: ExportRequiredRecipeMeta[] = [];

  for (const ri of recipe.ingredients || []) {
    ingredients.push({
      name: ri.ingredient?.name || "",
      quantity: sanitizeNumber(ri.quantity, 0),
      unit: ri.unit || ri.ingredient?.unit || "g",
    });
  }

  for (const comp of recipe.components || []) {
    const selectedOptId = selectedOptions[comp.id];
    const opt = selectedOptId
      ? comp.options.find((o: any) => o.id === selectedOptId)
      : comp.options.find((o: any) => o.isDefault) || comp.options[0];
    if (!opt) continue;

    if (opt.ingredient) {
      ingredients.push({
        name: opt.ingredient.name,
        quantity: sanitizeNumber(opt.quantity, 0),
        unit: opt.unit || opt.ingredient.unit || "g",
      });
    } else if (opt.recipe) {
      requiredRecipes.push({
        id: opt.recipe.id,
        title: opt.recipe.title,
        servings: sanitizeNumber(opt.recipeServings, 1),
      });
    }
  }

  return {
    title: recipe.title,
    description: recipe.description || null,
    instructions: recipe.instructions || null,
    imageUrl: recipe.imageUrl || null,
    servings: sanitizeNumber(recipe.servings, 4),
    cookTimeMinutes: recipe.cookTimeMinutes ?? null,
    difficulty: recipe.difficulty ?? null,
    ingredients,
    requiredRecipes,
  };
}

// ──────────────────────────────────────────
// Core renderer — draws one recipe into an open PDFDocument
// ──────────────────────────────────────────
async function renderRecipePage(
  doc: any,
  recipe: any,
  options: {
    selectedOptions?: Record<number, number>;
    showAuthor?: boolean;
    showVisibility?: boolean;
    lang?: string;
  },
): Promise<void> {
  const {
    selectedOptions = {},
    showAuthor = false,
    showVisibility = false,
  } = options;
  const lbl = getLabels(options.lang);

  const pageW = 595.28;
  const pageH = 841.89;
  const left = 26;
  const contentW = pageW - left * 2;
  const darkBlue = "#1F3A5F";
  const softGray = "#F5F5F5";
  const textDark = "#222222";
  const bodyMuted = "#5a6472";
  const accentGold = "#C9A35B";
  const borderSoft = "#d7dbe3";
  const headerMuted = "#cdd9ee";
  const pageBottom = pageH - 72;

  const TITLE_FONT = "Times-Bold";
  const BODY_FONT = "Helvetica";
  const BODY_BOLD = "Helvetica-Bold";

  const formatCookTime = (minutes?: number | null) => {
    if (!minutes || minutes <= 0) return null;
    if (minutes < 60) return `${minutes} ${lbl.min}`;
    const hours = Math.round((minutes / 60) * 10) / 10;
    return `${hours} ${lbl.hr}`;
  };

  const difficultyText =
    recipe.difficulty === "easy"
      ? lbl.easy
      : recipe.difficulty === "medium"
        ? lbl.medium
        : recipe.difficulty === "hard"
          ? lbl.hard
          : null;

  const recipeImageBuffer = recipe.imageUrl
    ? await fetchImageBuffer(recipe.imageUrl)
    : null;

  const descriptionBlocks = recipe.description?.trim()
    ? parseMarkdownBlocks(recipe.description)
    : [];

  const drawChipIcon = (
    kind: "time" | "servings" | "difficulty",
    x: number,
    y: number,
  ) => {
    doc.save();
    doc.lineWidth(1.1).strokeColor("#dfe8f8").fillColor("#dfe8f8");
    if (kind === "time") {
      // Clock
      doc.circle(x + 6, y + 6, 5).stroke();
      doc
        .moveTo(x + 6, y + 6)
        .lineTo(x + 6, y + 3.5)
        .stroke();
      doc
        .moveTo(x + 6, y + 6)
        .lineTo(x + 8.2, y + 7.4)
        .stroke();
    } else if (kind === "servings") {
      // Plate + fork (servings)
      doc.circle(x + 5.6, y + 6, 3.9).stroke();
      doc.circle(x + 5.6, y + 6, 2.3).stroke();
      // Fork at right
      doc
        .moveTo(x + 10.3, y + 2.2)
        .lineTo(x + 10.3, y + 9.7)
        .stroke();
      doc
        .moveTo(x + 9.4, y + 2.2)
        .lineTo(x + 9.4, y + 4.3)
        .stroke();
      doc
        .moveTo(x + 10.3, y + 2.2)
        .lineTo(x + 10.3, y + 4.3)
        .stroke();
      doc
        .moveTo(x + 11.2, y + 2.2)
        .lineTo(x + 11.2, y + 4.3)
        .stroke();
    } else {
      // Star for difficulty
      doc
        .moveTo(x + 6, y + 1.2)
        .lineTo(x + 7.3, y + 4.5)
        .lineTo(x + 10.9, y + 4.6)
        .lineTo(x + 8, y + 6.8)
        .lineTo(x + 9, y + 10.1)
        .lineTo(x + 6, y + 8.2)
        .lineTo(x + 3, y + 10.1)
        .lineTo(x + 4, y + 6.8)
        .lineTo(x + 1.1, y + 4.6)
        .lineTo(x + 4.7, y + 4.5)
        .closePath()
        .fill();
    }
    doc.restore();
  };

  const metaItems = [
    { kind: "time" as const, text: formatCookTime(recipe.cookTimeMinutes) },
    { kind: "servings" as const, text: `${recipe.servings} ${lbl.servings}` },
    {
      kind: "difficulty" as const,
      text: difficultyText
        ? `${lbl.difficulty} ${difficultyText.toLowerCase()}`
        : null,
    },
  ].filter((x) => x.text) as {
    kind: "time" | "servings" | "difficulty";
    text: string;
  }[];

  if (showAuthor && recipe.user?.name) {
    metaItems.push({
      kind: "difficulty",
      text: `${lbl.author} ${recipe.user.name}`,
    });
  }
  if (showVisibility) {
    metaItems.push({
      kind: "difficulty",
      text: recipe.isPublic ? lbl.public : lbl.private,
    });
  }

  const allIngredients: { quantity: number; unit: string; name: string }[] = [];
  const nestedRecipes: { title: string; servings: number }[] = [];

  for (const ri of recipe.ingredients || []) {
    allIngredients.push({
      quantity: ri.quantity,
      unit: ri.unit || ri.ingredient?.unit || "",
      name: ri.ingredient?.name || "",
    });
  }

  for (const comp of recipe.components || []) {
    const selectedOptId = selectedOptions[comp.id];
    const opt = selectedOptId
      ? comp.options.find((o: any) => o.id === selectedOptId)
      : comp.options.find((o: any) => o.isDefault) || comp.options[0];
    if (!opt) continue;

    if (opt.ingredient) {
      allIngredients.push({
        quantity: opt.quantity || 0,
        unit: opt.unit || opt.ingredient.unit || "",
        name: opt.ingredient.name,
      });
    } else if (opt.recipe) {
      nestedRecipes.push({
        title: opt.recipe.title,
        servings: opt.recipeServings || 1,
      });
    }
  }

  const instructionLines = splitInstructionSteps(recipe.instructions);

  const colGap = 14;
  const colW = (contentW - colGap) / 2;
  const leftX = left;
  const rightX = left + colW + colGap;

  const estimateListHeight = (lines: string[], width: number) => {
    let h = 0;
    for (const line of lines) {
      h += doc.heightOfString(line, { width, fontSize: 10 }) + 6;
    }
    return h;
  };

  const ingredientLines =
    allIngredients.length > 0
      ? allIngredients.map((ing) => `${ing.quantity} ${ing.unit} ${ing.name}`)
      : ["-"];
  const stepLines = instructionLines.length > 0 ? instructionLines : ["-"];

  const prepLines =
    nestedRecipes.length > 0
      ? nestedRecipes.map((r) => ({
          title: r.title,
          servingsText: lbl.neededServings.replace(
            "{{count}}",
            String(r.servings),
          ),
        }))
      : [];

  const drawFooter = () => {
    doc
      .font(BODY_FONT)
      .fontSize(8)
      .fillColor(bodyMuted)
      .text(lbl.footer, left, pageBottom, { align: "center", width: contentW });
  };

  const drawCompactHeader = (sectionLabel?: string) => {
    const stripH = 42;
    doc.rect(0, 0, pageW, stripH).fill(darkBlue);
    doc
      .font(TITLE_FONT)
      .fontSize(16)
      .fillColor("#ffffff")
      .text(recipe.title || "", left + 8, 8, {
        width: contentW - 16,
        lineBreak: false,
      });
    if (sectionLabel) {
      doc
        .font(BODY_BOLD)
        .fontSize(8)
        .fillColor(headerMuted)
        .text(sectionLabel, left + 8, 24, {
          width: contentW - 16,
          lineBreak: false,
          characterSpacing: 1.2,
        });
    }
    return stripH + 14;
  };

  const drawHeader = () => {
    const headerTitleSize = Math.min(34, recipe.title?.length > 40 ? 28 : 32);
    doc.font(TITLE_FONT).fontSize(headerTitleSize);
    const titleH = doc.heightOfString(recipe.title || "", {
      width: contentW - 16,
      align: "left",
      lineGap: 1,
    });
    const imageH = recipeImageBuffer ? 140 : 0;
    const chipsTop = 80;
    const chipsBottom = chipsTop + 30;
    const imageTop = recipeImageBuffer ? chipsTop + 42 : chipsTop + 8;
    const imageBottom = recipeImageBuffer ? imageTop + imageH : chipsBottom;
    const descriptionTop = recipeImageBuffer
      ? imageTop + imageH + 18
      : chipsTop + 52;
    const provisionalBlueBottom = pageBottom - 10;
    const headerH = provisionalBlueBottom + 18;

    doc.rect(0, 0, pageW, headerH).fill(darkBlue);
    doc
      .font(BODY_BOLD)
      .fontSize(10)
      .fillColor(headerMuted)
      .text(lbl.traditionalRecipe, left + 8, 20, {
        width: contentW,
        align: "left",
        characterSpacing: 1.7,
      });
    doc
      .font(TITLE_FONT)
      .fontSize(headerTitleSize)
      .fillColor("#ffffff")
      .text(recipe.title, left + 8, 40, {
        width: contentW - 16,
        align: "left",
        lineGap: 1,
      });

    if (recipeImageBuffer) {
      try {
        const frameW = Math.min(contentW - 48, Math.max(280, contentW * 0.58));
        const frameX = left + (contentW - frameW) / 2;
        const frameY = imageTop;
        doc
          .roundedRect(frameX, frameY, frameW, imageH, 14)
          .fillAndStroke("#ffffff", "#d0d7e3");
        doc.save();
        doc
          .roundedRect(frameX + 6, frameY + 6, frameW - 12, imageH - 12, 10)
          .clip();
        doc.image(recipeImageBuffer, frameX + 6, frameY + 6, {
          fit: [frameW - 12, imageH - 12],
          align: "center",
          valign: "center",
        });
        doc.restore();
      } catch {
        // ignore unsupported image
      }
    }

    let chipX = left + 8;
    for (const item of metaItems) {
      doc.font(BODY_BOLD).fontSize(11);
      const chipW = doc.widthOfString(item.text, { fontSize: 11 }) + 44;
      doc
        .roundedRect(chipX, chipsTop, chipW, 30, 15)
        .fillAndStroke("#2D4A73", "#6F89AE");
      drawChipIcon(item.kind, chipX + 12, chipsTop + 9);
      doc
        .font(BODY_BOLD)
        .fontSize(11)
        .fillColor("#e8f0fb")
        .text(item.text, chipX + 30, chipsTop + 10, { lineBreak: false });
      chipX += chipW + 10;
      if (chipX + chipW > left + contentW) break;
    }

    return {
      contentStartY: descriptionTop,
      chipsBottomY: chipsBottom,
      imageBottomY: imageBottom,
      provisionalBlueBottomY: provisionalBlueBottom,
    };
  };

  const drawColumnBox = (
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
  ) => {
    doc.roundedRect(x, y, width, height, 14).fillAndStroke(softGray, "#cfd4dc");
    doc.roundedRect(x + 1, y + 1, width - 2, 16, 13).fill("#e1e6ee");
    doc.rect(x + 1, y + 16, width - 2, 17).fill("#e1e6ee");
    doc
      .lineWidth(1)
      .strokeColor("#c7ced8")
      .moveTo(x + 1, y + 34)
      .lineTo(x + width - 1, y + 34)
      .stroke();
    doc
      .lineWidth(1.2)
      .strokeColor("#c7ced8")
      .roundedRect(x, y, width, height, 14)
      .stroke();
    doc
      .font(BODY_BOLD)
      .fontSize(12)
      .fillColor(darkBlue)
      .text(title, x + 14, y + 12, { lineBreak: false });
  };

  const renderIngredientsColumn = (
    x: number,
    y: number,
    width: number,
    height: number,
    startIngredientIndex: number,
    startPrepIndex: number,
  ) => {
    drawColumnBox(x, y, width, height, lbl.ingredients);
    let cursor = y + 50;
    let ingredientIndex = startIngredientIndex;
    let prepIndex = startPrepIndex;

    if (ingredientIndex < ingredientLines.length) {
      doc
        .font(BODY_BOLD)
        .fontSize(9)
        .fillColor("#6d7785")
        .text(lbl.mainIngredients, x + 14, cursor, {
          characterSpacing: 1.4,
          lineBreak: false,
        });
      cursor += 20;

      doc.font(BODY_FONT).fontSize(11).fillColor(textDark);
      while (ingredientIndex < ingredientLines.length) {
        const line = ingredientLines[ingredientIndex];
        const bullet = line === "-" ? line : `• ${line}`;
        const lineHeight = doc.heightOfString(bullet, { width: width - 24 });
        if (cursor + lineHeight > y + height - 14) break;
        doc
          .fillColor(accentGold)
          .text("•", x + 14, cursor + 1, { lineBreak: false });
        doc
          .fillColor(textDark)
          .text(line === "-" ? line : line, x + 28, cursor, {
            width: width - 38,
          });
        cursor += lineHeight + 6;
        ingredientIndex += 1;
      }
    }

    if (
      ingredientIndex >= ingredientLines.length &&
      prepIndex < prepLines.length
    ) {
      if (cursor + 32 <= y + height - 14) {
        doc
          .lineWidth(0.8)
          .strokeColor("#d9dde3")
          .moveTo(x + 14, cursor + 3)
          .lineTo(x + width - 14, cursor + 3)
          .stroke();
        cursor += 14;
        doc
          .font(BODY_BOLD)
          .fontSize(9)
          .fillColor("#6d7785")
          .text(lbl.neededPreps, x + 14, cursor, {
            characterSpacing: 1.3,
            lineBreak: false,
          });
        cursor += 18;
      }

      while (prepIndex < prepLines.length) {
        const prep = prepLines[prepIndex];
        const hintText = `${lbl.linkedRecipe} · ${lbl.linkedRecipeHint}`;
        const cardH = 58;
        if (cursor + cardH > y + height - 12) break;
        doc
          .roundedRect(x + 12, cursor, width - 24, cardH, 9)
          .fillAndStroke("#fbf7ef", "#e7d8bb");
        doc.circle(x + 24, cursor + 18, 6).fill("#e8decb");
        doc
          .font(BODY_BOLD)
          .fontSize(9)
          .fillColor(accentGold)
          .text("R", x + 20.5, cursor + 14, { lineBreak: false });
        doc
          .font(BODY_BOLD)
          .fontSize(10)
          .fillColor(textDark)
          .text(prep.title, x + 36, cursor + 9, { width: width - 52 });
        doc
          .font(BODY_FONT)
          .fontSize(9)
          .fillColor("#6f6a5f")
          .text(hintText, x + 36, cursor + 25, { width: width - 52 });
        doc
          .font(BODY_BOLD)
          .fontSize(9)
          .fillColor("#7d6a41")
          .text(prep.servingsText, x + 36, cursor + 38, { width: width - 52 });
        cursor += cardH + 8;
        prepIndex += 1;
      }
    }

    return { ingredientIndex, prepIndex };
  };

  const renderDescriptionFrom = async (
    blockIndex: number,
    startY: number,
    maxY: number,
    palette?: {
      titleColor?: string;
      headingColor?: string;
      textColor?: string;
      mutedColor?: string;
      sectionColor?: string;
      imageBorder?: string;
      fallbackBg?: string;
      fallbackBorder?: string;
      fallbackTitle?: string;
    },
  ) => {
    let index = blockIndex;
    let y = startY;

    const titleColor = palette?.titleColor ?? darkBlue;
    const headingColor = palette?.headingColor ?? textDark;
    const textColor = palette?.textColor ?? textDark;
    const mutedColor = palette?.mutedColor ?? bodyMuted;
    const sectionColor = palette?.sectionColor ?? darkBlue;
    const imageBorder = palette?.imageBorder ?? borderSoft;
    const fallbackBg = palette?.fallbackBg ?? "#fff8eb";
    const fallbackBorder = palette?.fallbackBorder ?? "#e8d5a6";
    const fallbackTitle = palette?.fallbackTitle ?? "#7a5d2f";

    while (index < descriptionBlocks.length) {
      const block = descriptionBlocks[index];

      if (block.type === "image") {
        const imageBuffer = await fetchImageBuffer(block.url);
        if (!imageBuffer) {
          const fallbackText = block.alt
            ? `${block.alt}\n${block.url}`
            : block.url;
          const fallbackHeight =
            doc.heightOfString(fallbackText, {
              width: contentW - 32,
              fontSize: 9,
              lineGap: 2,
            }) + 24;
          if (y + fallbackHeight > maxY && y > startY) break;

          doc
            .roundedRect(left, y, contentW, fallbackHeight, 10)
            .fillAndStroke(fallbackBg, fallbackBorder);
          doc
            .font(BODY_BOLD)
            .fontSize(9)
            .fillColor(fallbackTitle)
            .text(
              "Imagen markdown no accesible desde el servidor",
              left + 12,
              y + 8,
              {
                width: contentW - 24,
              },
            );
          doc
            .font(BODY_FONT)
            .fontSize(9)
            .fillColor(mutedColor)
            .text(fallbackText, left + 12, y + 24, {
              width: contentW - 24,
              lineGap: 2,
            });
          y += fallbackHeight + 10;
          index += 1;
          continue;
        }

        let image;
        try {
          image = doc.openImage(imageBuffer);
        } catch {
          index += 1;
          continue;
        }

        const maxWidth = contentW * 0.62;
        const maxHeight = 180;
        const scale = Math.min(
          maxWidth / image.width,
          maxHeight / image.height,
          1,
        );
        const drawW = image.width * scale;
        const drawH = image.height * scale;
        const drawX = left + (contentW - drawW) / 2;
        const blockHeight = drawH + (block.alt ? 22 : 8);
        if (y + blockHeight > maxY && y > startY) break;

        doc
          .roundedRect(drawX, y, drawW, drawH, 12)
          .fillAndStroke("#ffffff", imageBorder);
        doc.image(imageBuffer, drawX, y, {
          fit: [drawW, drawH],
          align: "center",
          valign: "center",
        });
        y += drawH + 8;
        if (block.alt) {
          doc
            .font(BODY_FONT)
            .fontSize(9)
            .fillColor(mutedColor)
            .text(block.alt, drawX, y, { width: drawW, align: "center" });
          y += 14;
        }
        y += 6;
        index += 1;
        continue;
      }

      if (block.type === "heading") {
        const fontSize = block.level === 1 ? 18 : block.level === 2 ? 15 : 13;
        const blockHeight = doc.heightOfString(block.text, {
          width: contentW,
          fontSize,
          lineGap: 1,
        });
        if (y + blockHeight + 8 > maxY && y > startY) break;
        doc
          .font(TITLE_FONT)
          .fontSize(fontSize)
          .fillColor(headingColor)
          .text(block.text, left, y, { width: contentW, lineGap: 1 });
        y += blockHeight + 10;
        index += 1;
        continue;
      }

      if (block.type === "paragraph") {
        const text = block.lines.join("\n");
        const blockHeight = doc.heightOfString(text, {
          width: contentW,
          fontSize: 11,
          lineGap: 3,
        });
        if (y + blockHeight + 8 > maxY && y > startY) break;
        doc
          .font(BODY_FONT)
          .fontSize(11)
          .fillColor(textColor)
          .text(text, left, y, { width: contentW, lineGap: 3 });
        y += blockHeight + 10;
        index += 1;
        continue;
      }

      const listHeight = block.items.reduce((sum, item, itemIndex) => {
        const prefix = block.ordered
          ? `${itemIndex + 1}. `
          : item.checked === true
            ? "[x] "
            : item.checked === false
              ? "[ ] "
              : "• ";
        return (
          sum +
          doc.heightOfString(`${prefix}${item.text}`, {
            width: contentW - 16,
            fontSize: 11,
            lineGap: 2,
          }) +
          6
        );
      }, 0);
      if (y + listHeight > maxY && y > startY) break;

      for (let itemIndex = 0; itemIndex < block.items.length; itemIndex += 1) {
        const item = block.items[itemIndex];
        const prefix = block.ordered
          ? `${itemIndex + 1}. `
          : item.checked === true
            ? "[x] "
            : item.checked === false
              ? "[ ] "
              : "• ";
        const prefixWidth =
          doc.widthOfString(prefix, { font: BODY_BOLD, fontSize: 11 }) + 2;
        const itemHeight = doc.heightOfString(item.text, {
          width: contentW - 18,
          fontSize: 11,
          lineGap: 2,
        });
        doc
          .font(BODY_BOLD)
          .fontSize(11)
          .fillColor(titleColor)
          .text(prefix, left, y, { width: prefixWidth, lineBreak: false });
        doc
          .font(BODY_FONT)
          .fontSize(11)
          .fillColor(textColor)
          .text(item.text, left + prefixWidth, y, {
            width: contentW - prefixWidth,
            lineGap: 2,
          });
        y += itemHeight + 6;
      }
      y += 4;
      index += 1;
    }

    return { blockIndex: index, y };
  };

  const trimHeaderBlueTo = (
    blueBottomY: number,
    provisionalBlueBottomY: number,
  ) => {
    const clampedBottom = Math.max(
      64,
      Math.min(blueBottomY, provisionalBlueBottomY),
    );
    if (clampedBottom < provisionalBlueBottomY) {
      doc
        .rect(0, clampedBottom, pageW, pageBottom - clampedBottom + 24)
        .fill("#ffffff");
    }
    return clampedBottom;
  };

  const headerLayout = drawHeader();
  let y = headerLayout.imageBottomY + 14;
  let descriptionIndex = 0;
  if (descriptionBlocks.length > 0) {
    let rendered = await renderDescriptionFrom(
      descriptionIndex,
      headerLayout.contentStartY,
      headerLayout.provisionalBlueBottomY,
      {
        titleColor: "#e5edf8",
        headingColor: "#ffffff",
        textColor: "#e5edf8",
        mutedColor: "#cdd9ee",
        sectionColor: "#e8f0fb",
        imageBorder: "#6F89AE",
        fallbackBg: "#2f4a70",
        fallbackBorder: "#6F89AE",
        fallbackTitle: "#f0d6a6",
      },
    );
    descriptionIndex = rendered.blockIndex;
    const blueBottom = trimHeaderBlueTo(
      rendered.y + 6,
      headerLayout.provisionalBlueBottomY,
    );
    y = blueBottom + 14;

    while (descriptionIndex < descriptionBlocks.length) {
      drawFooter();
      doc.addPage();
      y = drawCompactHeader(lbl.description);
      rendered = await renderDescriptionFrom(descriptionIndex, y, pageBottom);
      descriptionIndex = rendered.blockIndex;
      y = rendered.y + 6;
    }
  } else {
    const blueBottom = trimHeaderBlueTo(
      Math.max(headerLayout.imageBottomY + 12, headerLayout.chipsBottomY + 8),
      headerLayout.provisionalBlueBottomY,
    );
    y = blueBottom + 14;
  }

  let ingredientIndex = 0;
  let prepIndex = 0;
  let stepIndex = 0;
  let columnsPageY = y;

  while (
    ingredientIndex < ingredientLines.length ||
    prepIndex < prepLines.length ||
    stepIndex < stepLines.length
  ) {
    const remainingLeft =
      ingredientIndex < ingredientLines.length || prepIndex < prepLines.length;
    const remainingRight = stepIndex < stepLines.length;

    if (pageBottom - columnsPageY < 220) {
      drawFooter();
      doc.addPage();
      columnsPageY = drawCompactHeader(
        remainingLeft && remainingRight
          ? undefined
          : remainingLeft
            ? lbl.ingredients
            : lbl.instructions,
      );
    }

    const bothColumns = remainingLeft && remainingRight;
    const leftWidth = bothColumns ? colW : contentW;
    const rightWidth = bothColumns ? colW : contentW;
    const leftColumnX = left;
    const rightColumnX = bothColumns ? rightX : left;
    const columnHeight = pageBottom - columnsPageY - 8;

    if (remainingLeft) {
      const leftState = renderIngredientsColumn(
        leftColumnX,
        columnsPageY,
        leftWidth,
        columnHeight,
        ingredientIndex,
        prepIndex,
      );
      ingredientIndex = leftState.ingredientIndex;
      prepIndex = leftState.prepIndex;
    }

    if (remainingRight) {
      drawColumnBox(
        rightColumnX,
        columnsPageY,
        rightWidth,
        columnHeight,
        lbl.instructions,
      );
      const renderedSteps = drawStepCards(doc, stepLines, {
        startIndex: stepIndex,
        startNumber: stepIndex + 1,
        x: rightColumnX,
        y: columnsPageY + 50,
        width: rightWidth,
        height: columnHeight - 64,
        darkBlue,
        textDark,
        bodyFont: BODY_FONT,
        bodyBold: BODY_BOLD,
      });
      stepIndex = renderedSteps.nextIndex;
    }

    drawFooter();

    if (
      ingredientIndex < ingredientLines.length ||
      prepIndex < prepLines.length ||
      stepIndex < stepLines.length
    ) {
      doc.addPage();
      columnsPageY = drawCompactHeader(
        ingredientIndex < ingredientLines.length || prepIndex < prepLines.length
          ? stepIndex < stepLines.length
            ? undefined
            : lbl.ingredients
          : lbl.instructions,
      );
    }
  }
}

export const pdfService = {
  buildImportPayload(
    entries: { recipe: any; selectedOptions?: Record<number, number> }[],
  ): ExportPdfPayload {
    return {
      app: "recetas-app",
      version: 2,
      recipes: entries.map((e) =>
        buildRecipeExportMeta(e.recipe, e.selectedOptions || {}),
      ),
    };
  },

  parseImportedPdfBuffer(buffer: Buffer): ExportPdfPayload {
    const raw = buffer.toString("latin1");
    const start = raw.indexOf(METADATA_START);
    const end = raw.indexOf(METADATA_END, start + METADATA_START.length);
    if (start === -1 || end === -1) {
      throw new Error(
        "No se encontraron metadatos de importación. Exporta de nuevo el PDF desde esta app.",
      );
    }
    const base64 = raw.slice(start + METADATA_START.length, end);
    let parsed: any;
    try {
      parsed = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
    } catch {
      throw new Error("El PDF no contiene metadatos válidos de receta.");
    }
    if (
      !parsed ||
      parsed.app !== "recetas-app" ||
      !Array.isArray(parsed.recipes)
    ) {
      throw new Error(
        "Este PDF no fue generado por una versión compatible de Recetas App.",
      );
    }
    return parsed as ExportPdfPayload;
  },

  async getRecipeDataForPdf(recipeId: number, userId: number) {
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, OR: [{ userId }, { isPublic: true }] },
      include: {
        user: { select: { name: true } },
        ingredients: {
          include: {
            ingredient: { include: { variants: true } },
            variant: true,
            cookedVariant: true,
          },
        },
        components: {
          include: {
            options: {
              include: {
                ingredient: true,
                recipe: {
                  select: {
                    id: true,
                    title: true,
                    servings: true,
                    ingredients: {
                      include: {
                        ingredient: { include: { variants: true } },
                        variant: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!recipe) throw new Error("Receta no encontrada");
    return recipe;
  },

  async generatePdfBuffer(
    recipe: any,
    options: {
      selectedOptions?: Record<number, number>;
      showAuthor?: boolean;
      showVisibility?: boolean;
      lang?: string;
      importPayload?: ExportPdfPayload;
    } = {},
  ): Promise<Buffer> {
    const doc = new PDFDocument({ size: "A4", margin: 50, compress: false });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    await renderRecipePage(doc, recipe, options);

    doc.end();
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });
    return appendMetadataToBuffer(pdfBuffer, options.importPayload);
  },

  async generateCombinedPdfBuffer(
    entries: { recipe: any; selectedOptions?: Record<number, number> }[],
    options: {
      showAuthor?: boolean;
      showVisibility?: boolean;
      lang?: string;
      importPayload?: ExportPdfPayload;
    } = {},
  ): Promise<Buffer> {
    const doc = new PDFDocument({ size: "A4", margin: 50, compress: false });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    for (let i = 0; i < entries.length; i++) {
      if (i > 0) doc.addPage();
      await renderRecipePage(doc, entries[i].recipe, {
        ...options,
        selectedOptions: entries[i].selectedOptions,
      });
    }

    doc.end();
    const combinedBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });
    return appendMetadataToBuffer(combinedBuffer, options.importPayload);
  },

  generatePdfHtml(recipe: any): string {
    const ingredientsList = recipe.ingredients
      .map(
        (ri: any) =>
          `<li>${ri.quantity} ${ri.unit || ri.ingredient.unit} — ${ri.ingredient.name}${ri.variant && !ri.variant.isDefault ? ` (${ri.variant.name})` : ""}</li>`,
      )
      .join("");

    const componentsList = recipe.components
      .map(
        (comp: any) => `
      <div class="component">
        <h3>${comp.name}${comp.isOptional ? ' <span class="optional">(Opcional)</span>' : ""}</h3>
        <ul>${comp.options
          .map(
            (opt: any) => `
          <li${opt.isDefault ? ' class="default"' : ""}>
            ${opt.name}${opt.quantity ? ` — ${opt.quantity} ${opt.unit}` : ""}
            ${opt.isDefault ? " ★" : ""}
          </li>`,
          )
          .join("")}
        </ul>
      </div>
    `,
      )
      .join("");

    const instructionsHtml = recipe.instructions
      ? `<ol>${splitInstructionSteps(recipe.instructions)
          .map((line: string) => `<li>${escapeHtml(line)}</li>`)
          .join("")}</ol>`
      : "<p>Sin instrucciones</p>";

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 2cm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; }
  .header { text-align: center; margin-bottom: 2rem; border-bottom: 2px solid #e67e22; padding-bottom: 1rem; }
  .header h1 { font-size: 2rem; color: #2c3e50; margin: 0; }
  .header .meta { color: #777; font-size: 0.9rem; margin-top: 0.5rem; }
  .recipe-image { text-align: center; margin: 1.5rem 0; }
  .recipe-image img { max-width: 100%; max-height: 400px; border-radius: 12px; object-fit: cover; }
  .description { font-style: italic; color: #555; margin: 1rem 0; padding: 1rem; background: #fdf6ec; border-radius: 8px; }
  .description h1, .description h2, .description h3, .description h4 { color: #2c3e50; margin: 1rem 0 0.5rem; }
  .description p { margin: 0 0 0.9rem; font-style: normal; }
  .description ul, .description ol { margin: 0 0 1rem 1.25rem; font-style: normal; }
  .description li { margin: 0.35rem 0; }
  .description .task-item { list-style: none; margin-left: -1.25rem; }
  .description .task-marker { display: inline-block; width: 1.25rem; color: #555; }
  .description .md-image { margin: 1rem 0; }
  .description .md-image img { width: 100%; max-height: 420px; object-fit: contain; border-radius: 12px; display: block; background: #fff; }
  .description .md-image figcaption { text-align: center; color: #777; font-size: 0.9rem; margin-top: 0.5rem; font-style: normal; }
  .section { margin: 1.5rem 0; }
  .section h2 { color: #e67e22; font-size: 1.3rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; }
  .section ul { padding-left: 1.5rem; }
  .section li { margin: 0.4rem 0; }
  .component h3 { color: #2c3e50; font-size: 1.1rem; }
  .optional { color: #999; font-weight: normal; font-size: 0.9rem; }
  .default { font-weight: bold; }
  .nutrition { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.5rem; text-align: center; margin: 1rem 0; }
  .nutrition .item { background: #f9f9f9; padding: 0.8rem 0.5rem; border-radius: 8px; }
  .nutrition .value { font-size: 1.2rem; font-weight: bold; color: #e67e22; }
  .nutrition .label { font-size: 0.8rem; color: #777; }
  .footer { text-align: center; color: #aaa; font-size: 0.8rem; margin-top: 3rem; border-top: 1px solid #eee; padding-top: 1rem; }
  .app-meta { display: none; }
</style>
</head>
<body>
  <div class="app-meta" data-app="recetas-app" data-version="1.0" data-recipe-id="${recipe.id}"></div>
  <div class="header">
    <h1>${recipe.title}</h1>
    <div class="meta">
      ${recipe.servings} porciones · Por ${recipe.user?.name || "Anónimo"}
      ${recipe.isPublic ? " · Pública" : " · Privada"}
    </div>
  </div>

  ${recipe.imageUrl ? `<div class="recipe-image"><img src="${recipe.imageUrl}" alt="${recipe.title}"></div>` : ""}
  ${recipe.description ? `<div class="description">${mdToHtml(recipe.description)}</div>` : ""}

  ${
    recipe.customCalories ||
    recipe.customProtein ||
    recipe.customCarbs ||
    recipe.customFat ||
    recipe.customFiber
      ? `
  <div class="section">
    <h2>Información Nutricional (por porción)</h2>
    <div class="nutrition">
      <div class="item"><div class="value">${Math.round((recipe.customCalories || 0) / recipe.servings)}</div><div class="label">kcal</div></div>
      <div class="item"><div class="value">${Math.round((recipe.customProtein || 0) / recipe.servings)}g</div><div class="label">Proteína</div></div>
      <div class="item"><div class="value">${Math.round((recipe.customCarbs || 0) / recipe.servings)}g</div><div class="label">Carbos</div></div>
      <div class="item"><div class="value">${Math.round((recipe.customFat || 0) / recipe.servings)}g</div><div class="label">Grasa</div></div>
      <div class="item"><div class="value">${Math.round((recipe.customFiber || 0) / recipe.servings)}g</div><div class="label">Fibra</div></div>
    </div>
  </div>`
      : ""
  }

  <div class="section">
    <h2>Ingredientes</h2>
    <ul>${ingredientsList || "<li>Sin ingredientes</li>"}</ul>
  </div>

  ${
    recipe.components.length > 0
      ? `
  <div class="section">
    <h2>Componentes</h2>
    ${componentsList}
  </div>`
      : ""
  }

  <div class="section">
    <h2>Instrucciones</h2>
    ${instructionsHtml}
  </div>

  <div class="footer">Exportado desde Recetas App</div>
</body>
</html>`;
  },

  parseImportedPdfHtml(html: string) {
    // Only accept PDFs generated by our app (check for meta tag)
    if (!html.includes('data-app="recetas-app"')) {
      throw new Error(
        "Solo se pueden importar PDFs generados por la aplicación",
      );
    }

    const getContent = (tag: string, html: string): string => {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
      const match = html.match(regex);
      return match ? match[1].trim() : "";
    };

    const title = getContent("h1", html);
    const descMatch = html.match(/<div class="description">([\s\S]*?)<\/div>/);
    const description = descMatch ? htmlToPlain(descMatch[1]) : undefined;

    const instructionsMatch = html.match(
      /<h2>Instrucciones<\/h2>\s*([\s\S]*?)<\/div>/,
    );
    let instructions: string | undefined;
    if (instructionsMatch) {
      instructions = htmlToPlain(instructionsMatch[1]).trim();
    }

    const metaMatch = html.match(/data-recipe-id="(\d+)"/);
    const sourceRecipeId = metaMatch ? parseInt(metaMatch[1]) : undefined;

    const servingsMatch = html.match(/(\d+)\s*porciones/);
    const servings = servingsMatch ? parseInt(servingsMatch[1]) : 4;

    const ingredientMatches = [
      ...html.matchAll(/<li>(\d+(?:\.\d+)?)\s+(\S+)\s+—\s+([^<]+)<\/li>/g),
    ];
    const ingredients = ingredientMatches.map((m) => ({
      quantity: parseFloat(m[1]),
      unit: m[2],
      name: m[3].replace(/\s*\([^)]+\)$/, "").trim(),
    }));

    return {
      title,
      description,
      instructions,
      servings,
      ingredients,
      sourceRecipeId,
    };
  },
};
