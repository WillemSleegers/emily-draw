"use client"

import React, { Component, ReactNode } from "react"
import { AlertCircleIcon, ArrowBigLeftIcon } from "lucide-react"
import { Button } from "./ui/button"
import { APP_BACKGROUND_GRADIENT } from "@/lib/constants"

interface ErrorBoundaryProps {
  children: ReactNode
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={`flex flex-col items-center justify-center h-full w-full p-8 ${APP_BACKGROUND_GRADIENT}`}>
          <div className="flex flex-col items-center gap-12">
            {/* Sad icon */}
            <div className="size-48 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
              <AlertCircleIcon className="size-32 text-red-600 dark:text-red-400" />
            </div>

            {/* Simple message */}
            <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100">
              Oops!
            </h1>

            {/* Action button - tap to go back */}
            <Button
              onClick={this.handleReset}
              className="size-32 rounded-xl border-4 border-gray-300 dark:border-gray-600 hover:border-blue-400 bg-white dark:bg-gray-800"
              variant="outline"
            >
              <ArrowBigLeftIcon className="size-16" />
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
