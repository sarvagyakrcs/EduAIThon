"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Timetable, TimetableEntry, Course, Module } from '@prisma/client';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { GraduationCap, Settings, X, Save, Edit2, Calendar, Info, AlertTriangle, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Divider } from '@/components/ui/divider';
import { Text, Strong } from '@/components/ui/text';
import { motion } from 'framer-motion';

// Define the props type including related entities
interface AdvancedCalendarProps {
  timetable: Timetable & {
    entries: (TimetableEntry & {
      course: { 
        id: string; 
        name: string;
        description?: string | null;
        outcome?: string | null;
        currentLevel?: string | null;
        modules: { id: string; name: string; moduleType: string }[]
      } | null;
    })[];
  };
}

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    description: string;
    courseId: string | null;
    courseName: string | null;
    courseDescription: string | null;
    courseOutcome: string | null;
    courseLevel: string | null;
    moduleCount: number;
    dayOfWeek: number;
    entryId: string;
  };
};

const colorPalette = [
  { value: '#3B82F6', name: 'Blue', darkText: 'dark:text-blue-200', darkBg: 'dark:bg-blue-900/50', lightBg: 'bg-blue-100' },
  { value: '#10B981', name: 'Green', darkText: 'dark:text-green-200', darkBg: 'dark:bg-green-900/50', lightBg: 'bg-green-100' },
  { value: '#F59E0B', name: 'Amber', darkText: 'dark:text-amber-200', darkBg: 'dark:bg-amber-900/50', lightBg: 'bg-amber-100' },
  { value: '#EF4444', name: 'Red', darkText: 'dark:text-red-200', darkBg: 'dark:bg-red-900/50', lightBg: 'bg-red-100' },
  { value: '#8B5CF6', name: 'Purple', darkText: 'dark:text-purple-200', darkBg: 'dark:bg-purple-900/50', lightBg: 'bg-purple-100' },
  { value: '#EC4899', name: 'Pink', darkText: 'dark:text-pink-200', darkBg: 'dark:bg-pink-900/50', lightBg: 'bg-pink-100' },
  { value: '#14B8A6', name: 'Teal', darkText: 'dark:text-teal-200', darkBg: 'dark:bg-teal-900/50', lightBg: 'bg-teal-100' },
  { value: '#F97316', name: 'Orange', darkText: 'dark:text-orange-200', darkBg: 'dark:bg-orange-900/50', lightBg: 'bg-orange-100' },
];

