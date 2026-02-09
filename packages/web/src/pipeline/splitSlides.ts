type SplitSlidesResult = {
  slides: string[];
};

function isFenceStart(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith("```") || trimmed.startsWith("~~~");
}

function isFenceEnd(line: string, fence: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith(fence);
}

function isDelimiter(line: string): boolean {
  return line.trim() === "---";
}

/**
 * Split markdown into Reveal slides.
 *
 * Rules:
 * - Slide delimiter is a line that is exactly `---` (ignoring whitespace).
 * - Do not split inside fenced code blocks (``` / ~~~).
 * - Preserve YAML frontmatter at the top of the document (--- ... ---) as part of slide 0.
 */
export function splitMarkdownIntoSlides(markdown: string): SplitSlidesResult {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  const slides: string[] = [];
  let current: string[] = [];

  let inFence = false;
  let fenceToken = "```";

  let i = 0;

  // Preserve top-of-file YAML frontmatter, if present.
  if (lines.length > 0 && isDelimiter(lines[0])) {
    current.push(lines[0]);
    i = 1;
    while (i < lines.length) {
      current.push(lines[i]);
      if (isDelimiter(lines[i])) {
        i += 1;
        break;
      }
      i += 1;
    }
  }

  for (; i < lines.length; i++) {
    const line = lines[i];

    if (isFenceStart(line)) {
      if (!inFence) {
        inFence = true;
        fenceToken = line.trimStart().startsWith("~~~") ? "~~~" : "```";
      } else if (isFenceEnd(line, fenceToken)) {
        inFence = false;
      }
      current.push(line);
      continue;
    }

    if (!inFence && isDelimiter(line)) {
      slides.push(current.join("\n").trimEnd() + "\n");
      current = [];
      continue;
    }

    current.push(line);
  }

  slides.push(current.join("\n").trimEnd() + "\n");

  // Avoid returning an empty final slide for trailing delimiters.
  const cleaned = slides.filter((s) => s.trim().length > 0);
  return { slides: cleaned.length > 0 ? cleaned : ["\n"] };
}

