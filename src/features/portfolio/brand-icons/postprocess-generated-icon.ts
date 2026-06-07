import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { findContentBounds } from "@/features/portfolio/brand-icons/find-content-bounds";
import { findIconInkBounds } from "@/features/portfolio/brand-icons/find-icon-ink-bounds";
import { makeGenerativeBackgroundTransparent } from "@/features/portfolio/brand-icons/make-generative-background-transparent";

const backgroundHex = "#FAF9FC";
const masterSize = 512;

type BoundsStrategy = "opaque" | "iconInk";

type IconJob = {
  sourceFile: string;
  outputStem: string;
  sizes: number[];
  contentScale: number;
  boundsStrategy: BoundsStrategy;
  minInkPixelsPerRow?: number;
  extraOutputs?: Array<{ size: number; outputPath: string }>;
};

const iconJobs: IconJob[] = [
  {
    sourceFile: "site-icon-512.png",
    outputStem: "site-icon",
    sizes: [32, 180, 192, 512],
    contentScale: 0.97,
    boundsStrategy: "opaque",
    extraOutputs: [{ size: 32, outputPath: "public/favicon.png" }],
  },
  {
    sourceFile: "ammo-ledger-icon-512.png",
    outputStem: "ammo-ledger-icon",
    sizes: [180, 192, 512],
    contentScale: 1,
    boundsStrategy: "iconInk",
    minInkPixelsPerRow: 100,
  },
];

async function sourceExists({ sourcePath }: { sourcePath: string }): Promise<boolean> {
  try {
    await access(sourcePath);
    return true;
  } catch {
    return false;
  }
}

async function postprocessMaster({
  sourcePath,
  outputPath,
  contentScale,
  boundsStrategy,
  minInkPixelsPerRow = 50,
}: {
  sourcePath: string;
  outputPath: string;
  contentScale: number;
  boundsStrategy: BoundsStrategy;
  minInkPixelsPerRow?: number;
}): Promise<void> {
  const { data, info } = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const transparent = makeGenerativeBackgroundTransparent({ data });
  const bounds =
    boundsStrategy === "iconInk"
      ? findIconInkBounds({
          data,
          width: info.width,
          height: info.height,
          minInkPixelsPerRow,
        })
      : findContentBounds({
          data: transparent,
          width: info.width,
          height: info.height,
        });

  if (!bounds) {
    throw new Error(`No icon content found in ${sourcePath}`);
  }

  const trimmed = await sharp(transparent, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .extract(bounds)
    .png()
    .toBuffer();

  const trimmedMeta = await sharp(trimmed).metadata();
  const trimmedWidth = trimmedMeta.width ?? bounds.width;
  const trimmedHeight = trimmedMeta.height ?? bounds.height;

  const contentMax = Math.round(masterSize * contentScale);
  const scale = Math.min(contentMax / trimmedWidth, contentMax / trimmedHeight);
  const resizedWidth = Math.max(1, Math.round(trimmedWidth * scale));
  const resizedHeight = Math.max(1, Math.round(trimmedHeight * scale));
  const offsetLeft = Math.floor((masterSize - resizedWidth) / 2);
  const offsetTop = Math.floor((masterSize - resizedHeight) / 2);

  const resizedContent = await sharp(trimmed).resize(resizedWidth, resizedHeight).png().toBuffer();

  await sharp({
    create: {
      width: masterSize,
      height: masterSize,
      channels: 4,
      background: backgroundHex,
    },
  })
    .composite([{ input: resizedContent, left: offsetLeft, top: offsetTop }])
    .png()
    .toFile(outputPath);
}

async function writeResizedVariants({
  masterPath,
  outputDir,
  outputStem,
  sizes,
  extraOutputs = [],
}: {
  masterPath: string;
  outputDir: string;
  outputStem: string;
  sizes: number[];
  extraOutputs?: Array<{ size: number; outputPath: string }>;
}): Promise<void> {
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `${outputStem}-${size}.png`);
    await sharp(masterPath).resize(size, size).png().toFile(outputPath);
  }

  for (const extra of extraOutputs) {
    const outputPath = path.join(process.cwd(), extra.outputPath);
    await sharp(masterPath).resize(extra.size, extra.size).png().toFile(outputPath);
  }
}

async function main() {
  const sourceDir = path.join(import.meta.dirname, "source");
  const outputDir = path.join(process.cwd(), "public", "icons");
  const scratchDir = path.join(import.meta.dirname, ".scratch");

  await mkdir(sourceDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });
  await mkdir(scratchDir, { recursive: true });

  for (const job of iconJobs) {
    const sourcePath = path.join(sourceDir, job.sourceFile);
    const masterPath = path.join(scratchDir, `${job.outputStem}-master-512.png`);

    await postprocessMaster({
      sourcePath,
      outputPath: masterPath,
      contentScale: job.contentScale,
      boundsStrategy: job.boundsStrategy,
      minInkPixelsPerRow: job.minInkPixelsPerRow,
    });
    await writeResizedVariants({
      masterPath,
      outputDir,
      outputStem: job.outputStem,
      sizes: job.sizes,
      extraOutputs: job.extraOutputs,
    });

    const maskableSourcePath = path.join(sourceDir, `${job.outputStem}-512-maskable.png`);
    if (await sourceExists({ sourcePath: maskableSourcePath })) {
      const maskableOutputPath = path.join(outputDir, `${job.outputStem}-512-maskable.png`);
      await postprocessMaster({
        sourcePath: maskableSourcePath,
        outputPath: maskableOutputPath,
        contentScale: job.boundsStrategy === "iconInk" ? 0.82 : 0.84,
        boundsStrategy: job.boundsStrategy,
        minInkPixelsPerRow: job.minInkPixelsPerRow,
      });
    }
  }

  console.log("Postprocessed icons written to public/icons/");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
