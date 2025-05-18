"use client";

import { useState } from "react";
import Image from "next/image";

interface TeachingStyle {
  id: string;
  name: string;
  description: string;
  subject: string;
  imageUrl: string;
}

const TEACHING_STYLES: TeachingStyle[] = [
  {
    id: "general",
    name: "General",
    description: "Clear explanations with a balanced approach. Suitable for all subjects.",
    subject: "All subjects",
    imageUrl: "/images/teaching-styles/general.svg"
  },
  {
    id: "feynman",
    name: "Richard Feynman",
    description: "Explains complex concepts using simple language and analogies.",
    subject: "Physics, Mathematics, Computer Science",
    imageUrl: "/images/teaching-styles/feynman.svg"
  },
  {
    id: "mankiw",
    name: "Greg Mankiw",
    description: "Presents economic principles with real-world examples and policy implications.",
    subject: "Economics, Finance, Business",
    imageUrl: "/images/teaching-styles/mankiw.svg"
  },
  {
    id: "krugman",
    name: "Paul Krugman",
    description: "Employs data-driven analysis with a focus on practical applications.",
    subject: "Economics, International Trade, Public Policy",
    imageUrl: "/images/teaching-styles/krugman.svg"
  },
  {
    id: "liskov",
    name: "Barbara Liskov",
    description: "Structured approach to programming concepts with emphasis on principles and abstractions.",
    subject: "Computer Science, Programming, Software Engineering",
    imageUrl: "/images/teaching-styles/liskov.svg"
  },
  {
    id: "knuth",
    name: "Donald Knuth",
    description: "Detailed and thorough exploration of algorithms with mathematical precision.",
    subject: "Computer Science, Algorithms, Mathematics",
    imageUrl: "/images/teaching-styles/knuth.svg"
  }
];

interface TeachingStyleSelectorProps {
  selectedStyle: string;
  onSelectStyle: (style: string) => void;
}

export function TeachingStyleSelector({
  selectedStyle,
  onSelectStyle
}: TeachingStyleSelectorProps) {
  const [expanded, setExpanded] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleImageError = (styleId: string) => {
    setImageErrors(prev => ({
      ...prev,
      [styleId]: true
    }));
  };

  return (
    <div className="space-y-4">
      <div>
        <label
          className="block text-base font-semibold text-zinc-950 mb-4 dark:text-white"
        >
          Teaching Style
        </label>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {TEACHING_STYLES.map((style) => (
            <div
              key={style.id}
              onClick={() => onSelectStyle(style.id)}
              className={`
                relative border rounded-lg p-4 cursor-pointer transition-all
                ${selectedStyle === style.id 
                  ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20' 
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}
              `}
            >
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  {imageErrors[style.id] ? (
                    <span className="text-lg font-medium text-gray-500">{style.name[0]}</span>
                  ) : (
                    <Image 
                      src={style.imageUrl}
                      alt={style.name}
                      width={48}
                      height={48}
                      className="object-contain"
                      onError={() => handleImageError(style.id)}
                    />
                  )}
                </div>
                
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-white">
                    {style.name}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {style.subject}
                  </p>
                </div>
              </div>

              {selectedStyle === style.id && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-sky-500 rounded-full flex items-center justify-center">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 1L3.5 6.5L1 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
              
              <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-300">
                {style.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 