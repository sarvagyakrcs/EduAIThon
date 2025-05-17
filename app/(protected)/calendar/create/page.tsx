import { prisma } from '@/lib/db/prisma';
import { auth } from '@/auth';
import React from 'react';
import TimetableCreator from '../_components/TimetableCreator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function CreateTimetablePage() {
  const session = await auth();
  
  // Get user courses for selecting in timetable creation
  const userCourses = await prisma.userCourse.findMany({
    where: {
      userId: session?.user.id
    },
    include: {
      course: true
    }
  });

  return (
    <div className="container mx-auto">
      <nav className='space-x-4'>
        <Link href="/calendar" >
          <Button plain className="gap-1 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4" />
            Back to Calendar
          </Button>
        </Link>
        
      </nav>
      <div className="max-w-2xl mx-auto">
        <TimetableCreator courses={userCourses.map(uc => uc.course)} />
      </div>
    </div>
  );
} 