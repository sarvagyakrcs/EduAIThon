"use client"

import { ModuleProgress } from '@prisma/client'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Text } from '@/components/ui/text'
import { Flame } from 'lucide-react'

type CourseStreakProps = {
  moduleProgress: ModuleProgress[]
}

const CourseStreak = ({ moduleProgress }: CourseStreakProps) => {
  const [currentStreak, setCurrentStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)

  useEffect(() => {
    if (!moduleProgress.length) return

    // Sort progress by completion date
    const sortedProgress = [...moduleProgress]
      .filter(p => p.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())

    if (sortedProgress.length === 0) return

    // Calculate current streak
    let streak = 1
    let currentDate = new Date(sortedProgress[0].completedAt!)
    let longestStreakCount = 1
    let tempStreak = 1

    for (let i = 1; i < sortedProgress.length; i++) {
      const prevDate = new Date(sortedProgress[i].completedAt!)
      const dayDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))

      if (dayDiff === 1) {
        streak++
        tempStreak++
        currentDate = prevDate
      } else if (dayDiff === 0) {
        // Same day, continue streak
        continue
      } else {
        // Streak broken
        longestStreakCount = Math.max(longestStreakCount, tempStreak)
        tempStreak = 1
        currentDate = prevDate
      }
    }

    // Check if streak is still active (completed something today or yesterday)
    const lastCompletion = new Date(sortedProgress[0].completedAt!)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (
      lastCompletion.toDateString() !== today.toDateString() &&
      lastCompletion.toDateString() !== yesterday.toDateString()
    ) {
      streak = 0
    }

    setCurrentStreak(streak)
    setLongestStreak(Math.max(longestStreakCount, tempStreak))
  }, [moduleProgress])

  if (currentStreak === 0) return null

  return (
    <div className="flex items-center gap-2">
      <Badge color="orange" className="flex items-center gap-1">
        <Flame className="h-3 w-3" />
        <span>{currentStreak} day streak</span>
      </Badge>
      {longestStreak > currentStreak && (
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
          Best: {longestStreak} days
        </Text>
      )}
    </div>
  )
}

export default CourseStreak 