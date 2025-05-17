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

    // Only update fields that were provided
    if (dayOfWeek !== undefined) updateData.dayOfWeek = dayOfWeek;
    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (color) updateData.color = color;

    // Update the entry
    const updatedEntry = await prisma.timetableEntry.update({
      where: {
        id: entryId
      },
      data: updateData
    });

    return NextResponse.json({ success: true, entry: updatedEntry });
  } catch (error) {
    console.error("Error updating timetable entry:", error);
    return NextResponse.json(
      { error: "Failed to update entry" },
      { status: 500 }
    );
  }
} 