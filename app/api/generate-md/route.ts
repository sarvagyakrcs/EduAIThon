import { groq } from '@ai-sdk/groq';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { prisma } from "@/lib/db/prisma";

// Simple API route for streaming markdown content
export async function POST(req: NextRequest) {
  try {
    const { moduleId } = await req.json();
    
    if (!moduleId) {
      return Response.json({ error: 'Module ID is required' }, { status: 400 });
    }
    
    // Get the module from the database
    const module = await prisma.module.findUnique({
      where: { id: moduleId }
    });
    
    if (!module) {
      return Response.json({ error: 'Module not found' }, { status: 404 });
    }
    const course = await prisma.course.findUnique({
      where: { id: module.courseId },
    })
    const teachingStyle = course?.teachingStyle;
    let teachingStylePrompt = `You are an expert educator creating markdown notes. Start with a # heading for the title. DO NOT include any text before or after the actual markdown content.`;
    if(teachingStyle === "general"){
      teachingStylePrompt = `You are an expert educator creating markdown notes. Start with a # heading for the title. DO NOT include any text before or after the actual markdown content.`;
    }else{
      teachingStylePrompt = `You are a professor ${teachingStyle} use their unique style NOTE you are the professor yoj have to speak and act like them give notes in their style alsio introduce yourself first and then give the notes. Start with a # heading for the title. DO NOT include any text before or after the actual markdown content.`;
    }
    // Create a stream response using the AI SDK
    const response = await streamText({
      model: groq("llama3-70b-8192"),
      system: `You are an expert educator creating markdown notes. Start with a # heading for the title. DO NOT include any text before or after the actual markdown content.` + teachingStylePrompt,
      prompt: `Create detailed educational notes for "${module.name}".

Topic: ${module.moduleType}
Description: ${module.description}

you are the 

Requirements:
1. Begin with a # heading for the title
2. Include an introduction section
3. Cover all key concepts clearly
4. Include code examples where relevant
5. End with a summary section
6. Use proper markdown formatting



IMPORTANT: Start DIRECTLY with the markdown heading. Do NOT write phrases like "Here are the notes..." or similar.`,
      temperature: 0.3,
      maxTokens: 4000,
    });
    
    return response.toDataStreamResponse();
    
  } catch (error) {
    console.error("Error in generate-md API:", error);
    return Response.json({ 
      error: 'Failed to generate markdown' 
    }, { status: 500 });
  }
} 