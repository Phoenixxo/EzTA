import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: "",
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("EzTA UI crash", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#d7d6d1] p-4 text-zinc-950">
          <div className="mx-auto max-w-3xl rounded-none border border-red-300 bg-red-50 px-6 py-5">
            <div className="text-sm font-semibold uppercase tracking-[0.14em] text-red-700">
              Interface error
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-red-900">
              The UI hit a runtime error instead of silently blanking.
            </h1>
            <p className="mt-3 text-sm leading-6 text-red-800">
              Refresh the app to recover. If this keeps happening, send the exact field and key
              sequence that triggered it.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-none bg-white/80 p-3 text-xs text-red-900">
              {this.state.errorMessage || "Unknown runtime error"}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
