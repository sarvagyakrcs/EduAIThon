"use client";

import React, { useState } from 'react';
import { Course } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckboxField } from '@/components/ui/checkbox';
import { CalendarDays, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Text } from '@/components/ui/text';
import { Field, Label } from '@/components/ui/fieldset';

interface TimetableCreatorProps {
  courses: Course[];
}

// Utility function to truncate text
const truncateText = (text: string, maxLength: number = 30): string => {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength - 3) + '...';
};

export default function TimetableCreator({ courses }: TimetableCreatorProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [dayDescription, setDayDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedEntries, setGeneratedEntries] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const generateTimetable = async () => {
    if (!dayDescription) {
      setError('Please describe your daily schedule');
      return;
    }

    try {
      setError('');
      setIsGenerating(true);
      
      const response = await fetch('/api/timetable/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: dayDescription,
          courseIds: selectedCourses,
        }),
      });

      // Clone the response so we can read it twice if needed
      const responseClone = response.clone();
      
      if (!response.ok) {
        let errorMessage = 'Failed to generate timetable';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If the error response cannot be parsed as JSON, use the status text
          errorMessage = `Error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await responseClone.json();
      setGeneratedEntries(data.entries);
    } catch (error) {
      console.error('Error generating timetable:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate timetable');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveTimetable = async () => {
    if (!name) {
      setError('Please provide a name for your timetable');
      return;
    }

    if (generatedEntries.length === 0) {
      setError('No timetable entries to save. Generate a timetable first.');
      return;
    }

    try {
      setError('');
      setIsSaving(true);
      
      // Properly normalize date objects in each entry to ensure correct storage
      const normalizedEntries = generatedEntries.map(entry => {
        try {
          const now = new Date();
          const baseDate = new Date(now);
          baseDate.setHours(0, 0, 0, 0);
          
          // Process startTime
          let startTime;
          if (typeof entry.startTime === 'string') {
            // Handle string format "09:00" or ISO date string
            if (entry.startTime.includes('T')) {
              startTime = new Date(entry.startTime);
            } else {
              const [hours, minutes] = entry.startTime.split(':').map(Number);
              startTime = new Date(baseDate);
              startTime.setHours(hours, minutes, 0, 0);
            }
          } else if (entry.startTime instanceof Date) {
            startTime = entry.startTime;
          } else {
            // Default start time if missing
            startTime = new Date(baseDate);
            startTime.setHours(9, 0, 0, 0);
          }
          
          // Process endTime
          let endTime;
          if (typeof entry.endTime === 'string') {
            // Handle string format "10:30" or ISO date string
            if (entry.endTime.includes('T')) {
              endTime = new Date(entry.endTime);
            } else {
              const [hours, minutes] = entry.endTime.split(':').map(Number);
              endTime = new Date(baseDate);
              endTime.setHours(hours, minutes, 0, 0);
            }
          } else if (entry.endTime instanceof Date) {
            endTime = entry.endTime;
          } else {
            // Default end time if missing
            endTime = new Date(baseDate);
            endTime.setHours(10, 0, 0, 0);
          }
          
          // Make sure dayOfWeek is a number between 0-6 relative to the current day
          // 0 = today, 1 = tomorrow, etc.
          let dayOfWeek = 0;
          if (typeof entry.dayOfWeek === 'number') {
            dayOfWeek = Math.min(Math.max(0, entry.dayOfWeek), 6);
          }
          
          // Return a normalized entry
          return {
            ...entry,
            startTime,
            endTime,
            dayOfWeek
          };
        } catch (error) {
          console.error('Error normalizing timetable entry:', error, entry);
          // Return the original entry as fallback
          return entry;
        }
      });
      
      const response = await fetch('/api/timetable/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          entries: normalizedEntries,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save timetable');
      }

      // Clear form and refresh the page to show the new timetable
      setName('');
      setDescription('');
      setDayDescription('');
      setSelectedCourses([]);
      setGeneratedEntries([]);
      
      router.refresh();
      router.push('/calendar');
    } catch (error) {
      console.error('Error saving timetable:', error);
      setError(error instanceof Error ? error.message : 'Failed to save timetable');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <div className="p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Create New Timetable</h2>
            <Text className="text-sm text-muted-foreground">
              Design your perfect class schedule with AI assistance
            </Text>
          </div>
        </div>
        
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <div className="space-y-5">
          <Field>
            <Label>Timetable Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Class Schedule"
            />
          </Field>
          
          <Field>
            <Label>Description (Optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Fall Semester 2024"
              rows={2}
            />
          </Field>
          
          <Field>
            <Label>Select Courses</Label>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {courses.length > 0 ? (
                courses.map((course) => (
                  <CheckboxField key={course.id} className="border border-zinc-200 dark:border-zinc-800 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <Checkbox
                      checked={selectedCourses.includes(course.id)}
                      onChange={() => toggleCourse(course.id)}
                      color="sky"
                    />
                    <Label className="ml-2 truncate">{truncateText(course.name, 20)}</Label>
                  </CheckboxField>
                ))
              ) : (
                <Text className="text-zinc-500 dark:text-zinc-400 col-span-full">
                  No courses available. Add courses in your library first.
                </Text>
              )}
            </div>
          </Field>
          
          <Field>
            <Label>Describe Your Schedule Preferences</Label>
            <Textarea
              value={dayDescription}
              onChange={(e) => setDayDescription(e.target.value)}
              placeholder="I prefer morning classes Mon-Wed, need Friday afternoons free, and want study blocks in between classes..."
              rows={4}
              className="mt-2"
            />
            <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
              Be specific about your preferences, time constraints, and any other requirements.
            </Text>
          </Field>
          
          <Button
            onClick={generateTimetable}
            disabled={isGenerating}
            color="sky"
            className="w-full flex items-center justify-center"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              </>
            ) : (
              <>
                Generate with AI
              </>
            )}
          </Button>
        </div>
        
        {generatedEntries.length > 0 && (
          <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Check className="h-5 w-5 mr-2 text-green-500" />
              Generated Timetable
            </h3>
            
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="p-4 max-h-[400px] overflow-y-auto space-y-3">
                {generatedEntries.map((entry, index) => {
                  // Safely access properties with fallbacks
                  try {
                    const dayOfWeek = typeof entry.dayOfWeek === 'number' && entry.dayOfWeek >= 0 && entry.dayOfWeek <= 6
                      ? entry.dayOfWeek
                      : 0;
                    
                    const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
                    
                    // Safely format times
                    let startTime = '';
                    let endTime = '';
                    
                    try {
                      if (entry.startTime) {
                        startTime = new Date(entry.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      }
                      
                      if (entry.endTime) {
                        endTime = new Date(entry.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      }
                    } catch (timeError) {
                      console.warn('Error formatting time:', timeError);
                      startTime = 'Invalid time';
                      endTime = 'Invalid time';
                    }
                    
                    return (
                      <div 
                        key={index} 
                        className="p-3 rounded-md shadow-sm border overflow-hidden"
                        style={{ 
                          backgroundColor: `${entry.color || '#4285F4'}15`,
                          borderColor: `${entry.color || '#4285F4'}30`
                        }}
                      >
                        <div 
                          className="font-medium w-full whitespace-nowrap overflow-hidden text-ellipsis" 
                          style={{ color: entry.color || '#4285F4' }}
                        >
                          {entry.title || 'Untitled Event'}
                        </div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                          {day || 'Unknown day'}, {startTime} - {endTime}
                        </div>
                        {entry.description && (
                          <div className="text-sm mt-1">{entry.description}</div>
                        )}
                        {entry.scientificPrinciple && (
                          <div className="text-xs mt-2 italic text-zinc-500 dark:text-zinc-400 border-t border-dashed pt-1 border-zinc-200 dark:border-zinc-700">
                            <span className="font-medium">Scientific Basis:</span> {entry.scientificPrinciple}
                          </div>
                        )}
                      </div>
                    );
                  } catch (displayError) {
                    console.error('Error displaying entry:', displayError, entry);
                    return (
                      <div key={index} className="p-3 rounded-md shadow-sm border border-red-200 dark:border-red-800/30 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400">
                        Error displaying this entry. Please check console for details.
                      </div>
                    );
                  }
                })}
              </div>
              
              {/* Scientific Wellness Summary */}
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-lg">
                <h4 className="text-md font-medium text-blue-800 dark:text-blue-300 mb-2">
                  Wellness Activities Based on Scientific Principles
                </h4>
                <ul className="list-disc pl-5 space-y-2 text-sm text-blue-700 dark:text-blue-400">
                  <li>
                    <span className="font-medium">Sleep Schedule:</span> 7-9 hours of sleep supports memory consolidation, cognitive function, and immune health.
                  </li>
                  <li>
                    <span className="font-medium">Regular Meals:</span> Consistent meal timing helps regulate blood sugar, metabolism, and circadian rhythm.
                  </li>
                  <li>
                    <span className="font-medium">Exercise:</span> Physical activity improves brain function, reduces stress, and enhances learning capacity.
                  </li>
                  <li>
                    <span className="font-medium">Study Breaks:</span> The Pomodoro Technique prevents cognitive fatigue and maintains focus and productivity.
                  </li>
                  <li>
                    <span className="font-medium">Relaxation:</span> Mindfulness practices reduce cortisol levels and improve attention and emotional regulation.
                  </li>
                  <li>
                    <span className="font-medium">Social Time:</span> Social connections are linked to better mental health, longevity, and academic success.
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
              <Button 
                onClick={saveTimetable}
                disabled={isSaving}
                plain
                className="w-full flex items-center justify-center"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save Timetable
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 