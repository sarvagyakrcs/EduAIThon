import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { 
      timetableId, 
      title, 
      description, 
      startTime, 
      endTime, 
      dayOfWeek,
      courseId,
      color 
    } = await req.json();

    if (!timetableId || !title) {
      return NextResponse.json(
        { error: "Timetable ID and title are required" },
        { status: 400 }
      );
    }

    // Verify the timetable belongs to the user
    const timetable = await prisma.timetable.findFirst({
      where: {
        id: timetableId,
        userId: session.user.id
      }
    });

    if (!timetable) {
      return NextResponse.json(
        { error: "Timetable not found or access denied" },
        { status: 404 }
      );
    }

    // Process and validate dates
    let parsedStartTime: Date;
    let parsedEndTime: Date;
    let validDayOfWeek: number;

    try {
      // Parse startTime
      if (startTime) {
        parsedStartTime = new Date(startTime);
        if (isNaN(parsedStartTime.getTime())) {
          throw new Error("Invalid start time format");
        }
      } else {
        // Default to current time
        parsedStartTime = new Date();
      }

      // Parse endTime
      if (endTime) {
        parsedEndTime = new Date(endTime);
        if (isNaN(parsedEndTime.getTime())) {
          throw new Error("Invalid end time format");
        }
      } else {
        // Default to one hour after start time
        parsedEndTime = new Date(parsedStartTime);
        parsedEndTime.setHours(parsedEndTime.getHours() + 1);
      }

      // Validate end time is after start time
      if (parsedEndTime <= parsedStartTime) {
        throw new Error("End time must be after start time");
      }

      // Validate dayOfWeek is between 0-6, where 0 is today, 1 is tomorrow, etc.
      if (dayOfWeek !== undefined && typeof dayOfWeek === 'number') {
        // Keep dayOfWeek within range 0-6
        validDayOfWeek = Math.min(Math.max(0, Math.floor(dayOfWeek)), 6);
      } else {
        // Default to today (0)
        validDayOfWeek = 0;
      }
    } catch (error) {
      console.error("Error processing date/time values:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid date format" },
        { status: 400 }
      );
    }

    // Create the new entry
    const entry = await prisma.timetableEntry.create({
      data: {
        title,
        description: description || "",
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        dayOfWeek: validDayOfWeek,
        courseId: courseId || undefined,
        color: color || "#4285F4",
        timetableId
      }
    });

    return NextResponse.json({ 
      success: true, 
      entry,
      debugInfo: {
        parsedStartTime: parsedStartTime.toISOString(),
        parsedEndTime: parsedEndTime.toISOString(),
        validDayOfWeek
      }
    });
  } catch (error) {
    console.error("Error adding timetable entry:", error);
    return NextResponse.json(
      { error: "Failed to add entry: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 }
    );
  }
} 