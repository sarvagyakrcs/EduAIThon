import { prisma } from '@/lib/db/prisma';
import { auth } from '@/auth';
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, Calendar as CalendarIcon } from 'lucide-react';
import AdvancedCalendar from './_components/AdvancedCalendar';
import { Divider } from '@/components/ui/divider';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { StarField } from '@/components/ui/star-field';

export default async function CalendarPage() {
  const session = await auth();
  
  // Get saved timetables
  const timetables = await prisma.timetable.findMany({
    where: {
      userId: session?.user.id
    },
    include: {
      entries: {
        include: {
          course: {
            include: {
              modules: {
                select: {
                  id: true,
                  name: true,
                  moduleType: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  // Use the most recent timetable as default
  const activeTimetable = timetables.length > 0 ? timetables[0] : null;

  return (
    <div className="relative container mx-auto py-8 px-4 md:px-6 max-w-6xl">
      {/* Decorative background elements */}
      <div className="absolute right-0 top-20 -z-10 opacity-70 pointer-events-none hidden md:block">
        <StarField className="h-[35rem] w-[35rem] -translate-y-[10%] translate-x-[40%]" />
      </div>
      
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Your Calendar</h1>
              <Text className="text-sm text-muted-foreground">
                Manage your schedule and course timetables
              </Text>
            </div>
          </div>
          <Link href="/calendar/create">
            <Button color="sky" className="gap-2">
              <span className="hidden sm:inline">Create New Timetable</span>
              <span className="sm:hidden">New</span>
            </Button>
          </Link>
        </div>
        
        <Divider />
        
        {activeTimetable ? (
          <div className="mt-4">
            <AdvancedCalendar timetable={activeTimetable} />
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8 text-center">
            <div className="max-w-md mx-auto py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 mx-auto mb-6">
                <CalendarIcon className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-4">No Timetables Yet</h3>
              <Text className="text-zinc-500 dark:text-zinc-400 mb-8">
                Create your first timetable to start organizing your courses and schedule.
              </Text>
              <Link href="/calendar/create">
                <Button color="sky">
                  Create Your First Timetable
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}