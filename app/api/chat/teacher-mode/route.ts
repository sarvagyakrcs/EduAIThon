import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { groq } from '@ai-sdk/groq'
import { streamText } from 'ai'

// Remove edge runtime to avoid node:child_process issues
// export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { messages, moduleId } = await req.json()
    
    if (!moduleId) {
      return new Response('Module ID is required', { status: 400 })
    }

    // Fetch module details with selective query to reduce data size
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        id: true,
        name: true,
        description: true,
        content: true,
        moduleType: true,
        course: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    })

    if (!module) {
      return new Response('Module not found', { status: 404 })
    }

    // Create system message with context about the module
    const moduleContext = `
Module Name: ${module.name}
Module Description: ${module.description || 'No description provided'}
Course Name: ${module.course.name}
Course Description: ${module.course.description || 'No description provided'}
Module Content: ${module.content || 'No content provided'}
    `.trim()

    const systemPrompt = `You are an AI student who is ACTIVELY LEARNING from a human teacher (the user).
The teacher is practicing their teaching skills by explaining the following topic to you:
${moduleContext}

As a CURIOUS and ENGAGED student, your primary job is to:

1. Act like a real student who wants to truly understand the material - show enthusiasm for learning
2. Ask THOUGHTFUL QUESTIONS that help the teacher clarify their explanations and think more deeply about the topic
3. Express confusion in a constructive way when the teacher's explanation isn't clear
4. Challenge the teacher to explain concepts from different angles to reinforce their understanding 
5. Occasionally summarize what you've learned to check your understanding
6. Ask about real-world applications and examples
7. Make connections between concepts the teacher has explained

Your questions should:
- Be specific and targeted about aspects of the material
- Probe deeper understanding ("Why does that happen?" "How does this connect to...?")
- Ask for clarification on complex points
- Request examples that illustrate abstract concepts
- Challenge the teacher to explain implications or edge cases

IMPORTANT: You should act as a motivated, curious student who wants to understand the material deeply.
Your goal is to help the teacher improve their understanding by forcing them to explain concepts clearly.
The best teachers learn when teaching others - help make this experience valuable for them.

Start by being attentive and responsive to what the teacher explains, then build an increasingly sophisticated dialogue.
`

    // Generate a response stream using streamText
    const stream = streamText({
      model: groq("llama3-70b-8192"),
      system: systemPrompt,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content
      })),
      temperature: 0.7,
      maxTokens: 1000,
    })

    // Return the stream response
    return stream.toDataStreamResponse()
  } catch (error) {
    console.error('[TEACHER_CHAT_ERROR]', error)
    return new Response('Internal Server Error', { status: 500 })
  }
} 