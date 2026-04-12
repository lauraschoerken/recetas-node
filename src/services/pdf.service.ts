import { PrismaClient } from "@prisma/client";
import PDFDocument from "pdfkit";

const prisma = new PrismaClient();

// ──────────────────────────────────────────
// i18n labels for PDF
// ──────────────────────────────────────────
const PDF_LABELS = {
  es: {
    servings: "porciones",
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

// ──────────────────────────────────────────
// Image helper — silently returns null on any error
// ──────────────────────────────────────────
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    if (!url || !url.startsWith("http")) return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
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

  // Requested palette
  const pageW = 595.28;
  const left = 26;
  const contentW = pageW - left * 2;
  const darkBlue = "#1F3A5F";
  const softGray = "#F5F5F5";
  const textDark = "#222222";
  const borderBlue = "#90A7C8";
  const bodyMuted = "#5a6472";
  const accentGold = "#C9A35B";

  // There are no custom .ttf files in repo, so we use the closest built-in PDF fonts.
  // Title style approximates Playfair/Merriweather and body approximates Inter/Roboto.
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

  // Header panel with dynamic height to avoid overlaps
  const headerTitleSize = Math.min(34, recipe.title?.length > 40 ? 28 : 32);
  doc.font(TITLE_FONT).fontSize(headerTitleSize);
  const titleH = doc.heightOfString(recipe.title || "", {
    width: contentW - 16,
    align: "left",
    lineGap: 1,
  });
  doc.font(BODY_FONT).fontSize(12);
  const descH = recipe.description
    ? doc.heightOfString(recipe.description, {
        width: contentW - 16,
        align: "left",
        lineGap: 1,
      })
    : 0;
  const chipY = 26 + titleH + (descH > 0 ? descH + 10 : 6) + 18;
  const headerH = Math.max(150, chipY + 40);

  doc.rect(0, 0, pageW, headerH).fill(darkBlue);
  doc
    .font(BODY_BOLD)
    .fontSize(10)
    .fillColor("#cdd9ee")
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

  if (recipe.description) {
    doc
      .font(BODY_FONT)
      .fontSize(12)
      .fillColor("#e5edf8")
      .text(recipe.description, left + 8, 48 + titleH, {
        width: contentW - 16,
        align: "left",
        lineGap: 1,
      });
  }

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

  let chipX = left + 8;
  for (const item of metaItems) {
    doc.font(BODY_BOLD).fontSize(11);
    const chipW = doc.widthOfString(item.text, { fontSize: 11 }) + 44;
    doc
      .roundedRect(chipX, chipY, chipW, 30, 15)
      .fillAndStroke("#2D4A73", "#6F89AE");
    drawChipIcon(item.kind, chipX + 12, chipY + 9);
    doc
      .font(BODY_BOLD)
      .fontSize(11)
      .fillColor("#e8f0fb")
      .text(item.text, chipX + 30, chipY + 10, { lineBreak: false });
    chipX += chipW + 10;
    if (chipX + chipW > left + contentW) break;
  }

  let y = headerH + 12;

  // Image block
  let drewImage = false;
  if (recipe.imageUrl) {
    const imgBuf = await fetchImageBuffer(recipe.imageUrl);
    if (imgBuf) {
      try {
        const imgH = 145;
        doc
          .roundedRect(left, y, contentW, imgH, 12)
          .fillAndStroke("#ffffff", "#d0d7e3");
        // Clip image to the inner rounded rectangle so cover-cropping never overflows.
        doc.save();
        doc.roundedRect(left + 6, y + 6, contentW - 12, imgH - 12, 9).clip();
        doc.image(imgBuf, left + 6, y + 6, {
          cover: [contentW - 12, imgH - 12],
          align: "center",
          valign: "center",
        });
        doc.restore();
        y += imgH + 16;
        drewImage = true;
      } catch {
        // skip unsupported image
      }
    }
  }

  if (!drewImage) {
    y += 8;
  }

  // ── Collect all ingredients ────────────
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

  const instructionLines = (recipe.instructions || "")
    .split("\n")
    .map((s: string) => s.trim())
    .map((s: string) => s.replace(/^\d+\s*[\)\.\-:]\s*/, "").trim())
    .filter(Boolean);

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

  const leftBodyH =
    estimateListHeight(ingredientLines, colW - 28) +
    (prepLines.length > 0 ? prepLines.length * 68 + 52 : 22) +
    56;
  const rightBodyH =
    estimateListHeight(stepLines, colW - 70) + stepLines.length * 18 + 22;
  const sectionH = Math.max(
    250,
    Math.min(815 - y, Math.max(leftBodyH, rightBodyH)),
  );

  const drawColumnBox = (x: number, title: string) => {
    doc
      .roundedRect(x, y, colW, sectionH, 14)
      .fillAndStroke(softGray, "#cfd4dc");
    // Top bar with straight bottom edge (cleaner, no double-rounded artifacts)
    doc.roundedRect(x + 1, y + 1, colW - 2, 16, 13).fill("#e1e6ee");
    doc.rect(x + 1, y + 16, colW - 2, 17).fill("#e1e6ee");
    doc
      .lineWidth(1)
      .strokeColor("#c7ced8")
      .moveTo(x + 1, y + 34)
      .lineTo(x + colW - 1, y + 34)
      .stroke();
    doc
      .lineWidth(1.2)
      .strokeColor("#c7ced8")
      .roundedRect(x, y, colW, sectionH, 14)
      .stroke();
    doc
      .font(BODY_BOLD)
      .fontSize(12)
      .fillColor(darkBlue)
      .text(title, x + 14, y + 12, { lineBreak: false });
  };

  drawColumnBox(leftX, lbl.ingredients);
  drawColumnBox(rightX, lbl.instructions);

  // Left column content
  let leftY = y + 50;
  doc
    .font(BODY_BOLD)
    .fontSize(9)
    .fillColor("#6d7785")
    .text(lbl.mainIngredients, leftX + 14, leftY, {
      characterSpacing: 1.4,
      lineBreak: false,
    });
  leftY += 20;

  doc.font(BODY_FONT).fontSize(11).fillColor(textDark);
  for (const line of ingredientLines) {
    const bullet = line === "-" ? line : `• ${line}`;
    const h = doc.heightOfString(bullet, { width: colW - 24 });
    if (leftY + h > y + sectionH - 14) break;
    doc
      .fillColor(accentGold)
      .text("•", leftX + 14, leftY + 1, { lineBreak: false });
    doc
      .fillColor(textDark)
      .text(line === "-" ? line : line, leftX + 28, leftY, {
        width: colW - 38,
      });
    leftY += h + 6;
  }

  if (prepLines.length > 0 && leftY + 56 < y + sectionH - 14) {
    doc
      .lineWidth(0.8)
      .strokeColor("#d9dde3")
      .moveTo(leftX + 14, leftY + 3)
      .lineTo(leftX + colW - 14, leftY + 3)
      .stroke();
    leftY += 14;

    doc
      .font(BODY_BOLD)
      .fontSize(9)
      .fillColor("#6d7785")
      .text(lbl.neededPreps, leftX + 14, leftY, {
        characterSpacing: 1.3,
        lineBreak: false,
      });
    leftY += 18;

    for (const prep of prepLines) {
      const hintText = `${lbl.linkedRecipe} · ${lbl.linkedRecipeHint}`;
      const cardH = 58;
      if (leftY + cardH > y + sectionH - 12) break;
      doc
        .roundedRect(leftX + 12, leftY, colW - 24, cardH, 9)
        .fillAndStroke("#fbf7ef", "#e7d8bb");
      doc.circle(leftX + 24, leftY + 18, 6).fill("#e8decb");
      doc
        .font(BODY_BOLD)
        .fontSize(9)
        .fillColor(accentGold)
        .text("R", leftX + 20.5, leftY + 14, { lineBreak: false });
      doc
        .font(BODY_BOLD)
        .fontSize(10)
        .fillColor(textDark)
        .text(prep.title, leftX + 36, leftY + 9, { width: colW - 52 });
      doc
        .font(BODY_FONT)
        .fontSize(9)
        .fillColor("#6f6a5f")
        .text(hintText, leftX + 36, leftY + 25, { width: colW - 52 });
      doc
        .font(BODY_BOLD)
        .fontSize(9)
        .fillColor("#7d6a41")
        .text(prep.servingsText, leftX + 36, leftY + 38, { width: colW - 52 });
      leftY += cardH + 8;
    }
  }

  // Right column content as step cards
  let rightY = y + 50;
  let stepNum = 1;
  for (const step of stepLines) {
    const cardH = Math.max(
      34,
      doc.heightOfString(step, { width: colW - 78 }) + 14,
    );
    if (rightY + cardH > y + sectionH - 14) break;

    doc
      .roundedRect(rightX + 10, rightY, colW - 20, cardH, 12)
      .fillAndStroke("#ffffff", "#d7dbe3");
    doc
      .lineWidth(1.1)
      .strokeColor("#d7dbe3")
      .roundedRect(rightX + 10, rightY, colW - 20, cardH, 12)
      .stroke();

    doc.roundedRect(rightX + 20, rightY + 8, 28, 22, 9).fill(darkBlue);
    doc
      .font(BODY_BOLD)
      .fontSize(11)
      .fillColor("#ffffff")
      .text(String(stepNum), rightX + 20, rightY + 14, {
        lineBreak: false,
        align: "center",
        width: 28,
      });

    doc
      .font(BODY_FONT)
      .fontSize(11)
      .fillColor(textDark)
      .text(step, rightX + 58, rightY + 9, { width: colW - 74, lineGap: 1.3 });

    rightY += cardH + 8;
    stepNum += 1;
  }

  // Footer (keep on same page when it fits)
  const footerY = Math.min(820, y + sectionH + 8);
  doc
    .font(BODY_FONT)
    .fontSize(8)
    .fillColor(bodyMuted)
    .text(lbl.footer, left, footerY, { align: "center", width: contentW });
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
      ? recipe.instructions
          .split("\n")
          .map((line: string) => `<p>${line}</p>`)
          .join("")
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
  ${recipe.description ? `<div class="description">${recipe.description}</div>` : ""}

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
    const description = descMatch ? descMatch[1].trim() : undefined;

    const instructionsMatch = html.match(
      /<h2>Instrucciones<\/h2>\s*([\s\S]*?)<\/div>/,
    );
    let instructions: string | undefined;
    if (instructionsMatch) {
      instructions = instructionsMatch[1]
        .replace(/<p>/g, "")
        .replace(/<\/p>/g, "\n")
        .trim();
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
