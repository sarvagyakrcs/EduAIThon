"use client";

import React, { useState } from 'react';
import { Timetable, TimetableEntry } from '@prisma/client';
import { Calendar, Clock, GraduationCap, BookOpen, LayoutGrid, ChevronRight } from 'lucide-react';

// Define the props type including related entities
interface TimetableViewerProps {
  timetables: (Timetable & {
    entries: (TimetableEntry & {
      course: { id: string; name: string } | null;
    })[];
  })[];
}

export default function TimetableViewer({ timetables }: TimetableViewerProps) {
  const [selectedTimetableId, setSelectedTimetableId] = useState<string | null>(
    timetables.length > 0 ? timetables[0].id : null
  );
  const [draggedEntry, setDraggedEntry] = useState<TimetableEntry | null>(null);
  
  // Find the selected timetable
  const selectedTimetable = timetables.find(t => t.id === selectedTimetableId);
  
  // Days of the week for the calendar
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Time slots for the calendar (from 8 AM to 10 PM in 30-minute intervals)
  const timeSlots = [];
  for (let hour = 8; hour <= 22; hour++) {
    timeSlots.push(`${hour}:00`);
    if (hour < 22) timeSlots.push(`${hour}:30`);
  }
  
  // Function to handle drag start
  const handleDragStart = (entry: TimetableEntry) => {
    setDraggedEntry(entry);
  };
  
  // Function to handle drop in a new time slot
  const handleDrop = async (dayIndex: number, timeSlot: string) => {
    if (!draggedEntry) return;
    
    try {
      // Convert UI day index to data day index
      const dataDayIndex = (dayIndex + 1) % 7;
      
      // Parse the time slot
      const [hour, minute] = timeSlot.split(':').map(Number);
      
      // Calculate new start and end times
      const originalStartTime = new Date(draggedEntry.startTime);
      const originalEndTime = new Date(draggedEntry.endTime);
      const durationMs = originalEndTime.getTime() - originalStartTime.getTime();
      
      // Create base date for the day of week
      const baseDate = new Date(2023, 0, 1 + dataDayIndex);
      
      // Set the new start time
      const newStartTime = new Date(baseDate);
      newStartTime.setHours(hour, minute || 0, 0, 0);
      
      // Calculate new end time by adding the original duration
      const newEndTime = new Date(newStartTime.getTime() + durationMs);
      
      // Call the API to update the entry
      const response = await fetch('/api/timetable/update-entry', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entryId: draggedEntry.id,
          dayOfWeek: dataDayIndex,
          startTime: newStartTime,
          endTime: newEndTime,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update entry');
      }
      
      // Refresh the page to show the updated timetable
      window.location.reload();
    } catch (error) {
      console.error('Error updating timetable entry:', error);
      alert('Failed to update the timetable entry. Please try again.');
    } finally {
      // Reset dragged entry
      setDraggedEntry(null);
    }
  };
  
  // Determine if an entry should be rendered in a specific time slot
  const getEntriesForTimeSlot = (dayIndex: number, timeSlot: string) => {
    if (!selectedTimetable) return [];
    
    // Convert UI day index (0 = Monday) to data day index (0 = Sunday)
    const dataDayIndex = (dayIndex + 1) % 7;
    
    // Parse the time slot
    const [hour, minute] = timeSlot.split(':').map(Number);
    
    return selectedTimetable.entries.filter(entry => {
      const entryDay = entry.dayOfWeek;
      const entryStartHour = new Date(entry.startTime).getHours();
      const entryStartMinute = new Date(entry.startTime).getMinutes();
      const entryEndHour = new Date(entry.endTime).getHours();
      const entryEndMinute = new Date(entry.endTime).getMinutes();
      
      // Check if the entry should be displayed in this time slot
      return (
        entryDay === dataDayIndex &&
        (
          // Entry starts at this time slot
          (entryStartHour === hour && entryStartMinute === (minute || 0)) ||
          // Entry is ongoing at this time slot
          (
            (entryStartHour < hour || (entryStartHour === hour && entryStartMinute <= (minute || 0))) &&
            (entryEndHour > hour || (entryEndHour === hour && entryEndMinute > (minute || 0)))
          )
        )
      );
    });
  };
  
  // Format time for display
  const formatTime = (time: Date) => {
    return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (timetables.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
            <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-bold">Your Timetables</h2>
        </div>
        <div className="text-center p-12">
          <div className="mx-auto w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
            <LayoutGrid className="h-12 w-12 text-zinc-400 dark:text-zinc-500" />
          </div>
          <p className="text-zinc-500 mb-6 text-lg">
            You haven't created any timetables yet
          </p>
          <p className="text-zinc-500 mb-4">
            Use the form to create your first timetable with AI
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl" />
      
      <div className="flex items-center gap-4 mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
          <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-xl font-bold">Your Timetables</h2>
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 text-zinc-600 dark:text-zinc-300">
          Select Timetable
        </label>
        <div className="relative">
          <select
            value={selectedTimetableId || ''}
            onChange={(e) => setSelectedTimetableId(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none pr-10"
          >
            {timetables.map((timetable) => (
              <option key={timetable.id} value={timetable.id}>
                {timetable.name}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronRight className="h-5 w-5 text-zinc-400 transform rotate-90" />
          </div>
        </div>
      </div>
      
      {selectedTimetable && (
        <>
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-1">{selectedTimetable.name}</h3>
            {selectedTimetable.description && (
              <p className="text-zinc-500 dark:text-zinc-400">{selectedTimetable.description}</p>
            )}
          </div>
          
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                {/* Calendar Header */}
                <div className="grid grid-cols-8 bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="p-3 text-center font-medium text-zinc-500 dark:text-zinc-400 border-b border-r border-zinc-200 dark:border-zinc-700">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Time
                  </div>
                  {daysOfWeek.map((day, index) => (
                    <div
                      key={day}
                      className="p-3 text-center font-medium text-zinc-800 dark:text-zinc-200 border-b border-r border-zinc-200 dark:border-zinc-700 last:border-r-0"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar Body */}
                {timeSlots.map((timeSlot, timeIndex) => (
                  <div key={timeSlot} className={`grid grid-cols-8 ${timeIndex % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-zinc-50/50 dark:bg-zinc-800/20'}`}>
                    <div className="p-3 text-center text-sm text-zinc-500 dark:text-zinc-400 border-r border-zinc-200 dark:border-zinc-700">
                      {timeSlot}
                    </div>
                    
                    {daysOfWeek.map((_, dayIndex) => {
                      const entries = getEntriesForTimeSlot(dayIndex, timeSlot);
                      const isTimeSlotStart = entries.some(
                        entry => 
                          new Date(entry.startTime).getHours() === parseInt(timeSlot.split(':')[0]) &&
                          new Date(entry.startTime).getMinutes() === parseInt(timeSlot.split(':')[1] || '0')
                      );
                      
                      return (
                        <div
                          key={dayIndex}
                          className="min-h-16 border-r border-b border-zinc-200 dark:border-zinc-700 last:border-r-0 p-1"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDrop(dayIndex, timeSlot)}
                        >
                          {isTimeSlotStart && entries.map((entry) => (
                            <div
                              key={entry.id}
                              draggable
                              onDragStart={() => handleDragStart(entry)}
                              className="p-2 text-xs rounded-md overflow-hidden cursor-move transition-all hover:shadow-md"
                              style={{ 
                                backgroundColor: entry.color || '#4285F4',
                                borderLeft: `3px solid ${entry.color ? adjustColor(entry.color, -20) : '#3367d6'}`
                              }}
                            >
                              <div className="font-semibold text-white flex items-center">
                                {entry.course ? (
                                  <GraduationCap className="h-3 w-3 mr-1 inline" />
                                ) : (
                                  <BookOpen className="h-3 w-3 mr-1 inline" />
                                )}
                                {entry.title}
                              </div>
                              <div className="text-white/90 text-[10px]">
                                {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Entry List for Mobile */}
          <div className="mt-8 md:hidden">
            <h4 className="text-md font-bold mb-4 flex items-center">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Daily Schedule
            </h4>
            <div className="space-y-4">
              {daysOfWeek.map((day, dayIndex) => {
                // Convert UI day index to data day index
                const dataDayIndex = (dayIndex + 1) % 7;
                
                // Get entries for this day
                const dayEntries = selectedTimetable.entries.filter(
                  entry => entry.dayOfWeek === dataDayIndex
                ).sort((a, b) => 
                  new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                );
                
                if (dayEntries.length === 0) return null;
                
                return (
                  <div key={day} className="p-4 rounded-lg bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
                    <h5 className="font-bold text-zinc-800 dark:text-zinc-200 mb-3 flex items-center">
                      <div className="h-2 w-2 rounded-full bg-blue-500 mr-2"></div>
                      {day}
                    </h5>
                    <div className="space-y-2">
                      {dayEntries.map(entry => (
                        <div 
                          key={entry.id}
                          className="p-3 rounded-md text-sm flex items-center space-x-3"
                          style={{ 
                            backgroundColor: `${entry.color}15` || '#4285F410',
                            borderLeft: `3px solid ${entry.color || '#4285F4'}`
                          }}
                        >
                          <div className="flex-shrink-0">
                            <Clock className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-zinc-800 dark:text-zinc-200">{entry.title}</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                            </div>
                            {entry.description && (
                              <div className="text-xs mt-1 text-zinc-500 dark:text-zinc-400">{entry.description}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Helper function to adjust color brightness
function adjustColor(color: string, amount: number): string {
  return color.replace(/^#/, '').replace(/../g, (substr) => {
    const componentValue = Math.min(255, Math.max(0, parseInt(substr, 16) + amount));
    return componentValue.toString(16).padStart(2, '0');
  });
} 