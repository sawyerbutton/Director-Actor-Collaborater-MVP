/**
 * Test Data Fixtures for E2E Tests
 * Contains all test data needed for automated testing
 */

export const testData = {
  // User credentials for testing
  users: {
    newUser: {
      email: `test_${Date.now()}@example.com`,
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'User'
    },
    existingUser: {
      email: 'existing@example.com',
      password: 'Existing123!@#'
    },
    invalidUser: {
      email: 'invalid@example.com',
      password: 'WrongPassword'
    }
  },

  // Sample scripts for testing
  scripts: {
    // Small Chinese script for quick tests
    smallChinese: `场景 1
地点：咖啡店 - 白天

李明坐在窗边，看着外面的雨。

李明：（自言自语）这雨什么时候才会停...

服务员走过来。

服务员：先生，您的咖啡。

李明：谢谢。

场景 2
地点：咖啡店 - 晚上

李明还在同一个位置。

李明：雨终于停了。`,

    // Small English script
    smallEnglish: `SCENE 1
INT. COFFEE SHOP - DAY

JOHN sits by the window, watching the rain outside.

JOHN
(to himself)
When will this rain stop...

A WAITER approaches.

WAITER
Your coffee, sir.

JOHN
Thank you.

SCENE 2
INT. COFFEE SHOP - NIGHT

John is still in the same spot.

JOHN
The rain finally stopped.`,

    // Script with known errors for testing error detection
    scriptWithErrors: `场景 1
地点：办公室 - 早上

张三穿着蓝色西装走进办公室。

张三：今天是个重要的日子。

场景 2
地点：办公室 - 下午

张三穿着红色西装坐在办公桌前。

李四：张三，你早上不是穿蓝色西装吗？

张三：我一直都穿红色的。

场景 3
地点：会议室 - 早上

张三和李四在开会。

李四：我们下午的会议准备好了吗？

张三：什么会议？我们不是在开会吗？`,

    // Large script content (generated)
    largeScript: generateLargeScript(),
  },

  // Expected analysis results
  expectedErrors: {
    characterConsistency: ['服装不一致', 'Costume inconsistency'],
    timelineContinuity: ['时间线错误', 'Timeline error'],
    sceneConsistency: ['场景连续性问题', 'Scene continuity issue'],
    plotCoherence: ['情节逻辑错误', 'Plot logic error'],
    dialogueConsistency: ['对话不一致', 'Dialogue inconsistency']
  },

  // Test file paths
  testFiles: {
    txt: 'e2e/data/test-script.txt',
    docx: 'e2e/data/test-script.docx',
    invalid: 'e2e/data/invalid-file.exe',
    large: 'e2e/data/large-script.txt'
  },

  // API responses for mocking
  mockResponses: {
    analysisSuccess: {
      id: 'test-analysis-123',
      status: 'completed',
      errors: [
        {
          type: 'character_consistency',
          severity: 'high',
          location: { scene: 2, line: 45 },
          description: 'Character costume inconsistency detected',
          suggestion: 'Maintain consistent costume description'
        }
      ]
    },
    analysisInProgress: {
      id: 'test-analysis-456',
      status: 'processing',
      progress: 45
    },
    analysisFailed: {
      id: 'test-analysis-789',
      status: 'failed',
      error: 'Analysis service temporarily unavailable'
    }
  },

  // Performance benchmarks
  benchmarks: {
    analysisTime: 10000, // 10 seconds max
    uiResponseTime: 100, // 100ms max
    pageLoadTime: 2000, // 2 seconds max
    exportTime: 5000, // 5 seconds max
  },

  // Timeout values for tests
  timeouts: {
    short: 5000,
    medium: 10000,
    long: 30000,
    analysis: 15000
  }
};

/**
 * Generate a large script for performance testing
 */
function generateLargeScript(): string {
  const scenes = [];
  for (let i = 1; i <= 50; i++) {
    scenes.push(`
场景 ${i}
地点：测试地点 ${i}

角色A：这是第${i}场的对话。
角色B：是的，我们在测试第${i}场。

[一些动作描述和更多的内容来增加文件大小...]
`);
  }
  return scenes.join('\n');
}

// Helper function to create unique test emails
export function generateTestEmail(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
}

// Helper function to wait for a specific time
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}