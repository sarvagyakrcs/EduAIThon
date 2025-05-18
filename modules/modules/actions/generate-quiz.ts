"use server"

import { Course, Module } from "@prisma/client"
import { prisma } from "@/lib/db/prisma"
import { groq } from "@ai-sdk/groq"
import { generateObject, generateText, NoObjectGeneratedError } from "ai"
import { z } from "zod"

// Define Zod schemas for validation
const OptionSchema = z.object({
  text: z.string().describe("Text of the answer option"),
  isCorrect: z.boolean().describe("Whether this option is the correct answer")
})

const QuestionSchema = z.object({
  question: z.string().describe("The question text"),
  options: z.array(OptionSchema).length(3).describe("Exactly 3 options per question, with exactly 1 correct answer")
})

const QuizSchema = z.object({
  title: z.string().describe("Title of the quiz"),
  description: z.string().optional().describe("Description of the quiz"),
  questions: z.array(QuestionSchema).min(3).max(20).describe("Between 3 and 20 questions")
})

// Define types based on the Zod schemas
type QuizOption = z.infer<typeof OptionSchema>;
type QuizQuestion = z.infer<typeof QuestionSchema>;
type QuizData = z.infer<typeof QuizSchema>;

export async function generateQuizFromModule(module: Module, course: Course) {
  try {
    console.log(`Generating quiz for module: ${module.name}`)
    
    // Extract relevant content from module and course for context
    const moduleContent = module.content || ""
    const moduleDescription = module.description || ""
    const courseName = course.name
    const courseDescription = course.description || ""
    const courseOutcomes = course.outcome || ""
    
    // First attempt with generateObject
    try {
      const { object: quizData } = await generateObject({
        model: groq("llama3-70b-8192"),
        schema: QuizSchema,
        schemaName: "Quiz",
        schemaDescription: "A quiz with questions and answer options",
        mode: "json", 
        system: `You are an expert educational assessment creator.
        Your task is to create a valid quiz in JSON format following the exact schema provided.
        Each question MUST have EXACTLY 3 options.
        Each question MUST have EXACTLY 1 option marked as correct (isCorrect: true).
        The output MUST be valid JSON that conforms to the schema.
        Do not include any explanations, markdown, or text outside the JSON structure.`,
        prompt: `Create a quiz for the following module in a course:

Module Name: ${module.name}
Module Type: ${module.moduleType}
Module Description: ${moduleDescription}
Module Content: ${moduleContent.substring(0, 1500)}

Course Context:
Course Name: ${courseName}
Course Description: ${courseDescription}
Course Outcomes: ${courseOutcomes}

Create a quiz with 15-20 questions that test knowledge of this module.
Each question MUST have EXACTLY 3 options, with EXACTLY 1 correct answer.

The response must be VALID JSON with this structure:
{
  "title": "Quiz title",
  "description": "Quiz description",
  "questions": [
    {
      "question": "Question text",
      "options": [
        { "text": "Option 1", "isCorrect": false },
        { "text": "Option 2", "isCorrect": true },
        { "text": "Option 3", "isCorrect": false }
      ]
    }
  ]
}`,
        temperature: 0.1,
        maxTokens: 2500,
      })
      
      // Save quiz to database
      const quiz = await saveQuizToDatabase(quizData, module.id)
      console.log(`Created quiz with ID: ${quiz.id}`)
      return quiz
      
    } catch (error) {
      console.error("First attempt failed, trying fallback method...")
      
      // Fallback method: Use generateText and parse the JSON manually
      try {
        const { text: rawJson } = await generateText({
          model: groq("llama3-70b-8192"),
          system: `You are an expert at creating valid JSON. Generate a quiz in JSON format that follows this structure exactly:
{
  "title": "Quiz title",
  "description": "Quiz description",
  "questions": [
    {
      "question": "Question text",
      "options": [
        { "text": "Option 1", "isCorrect": false },
        { "text": "Option 2", "isCorrect": true },
        { "text": "Option 3", "isCorrect": false }
      ]
    }
  ]
}
ONLY output valid JSON. Do not include any other text, markdown, or explanation.`,
          prompt: `Create a simple quiz for: ${module.name}
Generate 5 questions based on this content: ${moduleContent.substring(0, 1000)}
Each question MUST have EXACTLY 3 options with EXACTLY 1 correct answer.
ONLY output valid JSON.`,
          temperature: 0.1,
          maxTokens: 2000,
        })
        
        // Extract and parse the JSON
        let jsonString = extractJsonFromText(rawJson)
        const quizData = JSON.parse(jsonString) as QuizData
        
        // Validate with Zod
        const validatedQuizData = QuizSchema.parse(quizData)
        
        // Save quiz to database
        const quiz = await saveQuizToDatabase(validatedQuizData, module.id)
        console.log(`Created quiz with ID: ${quiz.id} (fallback method)`)
        return quiz
        
      } catch (fallbackError) {
        console.error("Fallback method failed:", fallbackError)
        
        // Last resort: Create a basic quiz manually
        const basicQuiz = createBasicQuiz(module.name)
        const quiz = await saveQuizToDatabase(basicQuiz, module.id)
        console.log(`Created basic quiz with ID: ${quiz.id} (last resort)`)
        return quiz
      }
    }
    
  } catch (error) {
    console.error("Error generating quiz:", error)
    throw new Error("Failed to generate quiz. Please try again later.")
  }
}

// Helper function to extract JSON from text that might have extra content
function extractJsonFromText(text: string): string {
  // Look for content between curly braces, accounting for nested structures
  const jsonMatch = text.match(/\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  // If no match, try to clean up the text
  return text.trim();
}

// Helper function to save quiz to database
async function saveQuizToDatabase(quizData: QuizData, moduleId: string) {
  return await prisma.quiz.create({
    data: {
      title: quizData.title,
      description: quizData.description || "",
      moduleId: moduleId,
      questions: {
        create: quizData.questions.map((q: QuizQuestion) => ({
          question: q.question,
          options: {
            create: q.options.map((o: QuizOption) => ({
              option: o.text,
              correct: o.isCorrect
            }))
          }
        }))
      }
    },
    include: {
      questions: {
        include: {
          options: true
        }
      }
    }
  })
}

// Create a basic quiz as last resort
function createBasicQuiz(moduleName: string): QuizData {
  return {
    title: `Quiz on ${moduleName}`,
    description: "Basic knowledge check for this module",
    questions: [
      {
        question: "What is this module about?",
        options: [
          { text: `${moduleName}`, isCorrect: true },
          { text: "Something else", isCorrect: false },
          { text: "None of the above", isCorrect: false }
        ]
      },
      {
        question: "Have you completed studying this module?",
        options: [
          { text: "Yes", isCorrect: true },
          { text: "No", isCorrect: false },
          { text: "Not sure", isCorrect: false }
        ]
      },
      {
        question: "What will you do next?",
        options: [
          { text: "Continue to the next module", isCorrect: true },
          { text: "Skip ahead", isCorrect: false },
          { text: "Quit the course", isCorrect: false }
        ]
      }
    ]
  }
} 