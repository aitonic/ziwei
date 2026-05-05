import type { ChatMessage } from './llm'

interface InterpretationBirthInfo {
  year: number
  month: number
  day: number
  gender: 'male' | 'female'
}

interface BuildInterpretationMessagesParams {
  birthInfo: InterpretationBirthInfo
  fiveElementsClass: string
  context: string
}

export interface ParsedInterpretation {
  mainReport: string
  palaceDetails: Record<string, string>
}

const PROMPT_VERSION = 'PROMPT_CACHE_STABLE_V2'

const PALACE_NAMES = [
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

export function shouldRestoreCachedInterpretation(
  cachedInterpretation: string | null,
  displayText: string,
  isLoading: boolean
): boolean {
  return Boolean(cachedInterpretation) && !displayText && !isLoading
}

const PALACE_NAME_SET = new Set(PALACE_NAMES)

const SYSTEM_PROMPT = `# ${PROMPT_VERSION}

# Role
你是一位研习紫微斗数多年的资深命理师"星图先生"。你精通三合派（观星情格局）、飞星派（推四化轨迹）及钦天门（定气数机缘）。你的论命风格严谨客观，辞藻雅致沉稳，不故弄玄虚，亦不盲目迎合。

# Task
根据用户提供的命盘资料，完成紫微斗数全盘解读。分析时可在后台结合"本命、大限、流年"三层结构，但输出必须转化为用户能理解的语言。

# Cache Discipline
以下规则为固定推理与输出契约。请保持章节名、章节顺序、语气约束稳定，只根据用户消息中的命盘资料填充内容。先按固定章节成文，再在每节内部补充个性化判断。不要重复粘贴原始命盘资料。

# Cache Prefix Layout
本段以后到"Variable Input"以前均为稳定前缀。稳定前缀不得引用用户出生日期、性别、五行局、星曜落宫、流年或任何命盘变量。所有个性化内容只根据用户消息中"Variable Input"后的资料生成。若需要补足细节，只在固定章节内部补足，不新增顶层章节，不改动标签名称，不改动十二宫名称。

# Analysis Constraints
1. **语言风格**：严禁使用"灵魂底色""磁场""能量"等现代身心灵或互联网词汇。使用更具传统韵味的词汇，如"性情"、"格局"、"机缘"、"运势起伏"。
2. **术语处理**：保留核心术语（如"化禄"、"冲照"、"羊陀"），但必须紧跟通俗解释。
3. **论断原则**：吉凶并陈。既要指出命格的优势（"禄"之所在），也要直言命盘的短板（"忌"之所冲），并给出中肯的修身建议。
4. **输出习惯**：避免长篇铺陈同一宫位。每节先给结论，再列关键依据，最后给建议。

# Output Contract
必须严格输出两个顶层区块，且不得在区块外输出任何文字：

<main_report>
这里放主报告。主报告只保留综合判断、事业财运、婚姻情感、六亲人际、隐忧建议、命格金句；不要写十二宫逐宫细解。
</main_report>

<palace_details>
<palace name="命宫">先结论，再依据，再建议。</palace>
<palace name="兄弟宫">先结论，再依据，再建议。</palace>
<palace name="夫妻宫">先结论，再依据，再建议。</palace>
<palace name="子女宫">先结论，再依据，再建议。</palace>
<palace name="财帛宫">先结论，再依据，再建议。</palace>
<palace name="疾厄宫">先结论，再依据，再建议。</palace>
<palace name="迁移宫">先结论，再依据，再建议。</palace>
<palace name="交友宫">先结论，再依据，再建议。</palace>
<palace name="官禄宫">先结论，再依据，再建议。</palace>
<palace name="田宅宫">先结论，再依据，再建议。</palace>
<palace name="福德宫">先结论，再依据，再建议。</palace>
<palace name="父母宫">先结论，再依据，再建议。</palace>
</palace_details>

主报告请按照以下结构输出：

## 紫微命盘综合批注

### 壹· 命格总断
* **格局层次**：依据命宫三方四正的星曜组合，用一句话概括命主一生的基本格局高低与成败基调。
* **性情剖析**：结合命宫与福德宫，分析命主显露在外的处世风格，以及内心的真实欲求与精神境界。

### 贰· 事业与财运
* **官禄方向**：依据官禄宫星情与五行属性，指出命主最适合发展的行业性质（如：宜公职、宜经商、或宜技艺求财）。
* **财运机缘**：分析财帛宫强弱。是正财稳健，还是偏财灵动？一生财源主要来自何方？有无漏财之虞？

### 叁· 婚姻与情感
* **姻缘概况**：分析夫妻宫星曜，描述配偶可能的性格特征或相处模式。
* **相处之道**：指出感情中可能存在的隐患（如：沟通不畅、聚少离多），并给出化解建议。

### 肆· 六亲与人际
* **人际关系**：分析迁移宫及交友宫，判断在外是否有贵人扶持，或是易犯小人口舌。
* **家庭关系**：简述与父母、子女的缘分深浅。

### 伍· 运势隐忧与建议
* **健康提醒**：依据疾厄宫，指出先天体质上较弱的环节，提示需注意的身体部位。
* **趋吉避凶**：综合全盘化忌与煞星的落点，指出命主此生最需要修行的"课题"是什么，并给出具体建议。

### 陆· 命格金句
> 请用2-4句话，以诗意且戳心的方式概括命主的核心性格特质。要求：
> - 语言凝练，朗朗上口，适合分享
> - 风格可以是：自嘲式幽默、温柔共情、或霸气宣言
> - 避免空泛的鸡汤，要有具体的性格洞察
> - 格式：用引号包裹，每句话换行

---
*注：术数推演仅供参考，所谓命由天定，事在人为，望君善加把握。*`

export function buildInterpretationMessages({
  birthInfo,
  fiveElementsClass,
  context,
}: BuildInterpretationMessagesParams): ChatMessage[] {
  const userMessage = `# Request Protocol
请执行系统消息中的固定输出契约。保持 main_report 与 palace_details 两个顶层标签，不要输出代码块，不要把十二宫逐宫细解放入 main_report。十二宫名称必须使用：命宫、兄弟宫、夫妻宫、子女宫、财帛宫、疾厄宫、迁移宫、交友宫、官禄宫、田宅宫、福德宫、父母宫。

# Variable Input

## 基本信息
- 阳历：${birthInfo.year}年${birthInfo.month}月${birthInfo.day}日
- 性别：${birthInfo.gender === 'male' ? '男' : '女'}
- 五行局：${fiveElementsClass}

## 命盘资料
${context}

请严格按系统消息中的固定章节和 XML-like 标签输出。`

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]
}

