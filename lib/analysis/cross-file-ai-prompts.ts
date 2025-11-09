/**
 * AI Prompts for Cross-File Consistency Analysis
 *
 * Uses DeepSeek to perform semantic analysis across multiple script files
 */

export const CROSS_FILE_SYSTEM_PROMPT = `你是一个专业的多集剧本一致性分析专家。你的任务是分析多个剧本文件（通常是连续的集数），检测跨文件的一致性问题。

你必须严格按照以下 JSON Schema 输出结果：

\`\`\`json
{
  "findings": [
    {
      "type": "cross_file_timeline" | "cross_file_character" | "cross_file_plot" | "cross_file_setting",
      "severity": "critical" | "warning" | "info",
      "confidence": 0.0-1.0,
      "description": "问题描述（中文）",
      "affectedFiles": [
        {
          "fileId": "文件ID",
          "filename": "文件名",
          "episodeNumber": 1,
          "relevantScenes": [场景编号1, 场景编号2]
        }
      ],
      "evidence": {
        "conflictingElements": ["矛盾元素1", "矛盾元素2"],
        "timeline": "时间线冲突描述（仅timeline类型）",
        "character": "角色冲突描述（仅character类型）",
        "plotThread": "情节线索冲突描述（仅plot类型）",
        "setting": "设定冲突描述（仅setting类型）"
      }
    }
  ]
}
\`\`\`

**分析类型说明**：

1. **Timeline (cross_file_timeline)** - 时间线一致性：
   - 检查时间标记是否连贯（"第二天" → "一周后" 是否合理）
   - 检查具体日期是否冲突（"2024年1月1日" vs "2024年2月1日"但只过了一天）
   - 检查角色年龄变化是否合理
   - 检查季节/节日连续性（第1集是冬天，第2集突然变夏天）

2. **Character (cross_file_character)** - 角色一致性：
   - 角色首次登场信息冲突（第3集说"初次见面"，但第1集已经认识）
   - 角色名称变化（"张三" vs "小张"不一致使用）
   - 角色关系矛盾（第1集是陌生人，第2集突然成好友无铺垫）
   - 角色能力/性格突变（第1集胆小，第2集突然勇敢无解释）

3. **Plot (cross_file_plot)** - 情节一致性：
   - 重要情节线索未延续（第1集埋下的伏笔完全忘记）
   - 情节结局与后续冲突（第1集问题已解决，第2集又出现）
   - 任务目标不一致（第1集要找宝藏，第2集变成抓坏人）
   - 因果链断裂（第1集的原因在第2集没有结果）

4. **Setting (cross_file_setting)** - 设定一致性：
   - 场景地点描述冲突（第1集咖啡厅很小，第2集突然很大）
   - 世界观设定矛盾（第1集有魔法，第2集说不存在魔法）
   - 社会规则变化（第1集禁止外出，第2集突然可以随便走）
   - 地理位置矛盾（第1集在北京，第2集说一直在上海）

**重要原则**：
- 只报告**真正的矛盾**，不要把合理的剧情发展当问题
- 区分"矛盾"和"变化"：角色成长、时间推移、情节转折是正常的
- confidence 要准确反映确定程度：
  - 0.9-1.0: 明确的数据冲突（日期、名字、地点）
  - 0.7-0.9: 逻辑矛盾（时间线不合理、角色行为突变）
  - 0.5-0.7: 可能的疏漏（伏笔未延续、细节不一致）
  - <0.5: 不要报告（可能是正常剧情）

**输出要求**：
- 必须是合法的 JSON 格式
- findings 数组可以为空（无问题时）
- 每个 finding 必须有具体证据（evidence）
- affectedFiles 至少包含 2 个文件（跨文件问题）
- description 要清晰、具体、可操作`;

/**
 * Build prompt for timeline consistency check
 */
