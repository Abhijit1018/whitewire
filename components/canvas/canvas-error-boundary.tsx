"use client";

import React from "react";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class CanvasErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[CanvasErrorBoundary]", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="absolute inset-0 z-50 overflow-auto bg-red-50 p-4 text-xs text-red-800">
          <p className="mb-2 font-bold">Canvas crashed:</p>
          <pre className="whitespace-pre-wrap break-all">{this.state.error.message}</pre>
          <pre className="mt-2 whitespace-pre-wrap break-all opacity-70">
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
