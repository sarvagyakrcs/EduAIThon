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
    
    // Check for API key
    if (!process.env.GROQ_API_KEY) {
      console.error("Missing GROQ_API_KEY environment variable");
      return NextResponse.json(
        { error: "API configuration error. Please contact the administrator." },
        { status: 500 }
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

Each entry in the JSON array MUST follow this EXACT structure (ALL FIELDS ARE REQUIRED unless otherwise noted):
{
  "title": "Course Name or Activity", 
  "description": "Brief description of what will be done", 
  "dayOfWeek": 1, 
  "startTime": "09:00", 
  "endTime": "10:30", 
  "courseId": "optional-course-id-if-applicable", 
  "scientificPrinciple": "optional scientific principle" 
}

IMPORTANT JSON FORMATTING RULES:
1. Use double quotes (not single quotes) around all string values and property names
2. For time values, use the format "HH:MM" with quotes around the time string
3. Do not use quotes around numeric values like dayOfWeek
4. Ensure proper comma placement between properties and between array elements
5. Do not add trailing commas at the end of property lists or arrays
6. Follow valid JSON syntax exactly

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

CRITICAL REQUIREMENTS:
- Every entry MUST have title, description, dayOfWeek, startTime, and endTime fields
- dayOfWeek MUST be a number: 0 = today, 1 = tomorrow, 2 = day after tomorrow, etc. (0-6 for the next 7 days)
- startTime and endTime MUST be in 24-hour format, like "09:00" or "14:30"
- Make sure to space out the entries appropriately across the week
- Consider reasonable class durations (usually 1-2 hours) and include breaks
- Ensure there are no time conflicts in the schedule
- Do not add any additional fields not specified in the structure above

IMPORTANT: Your response MUST be ONLY a valid parseable JSON array. Do not include any explanations, comments, or markdown formatting before or after the JSON.
`;

    // Call Groq API directly
    let groqResponse;
    try {
      if (!process.env.GROQ_API_KEY) {
        throw new Error("Missing GROQ_API_KEY environment variable");
      }
      
      groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama3-70b-8192",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2, // Lower temperature for more consistent, predictable output
        }),
      });
      
      if (!groqResponse.ok) {
        const error = await groqResponse.json();
        console.error("Groq API error details:", error);
        throw new Error(`Groq API error: ${JSON.stringify(error)}`);
      }
    } catch (apiError) {
      console.error("Error calling Groq API:", apiError);
      
      // Create a simple fallback timetable
      return NextResponse.json({
        entries: [
          {
            title: "Sample Class Session",
            description: "This is a sample entry. The AI timetable generator is currently unavailable.",
            dayOfWeek: 0, // Today
            startTime: new Date(new Date().setHours(9, 0, 0, 0)),
            endTime: new Date(new Date().setHours(10, 30, 0, 0)),
            courseId: courseIds && courseIds.length > 0 ? courseIds[0] : null,
            color: "#4285F4",
            scientificPrinciple: "Regular scheduled classes improve learning outcomes through consistent practice."
          },
          {
            title: "Study Session",
            description: "Time to review materials and prepare for upcoming classes",
            dayOfWeek: 1, // Tomorrow
            startTime: new Date(new Date().setHours(14, 0, 0, 0)),
            endTime: new Date(new Date().setHours(16, 0, 0, 0)),
            courseId: null,
            color: "#34A853",
            scientificPrinciple: "Spaced repetition enhances long-term knowledge retention."
          }
        ]
      });
    }

    const result = await groqResponse.json();
    
    // Log the entire result for debugging
    console.log("Full Groq API result:", JSON.stringify(result, null, 2));
    
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      console.error("Unexpected Groq API response structure:", result);
      throw new Error("Groq API returned an unexpected response structure");
    }
    
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
          
          try {
            // Advanced JSON cleaning
            console.log("Attempting advanced JSON cleaning");
            
            // 1. Remove any JS-style comments
            jsonStr = jsonStr.replace(/\/\/.*$/gm, ""); // Remove single line comments
            jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, ""); // Remove multi-line comments
            
            // 2. Fix incorrect quotes in time strings (e.g., "07":30" -> "07:30")
            jsonStr = jsonStr.replace(/"(\d+)":(\d+)"/g, '"$1:$2"');
            
            // 3. Fix missing description field (e.g., "title": "Dinner", "Eat a...")
            jsonStr = jsonStr.replace(/"([^"]+)",\s*"([^"]+)"/g, (match: string, p1: string, p2: string) => {
              // Check if this looks like a missing "description": field
              if (p1 && p2 && !p1.includes(":") && !p2.includes(":")) {
                return `"${p1}", "description": "${p2}"`;
              }
              return match;
            });
            
            // 4. Fix missing dayOfWeek field (e.g., "description": "...", 0, "startTime": "...")
            jsonStr = jsonStr.replace(/("description"\s*:\s*"[^"]*"),\s*(\d+),\s*("startTime")/g, 
              '$1, "dayOfWeek": $2, $3');
            
            // 5. Fix missing startTime field (e.g., "description": "...", "15:30", "endTime": "...")
            jsonStr = jsonStr.replace(/("description"\s*:\s*"[^"]*"),\s*"(\d+:\d+)",\s*("endTime")/g, 
              '$1, "startTime": "$2", $3');
            
            // 6. Ensure property names are quoted
            jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
            
            // 7. Replace single quotes with double quotes for values
            jsonStr = jsonStr.replace(/:\s*'([^']*)'/g, ': "$1"');
            
            // 8. Clean up trailing commas which are valid in JS but not in JSON
            jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");
            
            console.log("Cleaned JSON:", jsonStr);
            
            try {
              timetableEntries = JSON.parse(jsonStr);
            } catch (cleanParseError) {
              console.error("Clean parsing failed:", cleanParseError);
              
              // Try a more aggressive approach - reconstruct the entire array
              console.log("Attempting to reconstruct JSON by extracting valid objects");
              
              // Extract all potential JSON objects from the array
              const objectsMatch = jsonStr.match(/\{[^{]*?\}/g);
              if (objectsMatch) {
                // Try to parse each object individually
                const validObjects = [];
                for (const objStr of objectsMatch) {
                  try {
                    // Do a final clean on each object
                    let cleanObjStr = objStr;
                    // Fix any remaining syntax errors in individual objects
                    cleanObjStr = cleanObjStr.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
                    
                    const obj = JSON.parse(cleanObjStr);
                    validObjects.push(obj);
                  } catch (e) {
                    console.warn("Couldn't parse object:", objStr);
                  }
                }
                
                if (validObjects.length > 0) {
                  console.log(`Reconstructed array with ${validObjects.length} valid objects`);
                  timetableEntries = validObjects;
                } else {
                  throw new Error("Failed to extract any valid objects from JSON");
                }
              } else {
                throw new Error("Failed to extract JSON objects from response");
              }
            }
          } catch (advancedParseError: unknown) {
            console.error("Advanced JSON parsing failed:", advancedParseError);
            const errorMessage = advancedParseError instanceof Error 
              ? advancedParseError.message 
              : 'Unknown error';
            throw new Error("Failed to parse JSON despite attempted repairs: " + errorMessage);
          }
        } else {
          throw new Error("Failed to extract JSON from response");
        }
      }
      
      // Validate that we have an array
      if (!Array.isArray(timetableEntries)) {
        throw new Error("API response is not an array of timetable entries");
      }
      
      // Check if the array is empty
      if (timetableEntries.length === 0) {
        throw new Error("API returned an empty array of timetable entries");
      }
      
      // Perform basic validation on each entry
      timetableEntries = timetableEntries.filter(entry => {
        if (!entry || typeof entry !== 'object') {
          console.warn("Filtered out invalid entry (not an object):", entry);
          return false;
        }
        
        // Check for critical required fields
        if (!entry.title) {
          console.warn("Filtered out entry without title:", entry);
          return false;
        }
        
        return true;
      });
      
      // Ensure we still have entries after filtering
      if (timetableEntries.length === 0) {
        throw new Error("All timetable entries were invalid");
      }
      
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      console.error("Raw response was:", rawResponse);
      console.error("Response type:", typeof rawResponse);
      // Try to log the first part of the response
      if (typeof rawResponse === 'string') {
        console.error("First 200 chars:", rawResponse.slice(0, 200));
        // Try to find sections that look like JSON
        const possibleJsonParts = rawResponse.match(/\{[\s\S]*?\}|\[[\s\S]*?\]/g);
        if (possibleJsonParts) {
          console.error("Possible JSON parts found:", possibleJsonParts.length);
          possibleJsonParts.forEach((part, i) => {
            console.error(`Part ${i} (${part.length} chars):`, part.slice(0, 100));
          });
        } else {
          console.error("No possible JSON parts found in the response");
        }
      }
      return NextResponse.json(
        { error: "Failed to generate valid timetable. The AI response couldn't be parsed." },
        { status: 500 }
      );
    }

    // Process entries to ensure they have the right format
    const processedEntries = timetableEntries.map((entry: any) => {
      try {
        // Validate essential properties
        if (!entry) {
          console.warn("Skipping null or undefined entry");
          return null;
        }
        
        if (typeof entry !== 'object') {
          console.warn("Skipping non-object entry:", entry);
          return null;
        }
        
        // Essential properties with defaults
        const title = typeof entry.title === 'string' ? entry.title : "Untitled Event";
        const description = typeof entry.description === 'string' ? entry.description : "";
        
        // Find matching course if courseId is not provided but title matches a course name
        let courseId = entry.courseId;
        if (!courseId && title) {
          const matchedCourse = courses.find(
            (c) => c.name.toLowerCase() === title.toLowerCase()
          );
          if (matchedCourse) {
            courseId = matchedCourse.id;
          }
        }

        // Safely get dayOfWeek or default to 0 (Sunday)
        const dayOfWeek = typeof entry.dayOfWeek === 'number' ? 
          Math.min(Math.max(0, entry.dayOfWeek), 6) : 0; // Clamp between 0-6
        
        // Default to current time if startTime or endTime is missing
        const currentDate = new Date();
        const defaultTime = `${currentDate.getHours()}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
        
        // Handle string or date objects for times
        let startTimeStr = entry.startTime;
        let endTimeStr = entry.endTime;
        
        // Convert Date objects to strings if needed
        if (startTimeStr instanceof Date) {
          startTimeStr = `${startTimeStr.getHours()}:${startTimeStr.getMinutes().toString().padStart(2, '0')}`;
        }
        
        if (endTimeStr instanceof Date) {
          endTimeStr = `${endTimeStr.getHours()}:${endTimeStr.getMinutes().toString().padStart(2, '0')}`;
        }
        
        // Ensure we have strings
        startTimeStr = typeof startTimeStr === 'string' ? startTimeStr : defaultTime;
        endTimeStr = typeof endTimeStr === 'string' ? endTimeStr : defaultTime;
        
        // Validate time format (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
        if (!timeRegex.test(startTimeStr)) {
          console.warn(`Invalid startTime format: ${startTimeStr}, using default`);
          startTimeStr = defaultTime;
        }
        
        if (!timeRegex.test(endTimeStr)) {
          console.warn(`Invalid endTime format: ${endTimeStr}, using default`);
          endTimeStr = defaultTime;
        }
        
        // Parse time values
        const [hours, minutes] = startTimeStr.split(':').map(Number);
        const [endHours, endMinutes] = endTimeStr.split(':').map(Number);
        
        // Use the current date as base date and add dayOfWeek days
        const now = new Date();
        const baseDate = new Date(now);
        baseDate.setHours(0, 0, 0, 0); // Start at midnight
        baseDate.setDate(baseDate.getDate() + dayOfWeek); // Add days from today
        
        const startTime = new Date(baseDate);
        startTime.setHours(hours, minutes, 0, 0);
        
        const endTime = new Date(baseDate);
        endTime.setHours(endHours, endMinutes, 0, 0);
        
        // If end time is before start time, add 24 hours to end time
        if (endTime < startTime) {
          endTime.setDate(endTime.getDate() + 1);
        }

        // Color validation - ensure it's a valid hex color or generate one
        let color = entry.color;
        if (!color || typeof color !== 'string' || !color.match(/^#([0-9A-F]{3}){1,2}$/i)) {
          color = generateRandomColor();
        }

        return {
          title,
          description,
          dayOfWeek,
          startTime,
          endTime,
          courseId: courseId || null,
          color,
          scientificPrinciple: typeof entry.scientificPrinciple === 'string' ? entry.scientificPrinciple : null,
        };
      } catch (error) {
        console.error("Error processing entry:", error, entry);
        return null;
      }
    }).filter(entry => entry !== null); // Remove any null entries from processing errors

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