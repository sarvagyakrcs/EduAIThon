import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

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
    const validEntries = entries.filter(entry => {
      if (!entry || typeof entry !== 'object') {
        console.warn("Invalid entry - not an object:", entry);
        return false;
      }
      
      if (!entry.title || typeof entry.title !== 'string') {
        console.warn("Invalid entry - missing title:", entry);
        return false;
      }
      
      if (!entry.startTime || !entry.endTime) {
        console.warn("Invalid entry - missing start or end time:", entry);
        return false;
      }
      
      if (typeof entry.dayOfWeek !== 'number' || entry.dayOfWeek < 0 || entry.dayOfWeek > 6) {
        console.warn("Invalid entry - invalid dayOfWeek:", entry);
        return false;
      }
      
      return true;
    });
    
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
        data: validEntries.map((entry) => {
          // Ensure dates are properly handled
          let startTime: Date;
          let endTime: Date;
          
          try {
            startTime = new Date(entry.startTime);
            endTime = new Date(entry.endTime);
            
            // Ensure valid dates
            if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
              throw new Error("Invalid date conversion");
            }
          } catch (err) {
            console.warn("Error converting dates for entry:", entry, err);
            // Use default times if conversion fails
            const baseDate = new Date(2023, 0, 1 + (entry.dayOfWeek || 0));
            startTime = new Date(baseDate);
            startTime.setHours(9, 0, 0, 0);
            
            endTime = new Date(baseDate);
            endTime.setHours(10, 0, 0, 0);
          }
          
          return {
            title: entry.title,
            description: typeof entry.description === 'string' ? entry.description : "",
            startTime,
            endTime,
            dayOfWeek: typeof entry.dayOfWeek === 'number' ? 
              Math.min(Math.max(0, entry.dayOfWeek), 6) : 0,
            courseId: entry.courseId || undefined,
            color: entry.color || "#4285F4",
            timetableId: newTimetable.id,
            scientificPrinciple: typeof entry.scientificPrinciple === 'string' ? 
              entry.scientificPrinciple : null,
          };
        }),
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
      { error: "Failed to save timetable" },
      { status: 500 }
    );
  }
} 