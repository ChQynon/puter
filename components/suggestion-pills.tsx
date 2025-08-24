"use client"

import { Button } from "@/components/ui/button"

interface SuggestionPillsProps {
  suggestions: string[]
  onSuggestionClick: (suggestion: string) => void
  className?: string
}

export function SuggestionPills({ suggestions, onSuggestionClick, className }: SuggestionPillsProps) {
  return (
    <div className={`flex flex-wrap gap-2 justify-center mb-4 ${className}`}>
      {suggestions.map((suggestion, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={() => onSuggestionClick(suggestion)}
          className="rounded-full px-4 py-2 text-sm bg-secondary/50 hover:bg-secondary border-border hover:border-ring transition-all duration-200"
        >
          {suggestion}
        </Button>
      ))}
    </div>
  )
}
