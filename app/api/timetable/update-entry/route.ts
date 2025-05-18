import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { 
      entryId, 
      dayOfWeek, 
      startTime, 
      endTime,
      title,
      description,
      color
    } = await req.json();

    if (!entryId) {
      return NextResponse.json(
        { error: "Entry ID is required" },
        { status: 400 }
      );
    }

    // Find the entry and make sure it belongs to the user
    const entry = await prisma.timetableEntry.findFirst({
      where: {
        id: entryId,
        timetable: {
          userId: session.user.id
        }
      },
      include: {
        timetable: true
      }
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Entry not found or access denied" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    // Process title if provided
    if (title !== undefined) {
      if (typeof title === 'string' && title.trim().length > 0) {
        updateData.title = title;
      } else {
        return NextResponse.json(
          { error: "Title cannot be empty" },
          { status: 400 }
        );
      }
    }

    // Process description if provided
    if (description !== undefined) {
      updateData.description = typeof description === 'string' ? description : '';
    }

    // Process color if provided
    if (color !== undefined) {
      updateData.color = typeof color === 'string' ? color : '#4285F4';
    }

    // Process dates and dayOfWeek
    try {
      // Process dayOfWeek if provided
      if (dayOfWeek !== undefined) {
        if (typeof dayOfWeek === 'number') {
          // dayOfWeek 0-6 where 0 is today, 1 is tomorrow, etc.
          updateData.dayOfWeek = Math.min(Math.max(0, Math.floor(dayOfWeek)), 6);
        } else {
          return NextResponse.json(
            { error: "dayOfWeek must be a number between 0 and 6" },
            { status: 400 }
          );
        }
      }

      // Process startTime if provided
      if (startTime !== undefined) {
        try {
          const parsedStartTime = new Date(startTime);
          if (isNaN(parsedStartTime.getTime())) {
            throw new Error("Invalid start time format");
          }
          updateData.startTime = parsedStartTime;
        } catch (error) {
          return NextResponse.json(
            { error: "Invalid start time format" },
            { status: 400 }
          );
        }
      }

      // Process endTime if provided
      if (endTime !== undefined) {
        try {
          const parsedEndTime = new Date(endTime);
          if (isNaN(parsedEndTime.getTime())) {
            throw new Error("Invalid end time format");
          }
          updateData.endTime = parsedEndTime;
        } catch (error) {
          return NextResponse.json(
            { error: "Invalid end time format" },
            { status: 400 }
          );
        }
      }

      // If both start and end times are provided, ensure end is after start
      if (updateData.startTime && updateData.endTime) {
        if (updateData.endTime <= updateData.startTime) {
          return NextResponse.json(
            { error: "End time must be after start time" },
            { status: 400 }
          );
        }
      }
    } catch (error) {
      console.error("Error processing date values:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid date or time value" },
        { status: 400 }
      );
    }

    // If no fields were updated, return early
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: "No changes to apply" },
        { status: 200 }
      );
    }

    // Update the entry
    const updatedEntry = await prisma.timetableEntry.update({
      where: {
        id: entryId
      },
      data: updateData
    });

    return NextResponse.json({ 
      success: true, 
      entry: updatedEntry,
      updatedFields: Object.keys(updateData)
    });
  } catch (error) {
    console.error("Error updating timetable entry:", error);
    return NextResponse.json(
      { error: "Failed to update entry: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 }
    );
  }
} 