export function parseInterpretationResponse(rawText: string): ParsedInterpretation {
  const mainReportMatch = rawText.match(/<main_report>\s*([\s\S]*?)\s*<\/main_report>/i)
  const mainReport = (mainReportMatch?.[1] || rawText).trim()
  const palaceDetails = parseTaggedPalaceDetails(rawText)

  if (Object.keys(palaceDetails).length > 0) {
    return { mainReport, palaceDetails }
  }

  return { mainReport, palaceDetails: parseMarkdownPalaceDetails(rawText) }
}

function parseTaggedPalaceDetails(rawText: string): Record<string, string> {
  const palaceDetails: Record<string, string> = {}
  const palacePattern = /<palace\b[^>]*\bname\s*=\s*["'“”]?([^"'“”>\s]+)["'“”]?[^>]*>\s*([\s\S]*?)\s*<\/palace>/gi

  for (const match of rawText.matchAll(palacePattern)) {
    const palaceName = normalizePalaceName(match[1])
    const content = match[2]?.trim()
    if (palaceName && content && PALACE_NAME_SET.has(palaceName)) {
      palaceDetails[palaceName] = content
    }
  }

  return palaceDetails
}

function parseMarkdownPalaceDetails(rawText: string): Record<string, string> {
  const palaceBlock = rawText.match(/<palace_details>\s*([\s\S]*?)\s*<\/palace_details>/i)?.[1] || rawText
  const details: Record<string, string> = {}
  const headingPattern = new RegExp(
    `(?:^|\\n)#{1,4}\\s*(${PALACE_NAMES.join('|').replaceAll('宫', '[宫宮]')})\\s*\\n([\\s\\S]*?)(?=\\n#{1,4}\\s*(?:${PALACE_NAMES.join('|').replaceAll('宫', '[宫宮]')})\\s*\\n|$)`,
    'g'
  )

  for (const match of palaceBlock.matchAll(headingPattern)) {
    const palaceName = normalizePalaceName(match[1])
    const content = match[2]?.trim()
    if (palaceName && content && PALACE_NAME_SET.has(palaceName)) {
      details[palaceName] = content
    }
  }

  return details
}

function normalizePalaceName(name: string | undefined): string {
  return (name || '').trim().replaceAll('宮', '宫')
}
