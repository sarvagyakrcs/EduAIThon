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

    if (!name || !entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: "Name and at least one entry is required" },
        { status: 400 }
      );
    }

    // Create the timetable and its entries in a transaction
    const timetable = await prisma.$transaction(async (tx) => {
      // Create the timetable
      const newTimetable = await tx.timetable.create({
        data: {
          name,
          description,
          userId,
        },
      });

      // Create all the entries for this timetable
      await tx.timetableEntry.createMany({
        data: entries.map((entry) => ({
          title: entry.title,
          description: entry.description || "",
          startTime: new Date(entry.startTime),
          endTime: new Date(entry.endTime),
          dayOfWeek: entry.dayOfWeek,
          courseId: entry.courseId || undefined,
          color: entry.color,
          timetableId: newTimetable.id,
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
      { error: "Failed to save timetable" },
      { status: 500 }
    );
  }
} 