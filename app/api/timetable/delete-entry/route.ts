import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the entry ID from the URL
    const entryId = req.nextUrl.searchParams.get("id");
    
    if (!entryId) {
      return NextResponse.json(
        { error: "Entry ID is required" },
        { status: 400 }
      );
    }

    // Find the entry and check if it belongs to a timetable owned by the user
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

    // Delete the entry
    await prisma.timetableEntry.delete({
      where: {
        id: entryId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting timetable entry:", error);
    return NextResponse.json(
      { error: "Failed to delete entry" },
      { status: 500 }
    );
  }
} 