export default function AdvancedCalendar({ timetable }: AdvancedCalendarProps) {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isEditingEvent, setIsEditingEvent] = useState<boolean>(false);
  const [currentEvent, setCurrentEvent] = useState<CalendarEvent | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    backgroundColor: '#3B82F6'
  });
  
  const calendarRef = useRef<any>(null);
  
  // Convert timetable entries to calendar events
  useEffect(() => {
    if (!timetable) return;
    
    // Get current date information
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Use today as the base date instead of going back to Sunday
    const baseDate = new Date(now);
    // Clear any time information to start at midnight
    baseDate.setHours(0, 0, 0, 0);
    
    // Keep track of date for debugging
    console.log('Base date for calendar:', baseDate.toISOString());
    
    // Use a type predicate to correctly filter null values
    const isCalendarEvent = (event: CalendarEvent | null): event is CalendarEvent => {
      return event !== null;
    };
    
    const calendarEvents = timetable.entries.map(entry => {
      try {
        // Create a new date object for this entry based on the current day + days ahead
        const startDate = new Date(baseDate);
        // Use entry.dayOfWeek directly as days to add (0=today, 1=tomorrow, etc.)
        startDate.setDate(baseDate.getDate() + entry.dayOfWeek);
        
        // Parse the time components from the entry's startTime
        const startTime = new Date(entry.startTime);
        // Apply only the time components to our current week date
        startDate.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
        
        // Do the same for end date and time
        const endDate = new Date(startDate);
        
        const endTime = new Date(entry.endTime);
        endDate.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
        
        // If end time is earlier than start time (across midnight), add a day
        if (endDate < startDate) {
          endDate.setDate(endDate.getDate() + 1);
        }
        
        // For debugging
        console.log(`Event ${entry.title}: dayOfWeek=${entry.dayOfWeek}, start=${startDate.toISOString()}, end=${endDate.toISOString()}`);

        // Generate a higher contrast text color for dark mode
        const contrastTextColor = getContrastColor(entry.color || '#3B82F6');
        
        return {
          id: entry.id,
          title: entry.title,
          start: startDate,
          end: endDate,
          backgroundColor: entry.color || '#3B82F6',
          borderColor: entry.color ? adjustColor(entry.color, -20) : '#2563EB',
          textColor: contrastTextColor,
          extendedProps: {
            description: entry.description || '',
            courseId: entry.courseId,
            courseName: entry.course?.name || null,
            courseDescription: entry.course?.description || null,
            courseOutcome: entry.course?.outcome || null,
            courseLevel: entry.course?.currentLevel || null,
            moduleCount: entry.course?.modules?.length || 0,
            dayOfWeek: entry.dayOfWeek,
            entryId: entry.id
          }
        };
      } catch (error) {
        console.error('Error creating calendar event from entry:', error, entry);
        // Return null for problematic entries
        return null;
      }
    }).filter(isCalendarEvent); // Use the type predicate to filter
    
    setEvents(calendarEvents);
  }, [timetable]);
  
  // Handle when an event is dropped
  const handleEventDrop = async (info: any) => {
    const { event } = info;
    const entryId = event.id;
    
    // Get the day of week (0-6, where 0 is Sunday)
    const dayOfWeek = event.start.getDay();
    
    // Get the start and end times
    const startTime = new Date(event.start);
    const endTime = new Date(event.end);
    
    try {
      const response = await fetch('/api/timetable/update-entry', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entryId,
          dayOfWeek,
          startTime,
          endTime,
        }),
      });
      
      if (!response.ok) {
        // Revert the drop
        info.revert();
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update event');
      }
      
      // Success! Refresh the events
      router.refresh();
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update the event. Please try again.');
      info.revert();
    }
  };
  
  // Handle when an event is resized
  const handleEventResize = async (info: any) => {
    const { event } = info;
    const entryId = event.id;
    
    // Keep the same day of week
    const dayOfWeek = event.start.getDay();
    
    // Get the start and end times
    const startTime = new Date(event.start);
    const endTime = new Date(event.end);
    
    try {
      const response = await fetch('/api/timetable/update-entry', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entryId,
          dayOfWeek,
          startTime,
          endTime,
        }),
      });
      
      if (!response.ok) {
        // Revert the resize
        info.revert();
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update event');
      }
      
      // Success! Refresh the events
      router.refresh();
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update the event. Please try again.');
      info.revert();
    }
  };
  
  // Scroll to today
  const scrollToToday = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.today();
    }
  };
  
  // Handle clicking on an event
  const handleEventClick = (info: any) => {
    const { event } = info;
    setCurrentEvent({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      backgroundColor: event.backgroundColor,
      borderColor: event.borderColor,
      textColor: event.textColor,
      extendedProps: {
        description: event.extendedProps.description,
        courseId: event.extendedProps.courseId,
        courseName: event.extendedProps.courseName,
        courseDescription: event.extendedProps.courseDescription,
        courseOutcome: event.extendedProps.courseOutcome,
        courseLevel: event.extendedProps.courseLevel,
        moduleCount: event.extendedProps.moduleCount,
        dayOfWeek: event.extendedProps.dayOfWeek,
        entryId: event.extendedProps.entryId
      }
    });
    
    setEditFormData({
      title: event.title,
      description: event.extendedProps.description || '',
      start: formatDateForInput(event.start),
      end: formatDateForInput(event.end),
      backgroundColor: event.backgroundColor
    });
    
    setIsEditingEvent(true);
  };
  
  // Format date for the datetime-local input
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: value
    });
  };
  
  // Handle color change
  const handleColorChange = (color: string) => {
    setEditFormData({
      ...editFormData,
      backgroundColor: color
    });
  };
  
  // Save the edited event
  const saveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvent) return;
    
    const startDate = new Date(editFormData.start);
    const endDate = new Date(editFormData.end);
    const dayOfWeek = startDate.getDay();
    
    try {
      const response = await fetch('/api/timetable/update-entry', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entryId: currentEvent.id,
          title: editFormData.title,
          description: editFormData.description,
          dayOfWeek,
          startTime: startDate,
          endTime: endDate,
          color: editFormData.backgroundColor
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update event');
      }
      
      // Close the edit form and refresh
      setIsEditingEvent(false);
      setCurrentEvent(null);
      router.refresh();
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update the event. Please try again.');
    }
  };
  
  // Delete the event
  const deleteEvent = async () => {
    if (!currentEvent) return;
    
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      const response = await fetch(`/api/timetable/delete-entry?id=${currentEvent.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete event');
      }
      
      // Close the edit form and refresh
      setIsEditingEvent(false);
      setCurrentEvent(null);
      router.refresh();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete the event. Please try again.');
    }
  };
  
  // Close the edit form
  const closeEditForm = () => {
    setIsEditingEvent(false);
    setCurrentEvent(null);
  };
  
  // Handle creating a new event
  const handleDateSelect = (selectInfo: any) => {
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect(); // clear date selection
    
    // Set initial form data for new event
    setCurrentEvent(null);
    setEditFormData({
      title: 'New Event',
      description: '',
      start: formatDateForInput(selectInfo.start),
      end: formatDateForInput(selectInfo.end),
      backgroundColor: '#3B82F6'
    });
    
    setIsEditingEvent(true);
  };
  
  // Create a new event
  const createNewEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const startDate = new Date(editFormData.start);
      const endDate = new Date(editFormData.end);
      const dayOfWeek = startDate.getDay(); // 0-6 where 0 is Sunday
      
      // Validate that the dates are valid
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error("Invalid date format");
      }
      
      // Validate that end time is after start time
      if (endDate <= startDate) {
        throw new Error("End time must be after start time");
      }
      
      const response = await fetch('/api/timetable/add-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timetableId: timetable.id,
          title: editFormData.title,
          description: editFormData.description,
          dayOfWeek,
          startTime: startDate,
          endTime: endDate,
          color: editFormData.backgroundColor
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create event');
      }
      
      // Close the edit form and refresh
      setIsEditingEvent(false);
      router.refresh();
    } catch (error) {
      console.error('Error creating event:', error);
      alert(`Failed to create the event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  return (
    <div className="space-y-6">

      <div className="relative rounded-xl border border-zinc-200 shadow-sm dark:border-zinc-800 overflow-hidden">
        <div className="bg-white dark:bg-zinc-900 p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              Next 7 Days
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {
                new Date(new Date().setDate(new Date().getDate() + 6)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              }
            </p>
          </div>
          <div className="flex space-x-2">
            <Button 
              color="light" 
              className="h-8 px-3 flex items-center gap-1.5 text-xs"
              onClick={scrollToToday}
            >
              <Calendar className="h-3.5 w-3.5" />
              Today
            </Button>
          </div>
        </div>
        <style jsx global>{`
          .fc-theme-standard .fc-scrollgrid {
            border: none !important;
          }
          .fc .fc-scrollgrid-section-header > th {
            padding: 0.75rem 0;
            background-color: var(--bg-subtle);
            border-color: var(--border-subtle) !important;
          }
          .fc-theme-standard th, .fc-theme-standard td {
            border-color: var(--border-subtle) !important;
          }
          .fc .fc-daygrid-day.fc-day-today {
            background-color: var(--bg-accent-subtle) !important;
          }
          .fc-timegrid-event-harness .fc-timegrid-event {
            border-radius: 0.5rem;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            padding: 0.25rem;
            font-weight: 500;
          }
          .fc .fc-timegrid-now-indicator-line {
            border-color: var(--red-600);
            border-width: 2px;
          }
          .fc .fc-timegrid-now-indicator-arrow {
            border-color: var(--red-600);
            border-width: 5px;
          }
          .fc .fc-col-header-cell-cushion {
            padding: 8px 4px;
            font-weight: 600;
          }
          :root {
            --bg-subtle: #f8fafc;
            --border-subtle: #e2e8f0;
            --bg-accent-subtle: rgba(59, 130, 246, 0.1);
            --red-600: #dc2626;
          }
          .dark {
            --bg-subtle: #111827;
            --border-subtle: #1f2937;
            --bg-accent-subtle: rgba(59, 130, 246, 0.15);
            --red-600: #ef4444;
          }
        `}</style>
        
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: '',
            center: '',
            right: ''
          }}
          allDaySlot={false}
          slotMinTime="07:00:00"
          slotMaxTime="23:00:00"
          height="auto"
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false
          }}
          events={events}
          editable={true}
          droppable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          nowIndicator={true}
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            omitZeroMinute: false,
            meridiem: false
          }}
          firstDay={new Date().getDay()} // Start the week on the current day
          duration={{ days: 7 }} // Show exactly 7 days
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventClick={handleEventClick}
          select={handleDateSelect}
          eventContent={formatEventContent}
          slotLabelClassNames="text-xs text-zinc-500 dark:text-zinc-400"
          dayHeaderClassNames="text-sm font-semibold text-zinc-800 dark:text-zinc-200"
          eventClassNames="rounded-lg overflow-hidden shadow-sm border-none"
          slotLaneClassNames="border-zinc-100 dark:border-zinc-800"
          titleFormat={{ day: 'numeric', month: 'short' }} // Show dates like "Apr 8" instead of weekday names
          dayHeaderFormat={{ weekday: 'short', month: 'numeric', day: 'numeric' }} // Show "Mon 4/8" format
        />
      </div>
      
      {/* Event Editor Modal */}
      {isEditingEvent && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg w-full max-w-md p-6 relative border border-zinc-100 dark:border-zinc-800"
          >
            <button 
              onClick={closeEditForm}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                {currentEvent ? (
                  <Edit2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <h3 className="text-xl font-bold">
                {currentEvent ? 'Edit Event' : 'Create New Event'}
              </h3>
            </div>
            
            <Divider className="my-4" />
            
            {/* Course Details Section (if applicable) */}
            {currentEvent && currentEvent.extendedProps.courseId && (
              <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <Strong className="text-sm">Course Information</Strong>
                </div>
                
                <div className="text-sm space-y-2">
                  <div>
                    <Strong>Course: </Strong>
                    <span className="text-zinc-700 dark:text-zinc-300">{currentEvent.extendedProps.courseName}</span>
                  </div>
                  
                  {currentEvent.extendedProps.courseDescription && (
                    <div>
                      <Strong>Description: </Strong>
                      <span className="text-zinc-600 dark:text-zinc-400">{currentEvent.extendedProps.courseDescription}</span>
                    </div>
                  )}
                  
                  {currentEvent.extendedProps.courseLevel && (
                    <div>
                      <Strong>Level: </Strong>
                      <span className="text-zinc-600 dark:text-zinc-400">{currentEvent.extendedProps.courseLevel}</span>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-1">
                    <Badge color="blue" className="text-xs">
                      {currentEvent.extendedProps.moduleCount} Modules
                    </Badge>
                    
                    {currentEvent.extendedProps.courseId && (
                      <Button 
                        href={`/courses/${currentEvent.extendedProps.courseId}`}
                        color="light"
                        className="text-xs h-6 px-2"
                      >
                        View Course
                      </Button>
                    )}
                  </div>
                </div>
                
                <Divider className="my-3" />
              </div>
            )}
            
            <form onSubmit={currentEvent ? saveEvent : createNewEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={editFormData.title}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-zinc-900 dark:text-white transition-shadow"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">
                  Description
                </label>
                <textarea
                  name="description"
                  value={editFormData.description}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-zinc-900 dark:text-white transition-shadow"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    name="start"
                    value={editFormData.start}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-zinc-900 dark:text-white transition-shadow"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    name="end"
                    value={editFormData.end}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-zinc-900 dark:text-white transition-shadow"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">
                  Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colorPalette.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => handleColorChange(color.value)}
                      className={`relative h-10 rounded-md transition-all ${
                        editFormData.backgroundColor === color.value 
                          ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-blue-400 dark:ring-offset-zinc-900' 
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      aria-label={`Select ${color.name} color`}
                    >
                      {editFormData.backgroundColor === color.value && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Choose a color that will be visible in both light and dark modes
                </p>
              </div>
              
              <div className="flex justify-between pt-5">
                {currentEvent ? (
                  <Button 
                    type="button" 
                    onClick={deleteEvent}
                    color="red"
                    className="inline-flex items-center justify-center gap-1"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <span>Delete</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={closeEditForm}
                    outline={true}
                    className="inline-flex items-center justify-center"
                  >
                    <span>Cancel</span>
                  </Button>
                )}
                
                <Button
                  type="submit"
                  color="blue"
                  className="inline-flex items-center justify-center gap-1"
                >
                  <Save className="h-4 w-4" />
                  <span>{currentEvent ? 'Update' : 'Create'}</span>
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
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

// Function to get a contrasting text color (black or white) based on background color
function getContrastColor(hexColor: string): string {
  // Default to white if hexColor isn't a valid hex
  if (!hexColor || !hexColor.startsWith('#')) return '#FFFFFF';
  
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Calculate luminance - perceived brightness
  // Formula based on WCAG guidelines
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light colors, enhanced white for dark colors
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// Helper functions to format course data for tooltips
const formatEventContent = (arg: any) => {
  const event = arg.event;
  const courseId = event.extendedProps.courseId;
  const courseName = event.extendedProps.courseName;
  
  return {
    html: `
      <div class="px-2 py-1">
        <div class="font-medium">${event.title}</div>
        ${courseName ? `<div class="text-xs opacity-75">Course: ${courseName}</div>` : ''}
        <div class="text-xs mt-1">
          ${formatEventTime(event.start)} - ${formatEventTime(event.end)}
        </div>
      </div>
    `
  };
};

const formatEventTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}; 