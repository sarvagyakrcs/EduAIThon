"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Heading, Subheading } from '@/components/ui/heading'
import { Badge } from '@/components/ui/badge'
import { Text } from '@/components/ui/text'
import { SparkleIcon } from '@/components/ui/sparkle-icon'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { Module } from '@prisma/client'
import { motion, AnimatePresence } from 'framer-motion'
import { useChat } from 'ai/react'
import toast from 'react-hot-toast'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type Props = {
  modules: Module[]
  selectedModuleId: string | null
}

const TeacherChatbot = ({ modules, selectedModuleId }: Props) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isSending, setIsSending] = useState(false)

  const selectedModule = modules.find(module => module.id === selectedModuleId)

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: '/api/chat/teacher-mode',
    body: {
      moduleId: selectedModuleId,
    },
    onResponse: () => {
      setIsSending(false)
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send message')
      setIsSending(false)
    }
  })

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedModuleId) {
      toast.error('Please select a module first')
      return
    }
    if (!input.trim()) return
    setIsSending(true)
    handleSubmit(e)
  }

  // Reset chat when selected module changes
  useEffect(() => {
    setMessages([])
  }, [selectedModuleId, setMessages])

  if (!selectedModuleId) {
    return (
      <Card className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[300px]">
        <Bot className="size-16 text-zinc-300 mb-4" />
        <Heading level={3}>Select a Module</Heading>
        <Text className="mt-2 text-zinc-500 max-w-md">
          Please select a module from the list to start teaching it to the AI student.
        </Text>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-full min-h-[500px]">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <Badge color="green" className="mb-1">
            <SparkleIcon className="mr-1 size-3" />
            <span>Teaching Mode</span>
          </Badge>
          <Heading level={3} className="text-lg">
            {selectedModule ? selectedModule.name : 'Select a module'}
          </Heading>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500">
            <Bot className="size-12 mb-4 text-zinc-300" />
            <Text className="max-w-md">
              I'm your AI student. Start teaching me about <strong>{selectedModule?.name}</strong>. 
              Explaining concepts will help reinforce your understanding.
            </Text>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex gap-3 max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-primary text-white rounded-2xl rounded-tr-sm'
                      : 'bg-zinc-100 dark:bg-zinc-800 rounded-2xl rounded-tl-sm'
                  } p-4`}
                >
                  <div className="flex-shrink-0 pt-1">
                    {message.role === 'user' ? (
                      <User className="size-5" />
                    ) : (
                      <Bot className="size-5" />
                    )}
                  </div>
                  <div>
                    <Text className="whitespace-pre-wrap">{message.content}</Text>
                  </div>
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </AnimatePresence>
        )}
      </div>

      <form onSubmit={handleFormSubmit} className="p-4 border-t flex gap-2">
        <Input
          placeholder="Teach me about this topic..."
          value={input}
          onChange={handleInputChange}
          disabled={isLoading || !selectedModuleId}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading || !input.trim() || !selectedModuleId}>
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </Card>
  )
}

export default TeacherChatbot 