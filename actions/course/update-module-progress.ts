'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/auth'

export async function updateModuleProgress(moduleId: string, completed: boolean) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
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

    return { success: true }
  } catch (error) {
    console.error('Error updating module progress:', error)
    return { success: false, error: 'Failed to update module progress' }
  }
} 