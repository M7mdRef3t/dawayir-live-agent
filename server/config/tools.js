// ═══════════════════════════════════════════════════════
// Gemini Tool Declarations (Function Schemas)
// Defines the tools the AI model can call.
// ═══════════════════════════════════════════════════════

export const tools = [
    {
        functionDeclarations: [
            {
                name: "update_node",
                description: "Cognitive OS: Update a circle visual state. Use id + radius + color only. DO NOT mention numeric values in speech.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        id: { type: "STRING", description: "Entity ID: 1, 2, or 3" },
                        radius: { type: "NUMBER", description: "Circle radius in the range 30 to 100" },
                        color: { type: "STRING", description: "Hex color representing the current emotional frequency" },
                        fluidity: { type: "NUMBER", description: "0.0 for stable/structured, 1.0 for fluid/confused/wavy. 0.5 is default." }
                    },
                    required: ["id", "radius", "color"]
                },
            },
            {
                name: "highlight_node",
                description: "Silently highlight a visual element. NEVER mention this in speech.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        id: { type: "STRING", description: "ID: 1, 2, or 3" }
                    },
                    required: ["id"]
                }
            },
            {
                name: "get_expert_insight",
                description: "Retrieve psychological principles from the Al-Rehla framework. Use this when the user asks for deep advice or when you need to ground your response in the knowledge base.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        topic: { type: "STRING", description: "The psychological concept or topic to look up" }
                    },
                    required: ["topic"]
                }
            },
            {
                name: "save_mental_map",
                description: "Save the current state of the mental circles to memory. Use this when the user asks to save, or after a significant breakthrough.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        session_name: { type: "STRING", description: "Optional name for the session" }
                    }
                }
            },
            {
                name: "generate_session_report",
                description: "Generate and save a summary report of the session. Use at the end of the session.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        summary: { type: "STRING", description: "Executive summary of the session" },
                        insights: { type: "STRING", description: "Core psychological insights discovered" },
                        recommendations: { type: "STRING", description: "Actionable recommendations for the user" }
                    },
                    required: ["summary", "insights"]
                }
            },
            {
                name: "create_truth_contract",
                description: "Create one concrete commitment action for the user to execute after session. Use after a meaningful clarity shift.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        title: { type: "STRING", description: "Short contract title in Arabic" },
                        action: { type: "STRING", description: "One specific action the user can do today" },
                        anchor: { type: "STRING", description: "When/where trigger for action (e.g. after lunch, before sleep)" },
                        due_hours: { type: "NUMBER", description: "Optional due window in hours, default 24" }
                    },
                    required: ["action"]
                }
            },
            {
                name: "update_journey",
                description: "Update the user's progress on the visual timeline overlay.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        stage: { type: "STRING", description: "The current mental stage: 'Overwhelmed', 'Focus', or 'Clarity'" }
                    },
                    required: ["stage"]
                }
            },
            {
                name: "spawn_other",
                description: "Show a person circle on canvas when user mentions someone specific. NEVER mention this tool in speech. Use when user mentions a specific person (brother, boss, partner, friend, parent).",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING", description: "Short name/role of the person in Arabic (e.g. أخويا, مديري, حبيبتي, أمي)" },
                        tension: { type: "NUMBER", description: "0.0 = neutral/loved, 0.5 = mixed, 1.0 = high conflict" },
                        color: { type: "STRING", description: "Hex color: #FF4444 conflict, #FFD700 loved, #4488FF neutral, #888888 distant" }
                    },
                    required: ["name", "tension", "color"]
                }
            },
            {
                name: "spawn_topic",
                description: "Show a topic circle when user focuses on a specific life area. NEVER mention this tool in speech. Use for recurring themes like work, home, health, money.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        topic: { type: "STRING", description: "Short topic name in Arabic (e.g. الشغل, البيت, الصحة, الفلوس)" },
                        weight: { type: "NUMBER", description: "0.3 = minor mention, 0.6 = significant, 1.0 = dominant theme" },
                        color: { type: "STRING", description: "Hex color: #FF8C00 work, #00BFA5 home, #E91E63 health, #7C4DFF money" }
                    },
                    required: ["topic", "weight", "color"]
                }
            },
            {
                name: "connect_topics",
                description: "Link two topic circles or person circles together to show a mental relationship. Use to visualize contradictions, causes, or connections.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        sourceId: { type: "STRING", description: "The ID of the first node (e.g., 'topic-الشغل' or '1')" },
                        targetId: { type: "STRING", description: "The ID of the second node" },
                        strength: { type: "NUMBER", description: "0.2 = weak/loose, 0.6 = standard, 1.0 = vital connection" },
                        type: { type: "STRING", description: "Relationship type: 'link', 'conflict', 'cause', 'insight'" }
                    },
                    required: ["sourceId", "targetId", "strength"]
                }
            }
        ]
    }
];

export const buildToolBundle = (allowedToolNames = []) => {
    const allowedSet = new Set(allowedToolNames);
    return tools.map((toolGroup) => ({
        ...toolGroup,
        functionDeclarations: (toolGroup.functionDeclarations || []).filter((tool) => allowedSet.has(tool.name)),
    })).filter((toolGroup) => (toolGroup.functionDeclarations || []).length > 0);
};

export const DEFAULT_DAWAYIR_TOOL_NAMES = [
    'update_node',
    'highlight_node',
    'get_expert_insight',
    'save_mental_map',
    'generate_session_report',
    'create_truth_contract',
    'update_journey',
    'spawn_other',
    'spawn_topic',
    'connect_topics',
];

export const HYBRID_DAWAYIR_TOOL_NAMES = [
    'update_node',
    'update_journey',
];

export const defaultDawayirTools = buildToolBundle(DEFAULT_DAWAYIR_TOOL_NAMES);
export const hybridDawayirTools = buildToolBundle(HYBRID_DAWAYIR_TOOL_NAMES);
