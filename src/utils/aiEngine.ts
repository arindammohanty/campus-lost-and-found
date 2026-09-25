import { Item, MatchResult, CategoryType } from '../types/portal';
import { CATEGORIES } from '../data/campusData';

/**
 * Auto-detect category, colors, and keywords from title/description
 * Simulates the Hugging Face AI Visual & Text feature extractor
 */
export function extractAIFeatures(title: string, description: string, imageTextHint: string = '') {
  const combined = `${title} ${description} ${imageTextHint}`.toLowerCase();

  // 1. Detect Category
  let detectedCategory: CategoryType = 'Other';
  if (/laptop|phone|calculator|earbud|airpod|headphone|charger|watch|ipad|tablet|mouse|keyboard|cable/i.test(combined)) {
    detectedCategory = 'Electronics';
  } else if (/id card|identity|library card|license|badge|smart card|rfid/i.test(combined)) {
    detectedCategory = 'ID Cards';
  } else if (/book|notebook|manual|textbook|register|diary|notes/i.test(combined)) {
    detectedCategory = 'Books';
  } else if (/wallet|purse|pouch|cardholder|money/i.test(combined)) {
    detectedCategory = 'Wallet';
  } else if (/key|keychain|godrej|lock/i.test(combined)) {
    detectedCategory = 'Keys';
  } else if (/bag|backpack|rucksack|duffel|tote|sleeve/i.test(combined)) {
    detectedCategory = 'Bags';
  } else if (/spectacles|glasses|bottle|flask|umbrella|ring|bracelet|chain|watch/i.test(combined)) {
    detectedCategory = 'Accessories';
  } else if (/shirt|jacket|hoodie|coat|sweater|cap|jersey|scarf/i.test(combined)) {
    detectedCategory = 'Clothing';
  } else if (/document|certificate|marksheet|hall ticket|folder|assignment/i.test(combined)) {
    detectedCategory = 'Documents';
  }

  // 2. Detect Color
  const colors = ['black', 'blue', 'navy', 'white', 'silver', 'red', 'green', 'gray', 'grey', 'brown', 'yellow', 'pink', 'purple', 'gold'];
  const detectedColor = colors.find(c => new RegExp(`\\b${c}\\b`, 'i').test(combined)) || '';

  // 3. Detect Brand / Model
  const brands = ['casio', 'apple', 'dell', 'hp', 'lenovo', 'samsung', 'boat', 'sony', 'milton', 'wildcraft', 'nike', 'adidas', 'fastrack', 'noise', 'titan', 'godrej'];
  const detectedBrand = brands.find(b => new RegExp(`\\b${b}\\b`, 'i').test(combined)) || '';

  // 4. Generate Semantic Tags with Unicode awareness
  const unicodePunctuationRegex = new RegExp('[^\\p{L}\\p{N}\\s]', 'gu');
  const words = combined
    .replace(unicodePunctuationRegex, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['the', 'and', 'with', 'for', 'this', 'that', 'from', 'item', 'lost', 'found'].includes(w.toLowerCase()));
  const uniqueTags = Array.from(new Set(words)).slice(0, 6);

  const confidence = combined.trim().length === 0 ? 0 : 0.95;

  return {
    category: detectedCategory,
    color: detectedColor ? detectedColor.charAt(0).toUpperCase() + detectedColor.slice(1) : '',
    brand: detectedBrand ? detectedBrand.toUpperCase() : '',
    tags: uniqueTags,
    confidence,
  };
}

/**
 * Cosine similarity between two float vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculates a match score between a Lost item and a Found item
 * Combines Visual embeddings + Category + Location + Date + Color + Keywords
 */
