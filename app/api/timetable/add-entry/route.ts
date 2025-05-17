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

    if (!timetableId || !title || !startTime || !endTime || dayOfWeek === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // Create the new entry
    const entry = await prisma.timetableEntry.create({
      data: {
        title,
        description: description || "",
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        dayOfWeek,
        courseId: courseId || undefined,
        color: color || "#4285F4",
        timetableId
      }
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error("Error adding timetable entry:", error);
    return NextResponse.json(
      { error: "Failed to add entry" },
      { status: 500 }
    );
  }
} 