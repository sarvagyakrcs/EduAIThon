import { ThemeToggle } from '@/components/global/mode-toggle'
import ProtectedLayout from '@/layouts/protected/protected-layout'
import { auth } from '@/auth'
import React from 'react'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'

type Props = {
    children: React.ReactNode
}

const Layout = async ({ children }: Props) => {
  const session = await auth();
    
  const courseList = await prisma.userCourse.findMany({
    where: {
      userId: session?.user?.id
    },
    include: {
      course: {
        select: {
          name: true,
          description: true,
        }
      }
    },
    take: 5,
    orderBy: {
      createdAt: 'desc'
    }
  })
  
  const numberOfUnreadNotifications = await prisma.notification.count({
    where: {
      userId: session?.user?.id,
      read: false
    }
  })

  // Fetch module progress data
  const moduleProgress = await prisma.moduleProgress.findMany({
    where: {
      module: {
        course: {
          userCourses: {
            some: {
              userId: session?.user?.id
            }
          }
        }
      }
    },
    orderBy: {
      completedAt: 'desc'
    }
  })
  
  return (
    <ProtectedLayout 
      session={session}
      courseList={courseList}
      numberOfUnreadNotifications={numberOfUnreadNotifications}
      moduleProgress={moduleProgress}
    >
      { children }
      <div className="hidden md:block">
        <ThemeToggle />
      </div>
    </ProtectedLayout>
  )
}

export default Layout