export function buildTimelineCheckPrompt(scripts: Array<{
  fileId: string;
  filename: string;
  episodeNumber: number | null;
  jsonContent: any;
}>): string {
  const scriptsInfo = scripts.map(s => ({
    fileId: s.fileId,
    filename: s.filename,
    episodeNumber: s.episodeNumber,
    metadata: s.jsonContent.metadata,
    timeReferences: s.jsonContent.metadata.timeReferences,
    scenes: s.jsonContent.scenes.map((scene: any) => ({
      sceneNumber: scene.sceneNumber,
      heading: scene.heading,
      timeReference: scene.timeReference,
      description: scene.description
    }))
  }));

  return `**任务**: 检查以下 ${scripts.length} 个剧本文件的**时间线一致性**

**剧本文件信息**：
\`\`\`json
${JSON.stringify(scriptsInfo, null, 2)}
\`\`\`

**检查重点**：
1. 时间标记是否连贯（"第一天" → "第二天" → "一周后"）
2. 具体日期是否冲突
3. 季节/节气是否合理
4. 角色年龄变化是否符合时间流逝

请输出 JSON 格式的检查结果。`;
}

/**
 * Build prompt for character consistency check
 */
export function buildCharacterCheckPrompt(scripts: Array<{
  fileId: string;
  filename: string;
  episodeNumber: number | null;
  jsonContent: any;
}>): string {
  const scriptsInfo = scripts.map(s => ({
    fileId: s.fileId,
    filename: s.filename,
    episodeNumber: s.episodeNumber,
    characters: s.jsonContent.metadata.characters,
    scenes: s.jsonContent.scenes.map((scene: any) => ({
      sceneNumber: scene.sceneNumber,
      characters: scene.characters,
      dialogues: scene.dialogues.map((d: any) => ({
        character: d.character,
        text: d.text.substring(0, 100) // 只取前100字符
      }))
    }))
  }));

  return `**任务**: 检查以下 ${scripts.length} 个剧本文件的**角色一致性**

**剧本文件信息**：
\`\`\`json
${JSON.stringify(scriptsInfo, null, 2)}
\`\`\`

**检查重点**：
1. 角色首次登场是否一致（不能第3集说"初次见面"但第1集已认识）
2. 角色名称是否统一（"张三" vs "小张"）
3. 角色关系发展是否合理（不能突然从陌生人变好友）
4. 角色性格/能力是否保持连贯（重大转变需要铺垫）

请输出 JSON 格式的检查结果。`;
}

/**
 * Build prompt for plot consistency check
 */
export function buildPlotCheckPrompt(scripts: Array<{
  fileId: string;
  filename: string;
  episodeNumber: number | null;
  jsonContent: any;
}>): string {
  const scriptsInfo = scripts.map(s => ({
    fileId: s.fileId,
    filename: s.filename,
    episodeNumber: s.episodeNumber,
    scenes: s.jsonContent.scenes.map((scene: any) => ({
      sceneNumber: scene.sceneNumber,
      heading: scene.heading,
      description: scene.description,
      actions: scene.actions
    }))
  }));

  return `**任务**: 检查以下 ${scripts.length} 个剧本文件的**情节一致性**

**剧本文件信息**：
\`\`\`json
${JSON.stringify(scriptsInfo, null, 2)}
\`\`\`

**检查重点**：
1. 伏笔是否有延续（第1集埋下的线索在后续集有响应）
2. 问题解决后是否重复出现（逻辑矛盾）
3. 主线任务目标是否一致
4. 因果链是否完整（原因要有结果）

请输出 JSON 格式的检查结果。`;
}

/**
 * Build prompt for setting consistency check
 */
export function buildSettingCheckPrompt(scripts: Array<{
  fileId: string;
  filename: string;
  episodeNumber: number | null;
  jsonContent: any;
}>): string {
  const scriptsInfo = scripts.map(s => ({
    fileId: s.fileId,
    filename: s.filename,
    episodeNumber: s.episodeNumber,
    locations: s.jsonContent.metadata.locations,
    scenes: s.jsonContent.scenes.map((scene: any) => ({
      sceneNumber: scene.sceneNumber,
      location: scene.location,
      description: scene.description
    }))
  }));

  return `**任务**: 检查以下 ${scripts.length} 个剧本文件的**设定一致性**

**剧本文件信息**：
\`\`\`json
${JSON.stringify(scriptsInfo, null, 2)}
\`\`\`

**检查重点**：
1. 场景地点描述是否一致（同一地点的外观、大小、细节）
2. 世界观设定是否矛盾（魔法/科技/社会规则）
3. 地理位置是否合理（城市、距离、方位）
4. 背景设定是否保持（历史时期、社会环境）

请输出 JSON 格式的检查结果。`;
}
