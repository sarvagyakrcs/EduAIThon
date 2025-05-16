"use client"

import { ModuleProgress } from '@prisma/client'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { Calendar } from 'lucide-react'

type ContributionCalendarProps = {
  moduleProgress: ModuleProgress[]
}

const ContributionCalendar = ({ moduleProgress }: ContributionCalendarProps) => {
  const [contributionData, setContributionData] = useState<{ [key: string]: number }>({})
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)

  useEffect(() => {
    // Process module progress data into daily contributions
    const contributions: { [key: string]: number } = {}
    
    moduleProgress.forEach(progress => {
      if (progress.completedAt) {
        const date = new Date(progress.completedAt)
        const dateKey = date.toISOString().split('T')[0]
        contributions[dateKey] = (contributions[dateKey] || 0) + 1
      }
    })
    
    setContributionData(contributions)
  }, [moduleProgress])

  // Generate calendar data for the last 365 days
  const generateCalendarData = () => {
    const today = new Date()
    const calendarData = []
    
    for (let i = 0; i < 365; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateKey = date.toISOString().split('T')[0]
      const count = contributionData[dateKey] || 0
      
      calendarData.push({
        date: dateKey,
        count,
        level: count === 0 ? 0 : count < 3 ? 1 : count < 5 ? 2 : 3
      })
    }
    
    return calendarData
  }

  const calendarData = generateCalendarData()
  const totalContributions = Object.values(contributionData).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Badge color="emerald" className="mb-1">
            <Calendar className="mr-1 h-4 w-4" />
            <span>Learning Activity</span>
          </Badge>
          <Heading level={3} className="text-xl font-bold">Contribution Calendar</Heading>
        </div>
        <Text className="text-sm text-zinc-500 dark:text-zinc-400">
          {totalContributions} modules completed
        </Text>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="grid grid-cols-53 gap-1">
          {calendarData.map((day, index) => (
            <div
              key={day.date}
              className={`relative h-3 w-3 rounded-sm transition-colors ${
                day.level === 0 ? 'bg-zinc-100 dark:bg-zinc-800' :
                day.level === 1 ? 'bg-emerald-200 dark:bg-emerald-900' :
                day.level === 2 ? 'bg-emerald-400 dark:bg-emerald-700' :
                'bg-emerald-600 dark:bg-emerald-500'
              }`}
              onMouseEnter={() => setHoveredDate(day.date)}
              onMouseLeave={() => setHoveredDate(null)}
            >
              {hoveredDate === day.date && (
                <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 transform rounded-md bg-zinc-900 px-2 py-1 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">
                  {day.count} modules completed on {new Date(day.date).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ContributionCalendar 