'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { redis } from '@/lib/redis'

export async function updateModuleProgress(moduleId: string, completed: boolean) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }

    // Get the module to find its courseId
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      select: { courseId: true }
    })

    if (!module) {
      throw new Error('Module not found')
    }

    // Update or create module progress
    await prisma.moduleProgress.upsert({
      where: {
        moduleId,
      },
      update: {
        completed,
        completedAt: completed ? new Date() : null,
      },
      create: {
        moduleId,
        completed,
        completedAt: completed ? new Date() : null,
      },
    })

    // Invalidate Redis cache
    const redisKey = `course-modules-${module.courseId}`
    await redis.del(redisKey)

    // Revalidate the course page
    revalidatePath(`/courses/${module.courseId}`)
    revalidatePath(`/course/${module.courseId}`)

    return { success: true }
  } catch (error) {
    console.error('Error updating module progress:', error)
    return { success: false, error: 'Failed to update module progress' }
  }
} 