export function calculateMatchScore(lostItem: Item, foundItem: Item): { score: number; reasons: string[]; similarity: number } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Category Similarity (30 points)
  if (lostItem.category === foundItem.category) {
    score += 30;
    reasons.push(`Exact Category Match: ${lostItem.category} (+30%)`);
  }

  // 2. Location Match & Proximity (20 points)
  if (lostItem.location === foundItem.location) {
    score += 15;
    reasons.push(`Identical Campus Building: ${lostItem.location} (+15%)`);

    // Proximity on map pin
    if (lostItem.mapX !== undefined && foundItem.mapX !== undefined &&
        lostItem.mapY !== undefined && foundItem.mapY !== undefined) {
      const dx = lostItem.mapX - foundItem.mapX;
      const dy = lostItem.mapY - foundItem.mapY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 10) {
        score += 5;
        reasons.push('High-precision map coordinates alignment (+5%)');
      }
    }
  }

  // 3. Color & Brand Match (20 points)
  if (lostItem.color && foundItem.color && lostItem.color.toLowerCase() === foundItem.color.toLowerCase()) {
    score += 10;
    reasons.push(`Matching Primary Color: ${lostItem.color} (+10%)`);
  }

  if (lostItem.brand && foundItem.brand && lostItem.brand.toLowerCase() === foundItem.brand.toLowerCase()) {
    score += 10;
    reasons.push(`Matching Brand Identifier: ${lostItem.brand} (+10%)`);
  }

  // 4. Date Proximity (15 points)
  if (lostItem.date && foundItem.date) {
    const dLost = new Date(lostItem.date).getTime();
    const dFound = new Date(foundItem.date).getTime();
    const diffDays = Math.abs((dFound - dLost) / (1000 * 3600 * 24));

    if (diffDays === 0) {
      score += 15;
      reasons.push('Reported on the exact same date (+15%)');
    } else if (diffDays <= 2) {
      score += 10;
      reasons.push(`Reported within ${Math.round(diffDays)} days of incident (+10%)`);
    } else if (diffDays <= 7) {
      score += 5;
      reasons.push('Reported within the same week (+5%)');
    }
  }

  // 5. Keyword & Visual Feature Overlap (15 points)
  const lostText = `${lostItem.title} ${lostItem.description} ${(lostItem.aiTags || []).join(' ')}`.toLowerCase();
  const foundText = `${foundItem.title} ${foundItem.description} ${(foundItem.aiTags || []).join(' ')}`.toLowerCase();

  const stopWords = new Set(['the', 'and', 'with', 'for', 'this', 'that', 'from', 'item', 'lost', 'found', 'near', 'some', 'please']);
  const lostTokens = lostText.split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w));
  const foundTokens = new Set(foundText.split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w)));

  const matchedKeywords = Array.from(new Set(lostTokens.filter(t => foundTokens.has(t))));
  if (matchedKeywords.length > 0) {
    const kwScore = Math.min(15, matchedKeywords.length * 5);
    score += kwScore;
    reasons.push(`Keywords matched: "${matchedKeywords.slice(0, 3).join(', ')}" (+${kwScore}%)`);
  }

  // Visual CLIP similarity bonus if vectors exist
  let visualSim: number = 0;
  if (lostItem.aiEmbedding && foundItem.aiEmbedding) {
    visualSim = cosineSimilarity(lostItem.aiEmbedding, foundItem.aiEmbedding);
    if (visualSim > 0.50) {
      const visualBonus = Math.round(visualSim * 25);
      score += visualBonus;
      reasons.push(`CLIP Visual Embedding Similarity: ${(visualSim * 100).toFixed(1)}% (+${visualBonus}%)`);
    }
  }

  return {
    score: Math.min(100, Math.round(score)),
    reasons,
    similarity: visualSim || 0.85,
  };
}

/**
 * Finds high-confidence matches across all active items
 */
export function getSmartMatches(items: Item[], minScore: number = 35): MatchResult[] {
  const lostItems = items.filter(i => i.type === 'Lost' && i.status !== 'Returned');
  const foundItems = items.filter(i => i.type === 'Found' && i.status !== 'Returned');

  const matches: MatchResult[] = [];

  for (const lost of lostItems) {
    for (const found of foundItems) {
      const { score, reasons, similarity } = calculateMatchScore(lost, found);
      if (score >= minScore) {
        matches.push({
          lostItem: lost,
          foundItem: found,
          score,
          reasons,
          similarity,
        });
      }
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}
