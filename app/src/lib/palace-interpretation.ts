import type { ChatMessage } from './llm'

interface PalaceDetailBirthInfo {
  year: number
  month: number
  day: number
  gender: 'male' | 'female'
}

interface BuildPalaceDetailMessagesParams {
  birthInfo: PalaceDetailBirthInfo
  fiveElementsClass: string
  context: string
}

export const PALACE_NAMES = [
  '命宫',
  '兄弟宫',
  '夫妻宫',
  '子女宫',
  '财帛宫',
  '疾厄宫',
  '迁移宫',
  '交友宫',
  '官禄宫',
  '田宅宫',
  '福德宫',
  '父母宫',
]

const PALACE_NAME_SET = new Set(PALACE_NAMES)

const PALACE_DETAIL_SYSTEM_PROMPT = `# PALACE_DETAIL_JSON_V1

You are a Zi Wei Dou Shu palace detail generator.

Return valid JSON only. Do not output markdown, code fences, XML tags, comments, or prose outside JSON.

The JSON object must have this exact shape:
{
  "palaces": {
    "命宫": "string",
    "兄弟宫": "string",
    "夫妻宫": "string",
    "子女宫": "string",
    "财帛宫": "string",
    "疾厄宫": "string",
    "迁移宫": "string",
    "交友宫": "string",
    "官禄宫": "string",
    "田宅宫": "string",
    "福德宫": "string",
    "父母宫": "string"
  }
}

Hard requirements:
- You must return all 12 palace keys.
- Every palace value must be a non-empty string.
- Do not omit difficult, empty-star, or borrowed-star palaces.
- If a palace has no main star, still write that palace value by borrowing the opposite palace.
- For each palace value, write 120-220 Chinese characters.
- Use this order inside each value: conclusion, evidence, advice.
- Keep the twelve palace keys unchanged.`

export function buildPalaceDetailMessages({
  birthInfo,
  fiveElementsClass,
  context,
}: BuildPalaceDetailMessagesParams): ChatMessage[] {
  const userMessage = `# Variable Input

## 基本信息
- 阳历：${birthInfo.year}年${birthInfo.month}月${birthInfo.day}日
- 性别：${birthInfo.gender === 'male' ? '男' : '女'}
- 五行局：${fiveElementsClass}

## 命盘资料
${context}

Return only the JSON object described in the system message.`

  return [
    { role: 'system', content: PALACE_DETAIL_SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]
}

export function parsePalaceDetailsJson(rawText: string): Record<string, string> {
  const parsed = JSON.parse(stripJsonFence(rawText))
  const palaces = parsed?.palaces
  const details: Record<string, string> = {}

  if (!palaces || typeof palaces !== 'object') {
    throw new Error('No palace details found')
  }

  for (const [rawName, rawContent] of Object.entries(palaces)) {
    const palaceName = normalizePalaceName(rawName)
    const content = typeof rawContent === 'string' ? rawContent.trim() : ''

    if (PALACE_NAME_SET.has(palaceName) && content) {
      details[palaceName] = content
    }
  }

  const missingPalaces = PALACE_NAMES.filter((palaceName) => !details[palaceName])
  if (missingPalaces.length > 0) {
    throw new Error(`Missing palace details: ${missingPalaces.join('、')}`)
  }

  return details
}

function stripJsonFence(rawText: string): string {
  return rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
}

function normalizePalaceName(name: string): string {
  return name.trim().replaceAll('宮', '宫')
}
