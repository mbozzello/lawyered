export interface TextChunk {
  index: number;
  text: string;
  startOffset: number;
  endOffset: number;
}

const TARGET_CHUNK_SIZE = 12000; // ~3K tokens
const MIN_CHUNK_SIZE = 2000;
const MAX_CHUNK_SIZE = 20000;
const OVERLAP_SIZE = 200;

/**
 * Split contract text into chunks for parallel analysis.
 * Small contracts (<15K chars) return a single chunk.
 */
export function chunkContractText(
  text: string,
  targetSize: number = TARGET_CHUNK_SIZE
): TextChunk[] {
  if (text.length < 15000) {
    return [{ index: 0, text, startOffset: 0, endOffset: text.length }];
  }

  // Try splitting strategies in order of preference
  let boundaries = findPageBreaks(text);
  if (boundaries.length < 2) {
    boundaries = findSectionHeadings(text);
  }
  if (boundaries.length < 2) {
    boundaries = findParagraphBreaks(text);
  }
  if (boundaries.length < 2) {
    boundaries = findSentenceBreaks(text);
  }

  // Always include start and end
  if (boundaries[0] !== 0) boundaries.unshift(0);
  if (boundaries[boundaries.length - 1] !== text.length) boundaries.push(text.length);

  // Merge small segments into chunks of ~targetSize
  const chunks: TextChunk[] = [];
  let chunkStart = 0;
  let currentStart = boundaries[0];

  for (let i = 1; i < boundaries.length; i++) {
    const segmentEnd = boundaries[i];
    const currentLength = segmentEnd - currentStart;

    if (currentLength >= targetSize && currentStart !== chunkStart) {
      // Current accumulated text is big enough — finalize previous chunk
      const chunkEnd = boundaries[i - 1];
      if (chunkEnd - chunkStart >= MIN_CHUNK_SIZE) {
        pushChunk(chunks, text, chunkStart, chunkEnd);
        chunkStart = Math.max(chunkEnd - OVERLAP_SIZE, chunkStart);
        currentStart = chunkStart;
      }
    }

    // If a single segment exceeds max, force-split it
    if (segmentEnd - chunkStart > MAX_CHUNK_SIZE) {
      const chunkEnd = boundaries[i - 1] > chunkStart ? boundaries[i - 1] : segmentEnd;
      pushChunk(chunks, text, chunkStart, Math.min(chunkEnd, chunkStart + MAX_CHUNK_SIZE));
      chunkStart = Math.max(chunkEnd - OVERLAP_SIZE, chunkStart + MIN_CHUNK_SIZE);
      currentStart = chunkStart;
    }
  }

  // Push remaining text
  if (chunkStart < text.length) {
    pushChunk(chunks, text, chunkStart, text.length);
  }

  // Re-index
  return chunks.map((c, i) => ({ ...c, index: i }));
}

function pushChunk(
  chunks: TextChunk[],
  text: string,
  start: number,
  end: number
) {
  const clampedEnd = Math.min(end, text.length);
  const clampedStart = Math.max(start, 0);
  if (clampedEnd - clampedStart < MIN_CHUNK_SIZE / 2) return; // Skip tiny fragments
  chunks.push({
    index: chunks.length,
    text: text.slice(clampedStart, clampedEnd),
    startOffset: clampedStart,
    endOffset: clampedEnd,
  });
}

/** Split on form-feed characters (common in PDF extraction) */
function findPageBreaks(text: string): number[] {
  const boundaries: number[] = [0];
  let pos = 0;
  while ((pos = text.indexOf("\f", pos)) !== -1) {
    boundaries.push(pos);
    pos++;
  }
  return boundaries;
}

/** Split on section/article headings */
function findSectionHeadings(text: string): number[] {
  const boundaries: number[] = [0];
  const pattern = /\n(?=(?:ARTICLE|SECTION|Part)\s+\d+|(?:\d+\.)\s+[A-Z])/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    boundaries.push(match.index);
  }
  return boundaries;
}

/** Split on paragraph breaks (double newlines) */
function findParagraphBreaks(text: string): number[] {
  const boundaries: number[] = [0];
  const pattern = /\n\n+/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    boundaries.push(match.index);
  }
  return boundaries;
}

/** Split on sentence endings as last resort */
function findSentenceBreaks(text: string): number[] {
  const boundaries: number[] = [0];
  const pattern = /[.!?]\s+(?=[A-Z])/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    boundaries.push(match.index + 1);
  }
  return boundaries;
}
