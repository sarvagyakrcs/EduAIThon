"use client"

import { Module, ModuleType, ModuleProgress } from '@prisma/client'
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Heading, Subheading } from '@/components/ui/heading'
import { Badge } from '@/components/ui/badge'
import { Text, Strong } from '@/components/ui/text'
import { Divider } from '@/components/ui/divider'
import { SparkleIcon } from '@/components/ui/sparkle-icon'
import { Play, Clock, FileText, CheckCircle2, BookOpen, ChevronRight, BarChart2, BookOpenCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { Switch, SwitchField } from '@/components/ui/switch'
import { updateModuleProgress } from '@/actions/course/update-module-progress'
import toast from 'react-hot-toast'
import TeacherChatbot from './teacher-chatbot'
import dynamic from 'next/dynamic'

const ReactConfetti = dynamic(() => import('react-confetti'), {
  ssr: false
})

type ModuleWithProgress = Module & {
  moduleProgress?: ModuleProgress | null
}

type Props = {
  modules: ModuleWithProgress[]
  courseId?: string
}

const CourseList = ({ modules }: Props) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [localModules, setLocalModules] = useState<ModuleWithProgress[]>(modules);
  const [updatingProgress, setUpdatingProgress] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [showTeachingMode, setShowTeachingMode] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const completedModules = localModules.filter(m => m.moduleProgress?.completed).length;
    const progressPercentage = Math.round((completedModules / localModules.length) * 100);
    
    if (progressPercentage === 100) {
      setShowConfetti(true);
      // Hide confetti after 5 seconds
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [localModules]);

  const handleProgressUpdate = async (moduleId: string, completed: boolean) => {
    // Set loading state
    setUpdatingProgress(moduleId);

    // Store the previous state for rollback
    const previousModules = localModules;

    // Optimistic update
    setLocalModules(prevModules => 
      prevModules.map(module => {
        if (module.id === moduleId) {
          const updatedModule = { ...module };
          if (!updatedModule.moduleProgress) {
            updatedModule.moduleProgress = {
              id: 'temp-id',
              moduleId: moduleId,
              completed,
              completedAt: completed ? new Date() : null
            };
          } else {
            updatedModule.moduleProgress = {
              ...updatedModule.moduleProgress,
              completed,
              completedAt: completed ? new Date() : null
            };
          }
          return updatedModule;
        }
        return module;
      })
    );

    try {
      const result = await updateModuleProgress(moduleId, completed);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update progress');
      }

      toast.success(completed ? 'Module marked as completed!' : 'Module marked as incomplete');
    } catch (error) {
      // Revert to previous state on error
      setLocalModules(previousModules);
      toast.error(error instanceof Error ? error.message : 'Failed to update progress. Please try again.');
    } finally {
      setUpdatingProgress(null);
    }
  };

  const completedModules = localModules.filter(m => m.moduleProgress?.completed).length;
  const progressPercentage = Math.round((completedModules / localModules.length) * 100);

  if (localModules.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white/50 p-4 sm:p-8 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="relative mb-4 size-16 sm:size-20 rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
            <BookOpen className="size-full text-zinc-500" />
            <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
              <SparkleIcon className="size-4" />
            </span>
          </div>
          <Heading level={3} className="mb-2 text-lg sm:text-xl">No modules yet</Heading>
          <Text className="max-w-md mb-6 text-sm sm:text-base">Your course doesn't have any modules at the moment. Check back later or contact your instructor for more information.</Text>
          <Button>
            <span>Refresh</span>
            <span className="ml-2 size-5 text-zinc-400">↻</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 px-2 sm:px-0">
      {showConfetti && (
        <ReactConfetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}
      {showTeachingMode ? (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <Button 
              className="flex items-center gap-2"
              onClick={() => setShowTeachingMode(false)}
            >
              <ChevronRight className="rotate-180" size={16} />
              <span>Back to modules</span>
            </Button>
            {selectedModuleId && (
              <Badge color="purple" className="flex items-center gap-1">
                <BookOpenCheck size={14} />
                <span>Teaching Mode</span>
              </Badge>
            )}
          </div>
          <TeacherChatbot modules={localModules} selectedModuleId={selectedModuleId} />
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="space-y-1">
              <Badge color="blue" className="mb-2">
                <SparkleIcon className="mr-1 size-4" />
                <span>Course Content</span>
              </Badge>
              <Heading className="text-lg sm:text-xl font-bold">Course Modules</Heading>
              <Text className="text-sm sm:text-base">
                {completedModules} of {localModules.length} modules completed ({progressPercentage}%)
              </Text>
            </div>
            <div className="flex gap-2 items-center">
              <Button 
                onClick={() => setShowTeachingMode(true)} 
                className="self-start sm:self-auto"
              >
                <BookOpenCheck className="mr-2 size-4" />
                <span>Teaching Mode</span>
              </Button>
              <Badge color="zinc" className="self-start sm:self-auto rounded-full px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm">
                {localModules.length} {localModules.length === 1 ? 'Module' : 'Modules'}
              </Badge>
            </div>
          </div>

          <Divider />

          <div className="grid gap-3 sm:gap-4">
            {localModules.map((module, index) => {
              const isHovered = hoveredIndex === index;
              const moduleIcon = getModuleIcon(module.moduleType);
              const isUpdating = updatingProgress === module.id;

              return (
                <motion.div
                  key={module.id}
                  className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 transition-all duration-300 hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:border-zinc-700"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Background animations */}
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                    <div
                      className={`absolute -inset-0.5 bg-gradient-to-r ${getModuleGradient(module.moduleType)} opacity-0 blur-xl transition-all duration-500 group-hover:opacity-20`}
                    />
                  </div>

                  <div className="relative flex flex-col sm:flex-row items-start gap-3 sm:gap-4 p-3 sm:p-4">
                    {/* Module number with animated circle */}
                    <div className="relative flex-shrink-0 self-center sm:self-start mb-2 sm:mb-0">
                      <div className="flex size-12 sm:size-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <Strong className="text-base sm:text-lg">{index + 1}</Strong>
                        {isHovered && (
                          <motion.div
                            className="absolute inset-0 rounded-full border-2 border-primary/40"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1.2, opacity: 0 }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        )}
                      </div>
                      {/* Type icon */}
                      <div className={`absolute -right-1 -bottom-1 flex size-6 sm:size-7 items-center justify-center rounded-full ${getModuleBgColor(module.moduleType)}`}>
                        {moduleIcon}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 w-full">
                      <div className="mb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
                        <Heading level={4} className="font-semibold text-base sm:text-lg">
                          {module.name}
                        </Heading>
                        <Badge color={getModuleBadgeColor(module.moduleType)} className="self-start text-xs sm:text-sm">
                          {module.moduleType}
                        </Badge>
                      </div>

                      {module.description && (
                        <Text className="mb-2 sm:mb-3 line-clamp-2 text-sm sm:text-base">{module.description}</Text>
                      )}

                      <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>{new Date(module.createdAt).toLocaleDateString()}</span>
                        </div>
                        {module.videoUrl && (
                          <div className="flex items-center gap-1">
                            <Play size={14} />
                            <span>Video Available</span>
                          </div>
                        )}
                        {module.thumbnailUrl && (
                          <div className="flex items-center gap-1">
                            <FileText size={14} />
                            <span>Preview Available</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons with hover effect */}
                    <div className="w-full sm:w-auto sm:ml-2 flex-shrink-0 flex items-center justify-center gap-2 self-center mt-3 sm:mt-0">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          className="h-10 px-4 flex items-center"
                          onClick={() => {
                            setSelectedModuleId(module.id);
                            setShowTeachingMode(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          color="purple"
                        >
                          <BookOpenCheck className="mr-2 size-4" />
                          <span>Teach</span>
                        </Button>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button href={`/modules/${module.id}`} color='sky' className="relative rounded-full w-full sm:w-auto px-4 py-2 text-sm sm:text-base">
                          <span className="flex items-center justify-center gap-1.5">
                            Open <ChevronRight size={16} className="transition-transform duration-300 group-hover/btn:translate-x-1" />
                          </span>
                          <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
                        </Button>
                      </motion.div>
                      <SwitchField>
                        <Switch 
                          defaultChecked={module.moduleProgress?.completed} 
                          onChange={(checked) => handleProgressUpdate(module.id, checked)}
                          disabled={isUpdating}
                          name={`module-progress-${module.id}`} 
                          color="sky"
                          className={isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
                        />
                      </SwitchField>
                      {isUpdating && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm rounded-xl">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  )
}

// Helper functions
const getModuleIcon = (moduleType: ModuleType) => {
  switch (moduleType) {
    case 'VIDEO':
      return <Play className="size-3 sm:size-4 text-white" />;
    case 'TEXT':
      return <FileText className="size-3 sm:size-4 text-white" />;
    case 'QUIZ':
      return <CheckCircle2 className="size-3 sm:size-4 text-white" />;
    case 'MD':
      return <BookOpen className="size-3 sm:size-4 text-white" />;
    case 'CHART':
      return <BarChart2 className="size-3 sm:size-4 text-white" />;
    default:
      return <FileText className="size-3 sm:size-4 text-white" />;
  }
};

const getModuleBadgeColor = (moduleType: ModuleType): "blue" | "red" | "zinc" | "purple" | "green" => {
  switch (moduleType) {
    case 'VIDEO':
      return 'blue';
    case 'QUIZ':
      return 'red';
    case 'TEXT':
      return 'zinc';
    case 'MD':
      return 'purple';
    case 'CHART':
      return 'green';
    default:
      return 'zinc';
  }
};

const getModuleBgColor = (moduleType: ModuleType): string => {
  switch (moduleType) {
    case 'VIDEO':
      return 'bg-blue-500';
    case 'QUIZ':
      return 'bg-red-500';
    case 'TEXT':
      return 'bg-zinc-700';
    case 'MD':
      return 'bg-purple-500';
    case 'CHART':
      return 'bg-green-500';
    default:
      return 'bg-zinc-700';
  }
};

const getModuleGradient = (moduleType: ModuleType): string => {
  switch (moduleType) {
    case 'VIDEO':
      return 'from-blue-500 via-sky-300 to-blue-500';
    case 'QUIZ':
      return 'from-red-500 via-rose-300 to-red-500';
    case 'TEXT':
      return 'from-zinc-500 via-zinc-300 to-zinc-500';
    case 'MD':
      return 'from-purple-500 via-violet-300 to-purple-500';
    case 'CHART':
      return 'from-green-500 via-emerald-300 to-green-500';
    default:
      return 'from-zinc-500 via-zinc-300 to-zinc-500';
  }
};

export default CourseList;