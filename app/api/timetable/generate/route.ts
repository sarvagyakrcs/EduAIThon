import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { description, courseIds } = await req.json();

    if (!description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    // Fetch courses information
    const courses = await prisma.course.findMany({
      where: {
        id: {
          in: courseIds || [],
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    // Format courses for the prompt
    const coursesText = courses.map((c) => 
      `- ${c.name} (ID: ${c.id}): ${c.description || 'No description'}`
    ).join('\n');

    // Create a simple prompt as a string
    const prompt = `
You are an AI assistant specialized in creating weekly timetables for college students.

Based on the following description and courses, create a detailed weekly schedule.
Your response MUST be a valid JSON array containing timetable entries.

User description: ${description}

Courses to include:
${coursesText}

Each entry in the JSON array should follow this exact structure (don't include comments in your response):
{
  "title": "Course Name or Activity",
  "description": "Brief description of what will be done",
  "dayOfWeek": 1,
  "startTime": "HH:MM",
  "endTime": "HH:MM",
  "courseId": "optional-course-id-if-applicable",
  "scientificPrinciple": "optional scientific principle supporting this activity (only for wellness activities)"
}

IMPORTANT INSTRUCTIONS:
1. Parse the user's description carefully for mentions of:
   - College class times (e.g., "I go to college at 9 AM")
   - Work or job commitments (e.g., "I work Tuesday afternoons")
   - Personal activities (e.g., "I have gym on Mondays")
   - Study times or preferences
   - Commute needs (e.g., "It takes me 30 minutes to get to college")

2. Create appropriate entries for ALL activities mentioned in the description, not just course-related activities

3. AUTOMATICALLY include these essential wellness activities based on scientific principles:
   - Sleep: Schedule 7-9 hours of sleep each night (e.g., 11:00 PM to 7:00 AM), with consistent sleep and wake times
   - Meal times: Schedule regular breakfast, lunch, and dinner times
   - Exercise: Add at least 30 minutes of physical activity 3-5 days per week
   - Study breaks: For every 1-2 hours of focused study, add a 10-15 minute break
   - Relaxation: Schedule at least 30 minutes daily for mindfulness, meditation, or relaxation
   - Social time: Include some social activities or free time for maintaining relationships

4. For each wellness activity, include a brief "scientificPrinciple" field explaining the evidence-based reasoning
   (e.g., "Regular exercise improves cognitive function and reduces stress hormones")

5. For non-course activities mentioned in the description (like "college", "work", "study time", etc.), create entries with appropriate titles and descriptions

Notes:
- dayOfWeek should be a number: 0 = Sunday, 1 = Monday, etc.
- startTime and endTime should be in 24-hour format, like "09:00" or "14:30"
- Make sure to space out the entries appropriately across the week
- Consider reasonable class durations (usually 1-2 hours) and include breaks
- Ensure there are no time conflicts in the schedule

IMPORTANT: Your response MUST be ONLY a valid parseable JSON array. Do not include any explanations, comments, or markdown formatting before or after the JSON.
`;

    // Call Groq API directly
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!groqResponse.ok) {
      const error = await groqResponse.json();
      throw new Error(`Groq API error: ${JSON.stringify(error)}`);
    }

    const result = await groqResponse.json();
    const rawResponse = result.choices[0].message.content;
    console.log("Raw AI response:", rawResponse);

    // Extract the JSON from the response
    let timetableEntries;
    try {
      // Try to parse directly first
      try {
        timetableEntries = JSON.parse(rawResponse);
      } catch (directParseError) {
        console.log("Direct parsing failed, trying to extract JSON using regex");
        
        // If direct parsing fails, try to extract JSON using regex
        const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
          let jsonStr = jsonMatch[0];
          
          // Remove JS-style comments that might be in the response
          jsonStr = jsonStr.replace(/\/\/.*$/gm, ""); // Remove single line comments
          jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, ""); // Remove multi-line comments
          
          // Clean up trailing commas which are valid in JS but not in JSON
          jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");
          
          console.log("Cleaned JSON:", jsonStr);
          
          try {
            timetableEntries = JSON.parse(jsonStr);
          } catch (regexParseError) {
            console.error("Regex parsing failed:", regexParseError);
            
            // Last resort: Try to manually fix common JSON issues
            jsonStr = jsonStr.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":'); // Ensure property names are quoted
            jsonStr = jsonStr.replace(/:\s*'([^']*)'/g, ': "$1"'); // Replace single quotes with double quotes
            
            console.log("Manual clean attempt:", jsonStr);
            timetableEntries = JSON.parse(jsonStr);
          }
        } else {
          throw new Error("Failed to extract JSON from response");
        }
      }
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      console.error("Raw response was:", rawResponse);
      return NextResponse.json(
        { error: "Failed to generate valid timetable. The AI response couldn't be parsed." },
        { status: 500 }
      );
    }

    // Process entries to ensure they have the right format
    const processedEntries = timetableEntries.map((entry: any) => {
      // Find matching course if courseId is not provided but title matches a course name
      let courseId = entry.courseId;
      if (!courseId && entry.title) {
        const matchedCourse = courses.find(
          (c) => c.name.toLowerCase() === entry.title.toLowerCase()
        );
        if (matchedCourse) {
          courseId = matchedCourse.id;
        }
      }

      // Convert time strings to Date objects
      const [hours, minutes] = entry.startTime.split(':').map(Number);
      const [endHours, endMinutes] = entry.endTime.split(':').map(Number);
      
      // Use a base date (e.g., Jan 1, 2023) + day of week for consistency
      const baseDate = new Date(2023, 0, 1 + entry.dayOfWeek);
      
      const startTime = new Date(baseDate);
      startTime.setHours(hours, minutes, 0, 0);
      
      const endTime = new Date(baseDate);
      endTime.setHours(endHours, endMinutes, 0, 0);

      return {
        title: entry.title,
        description: entry.description || "",
        dayOfWeek: entry.dayOfWeek,
        startTime,
        endTime,
        courseId: courseId || null,
        color: entry.color || generateRandomColor(),
        scientificPrinciple: entry.scientificPrinciple || null,
      };
    });

    return NextResponse.json({ entries: processedEntries });
  } catch (error) {
    console.error("Error generating timetable:", error);
    return NextResponse.json(
      { error: "Failed to generate timetable" },
      { status: 500 }
    );
  }
}

// Helper function to generate random colors for events
function generateRandomColor() {
  const colors = [
    "#4285F4", // Google Blue
    "#34A853", // Google Green
    "#FBBC05", // Google Yellow
    "#EA4335", // Google Red
    "#8AB4F8", // Light Blue
    "#81C995", // Light Green
    "#FDD663", // Light Yellow
    "#F28B82", // Light Red
    "#D2E3FC", // Pale Blue
    "#CEEAD6", // Pale Green
    "#FEF7B2", // Pale Yellow
    "#FADAD7", // Pale Red
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
} 