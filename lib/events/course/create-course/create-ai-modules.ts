import { Event } from "@/models/Event";
import { courseSchema } from "@/schema/course/get-modules-schems";
import { groq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";

type CourseModuleType = z.infer<typeof courseSchema>;

// Teaching style guide based on famous educators
const TEACHING_STYLE_GUIDES = {
    general: `Use a clear, straightforward teaching approach with concise explanations.`,
    
    feynman: `Use Richard Feynman's teaching approach:
        1. Break down complex topics into simple, intuitive concepts
        2. Use everyday analogies and metaphors
        3. Focus on building deep understanding rather than memorization
        4. Explain concepts as if teaching to a complete beginner
        5. Emphasize fundamental principles over technical details`,
        
    mankiw: `Use Greg Mankiw's teaching approach:
        1. Present economic principles with clear real-world examples
        2. Structure content with key principles and applications
        3. Balance theoretical frameworks with practical implications
        4. Use policy applications to illustrate concepts
        5. Employ a methodical, step-by-step approach to complex topics`,
        
    krugman: `Use Paul Krugman's teaching approach:
        1. Focus on data-driven analysis and empirical evidence
        2. Present contrasting viewpoints with critical analysis
        3. Connect abstract concepts to current events and real-world scenarios
        4. Use accessible language while maintaining technical accuracy
        5. Emphasize the practical implications of theoretical concepts`,
        
    liskov: `Use Barbara Liskov's teaching approach:
        1. Present programming concepts with formal precision
        2. Emphasize abstractions and their implementations
        3. Focus on design principles and best practices
        4. Build concepts progressively from foundations to advanced topics
        5. Illustrate concepts with clear, minimal code examples`,
        
    knuth: `Use Donald Knuth's teaching approach:
        1. Present algorithms with mathematical rigor and precision
        2. Analyze content from first principles with thorough explanation
        3. Include detailed examples with step-by-step execution
        4. Balance theoretical foundations with practical implementation details
        5. Emphasize elegance and efficiency in problem-solving`
};

const getCourseModulesUsingAi = async (data : {
    name: string,
    currentLevel: string,
    mainOutcome: string,
    teachingStyle?: string,
}) => {
    try {
        // Default to general teaching style if none provided
        const teachingStyle = data.teachingStyle || 'general';
        const styleGuide = TEACHING_STYLE_GUIDES[teachingStyle as keyof typeof TEACHING_STYLE_GUIDES] || TEACHING_STYLE_GUIDES.general;
        
        // Using more explicit prompting to get the model to generate content
        const { object } = await generateObject({
            model: groq('qwen-qwq-32b'),
            schema: courseSchema,
            prompt: `
                Generate a comprehensive list of subtopics for a course titled "${data.name}".
                
                This course is for ${data.currentLevel} level students who want to ${data.mainOutcome}.
                
                ${styleGuide}
                
                The response MUST include detailed subtopics that cover all essential concepts.
                Each subtopic MUST have a clear title, detailed description, and be organized in logical order.
                
                For each subtopic, include:
                1. A descriptive title (without special characters or quotes in the title)
                2. A detailed explanation of what the subtopic covers
                3. Any prerequisites needed (optional) - make sure all strings in arrays have proper quotes
                4. A difficulty level (Beginner, Intermediate, or Advanced)
                5. The format type (TEXT, VIDEO, MD, or QUIZ)
                
                IMPORTANT: Your response MUST be properly formatted JSON with:
                - No trailing commas
                - All quotes properly escaped
                - All array brackets properly closed
                - All string values properly quoted
                
                Be thorough and comprehensive in your response.
            `,
        });
        
        return object;
    } catch (error) {
        console.error("Error generating AI modules:", error);
        
        // Add more specific error handling for JSON validation errors
        if (error instanceof Error && error.message.includes('json_validate_failed')) {
            console.error("JSON validation failed. The model generated invalid JSON.");
            
            // Return empty result to prevent application from crashing
            return {
                name: data.name,
                subtopics: []
            };
        }
        
        throw error;
    }
}

export const createAiModulesEvent = new Event("create-ai-modules", "Create AI Modules", "Create AI Modules", getCourseModulesUsingAi);