import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// Type definition for validated entries
interface ValidTimetableEntry {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  dayOfWeek: number;
  courseId: string | null;
  color: string;
  scientificPrinciple: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { name, description, entries } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Timetable name is required" },
        { status: 400 }
      );
    }

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: "Valid entries array is required" },
        { status: 400 }
      );
    }

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "At least one timetable entry is required" },
        { status: 400 }
      );
    }

    // Validate each entry has the required fields
    const validEntries: ValidTimetableEntry[] = [];
    
    for (const entry of entries) {
      try {
        if (!entry || typeof entry !== 'object') {
          console.warn("Invalid entry - not an object:", entry);
          continue;
        }
        
        if (!entry.title || typeof entry.title !== 'string') {
          console.warn("Invalid entry - missing title:", entry);
          continue;
        }
        
        if (!entry.startTime || !entry.endTime) {
          console.warn("Invalid entry - missing start or end time:", entry);
          continue;
        }
        
        // Create a base date that's the current day
        const now = new Date();
        const baseDate = new Date(now);
        baseDate.setHours(0, 0, 0, 0);
        
        // Normalize startTime to a Date object
        let startTime: Date;
        try {
          if (typeof entry.startTime === 'string') {
            if (entry.startTime.includes('T') || entry.startTime.includes('-')) {
              // ISO format string
              startTime = new Date(entry.startTime);
            } else if (entry.startTime.includes(':')) {
              // "HH:MM" format
              const [hours, minutes] = entry.startTime.split(':').map(Number);
              startTime = new Date(baseDate);
              startTime.setHours(hours, minutes, 0, 0);
            } else {
              // Fallback
              startTime = new Date(baseDate);
              startTime.setHours(9, 0, 0, 0);
            }
          } else if (entry.startTime instanceof Date) {
            startTime = entry.startTime;
          } else {
            startTime = new Date(baseDate);
            startTime.setHours(9, 0, 0, 0);
          }
        } catch (err) {
          console.warn("Error parsing startTime:", entry.startTime, err);
          startTime = new Date(baseDate);
          startTime.setHours(9, 0, 0, 0);
        }
        
        // Normalize endTime to a Date object
        let endTime: Date;
        try {
          if (typeof entry.endTime === 'string') {
            if (entry.endTime.includes('T') || entry.endTime.includes('-')) {
              // ISO format string
              endTime = new Date(entry.endTime);
            } else if (entry.endTime.includes(':')) {
              // "HH:MM" format
              const [hours, minutes] = entry.endTime.split(':').map(Number);
              endTime = new Date(baseDate);
              endTime.setHours(hours, minutes, 0, 0);
            } else {
              // Fallback
              endTime = new Date(baseDate);
              endTime.setHours(10, 0, 0, 0);
            }
          } else if (entry.endTime instanceof Date) {
            endTime = entry.endTime;
          } else {
            endTime = new Date(baseDate);
            endTime.setHours(10, 0, 0, 0);
          }
        } catch (err) {
          console.warn("Error parsing endTime:", entry.endTime, err);
          endTime = new Date(baseDate);
          endTime.setHours(10, 0, 0, 0);
        }
        
        // Validate that dates are valid
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          console.warn("Invalid entry - invalid date objects:", { startTime, endTime });
          continue;
        }
        
        // Make sure dayOfWeek is a number between 0-6, 
        // where 0 represents today, 1 is tomorrow, etc.
        let dayOfWeek: number;
        if (typeof entry.dayOfWeek === 'number') {
          dayOfWeek = Math.min(Math.max(0, Math.floor(entry.dayOfWeek)), 6);
        } else {
          // Default to today (0)
          dayOfWeek = 0;
        }
        
        // Format description properly
        const description = typeof entry.description === 'string' 
          ? entry.description 
          : '';
          
        // Validate course ID if provided
        const courseId = typeof entry.courseId === 'string' ? entry.courseId : null;
        
        // Add to valid entries
        validEntries.push({
          title: entry.title,
          description,
          startTime,
          endTime,
          dayOfWeek,
          courseId,
          color: typeof entry.color === 'string' ? entry.color : "#4285F4",
          scientificPrinciple: typeof entry.scientificPrinciple === 'string' ? entry.scientificPrinciple : null
        });
      } catch (error) {
        console.error("Error validating entry:", error, entry);
        // Skip invalid entries
        continue;
      }
    }
    
    if (validEntries.length === 0) {
      return NextResponse.json(
        { error: "No valid entries found after validation" },
        { status: 400 }
      );
    }

    // Create the timetable and its entries in a transaction
    const timetable = await prisma.$transaction(async (tx) => {
      // Create the timetable
      const newTimetable = await tx.timetable.create({
        data: {
          name,
          description: description || "",
          userId,
        },
      });

      // Create all the entries for this timetable
      await tx.timetableEntry.createMany({
        data: validEntries.map((entry) => ({
          title: entry.title,
          description: entry.description,
          startTime: entry.startTime,
          endTime: entry.endTime,
          dayOfWeek: entry.dayOfWeek,
          courseId: entry.courseId || undefined,
          color: entry.color,
          timetableId: newTimetable.id,
          scientificPrinciple: entry.scientificPrinciple
        })),
      });

      return newTimetable;
    });

    return NextResponse.json({ 
      success: true, 
      timetable: { 
        id: timetable.id,
        name: timetable.name 
      } 
    });
  } catch (error) {
    console.error("Error saving timetable:", error);
    return NextResponse.json(
      { error: "Failed to save timetable: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 }
    );
  }
} 