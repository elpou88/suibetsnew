import { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Home, AlertOctagon } from 'lucide-react';
import { Link } from 'wouter';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component catches JavaScript errors anywhere in child component tree
 * and displays a fallback UI instead of crashing the whole application
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // You can log the error to an error reporting service here
    console.error('Error caught by ErrorBoundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  // Reset the error boundary state
  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="container py-8 min-h-[50vh] flex items-center justify-center">
          <Card className="w-full max-w-md bg-[#0f1c1f] border-[#1e3a3f]">
            <CardHeader className="bg-[#112225] border-b border-[#1e3a3f]">
              <CardTitle className="text-red-400 flex items-center">
                <AlertOctagon className="w-5 h-5 mr-2" />
                Something went wrong
              </CardTitle>
              <CardDescription className="text-gray-400">
                An error occurred while loading this page
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-4 p-3 bg-[#0b1618] border border-[#1e3a3f] rounded-md text-gray-300 overflow-auto max-h-32">
                <p className="font-mono text-xs whitespace-pre-wrap">
                  {this.state.error?.message || 'Unknown error'}
                </p>
              </div>
              <div className="flex justify-between">
                <Button
                  onClick={this.handleReset}
                  className="bg-cyan-500 hover:bg-cyan-600 text-black"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Link href="/">
                  <Button variant="outline" className="border-cyan-400 text-cyan-400 hover:bg-cyan-400/10">
                    <Home className="w-4 h-4 mr-2" />
                    Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // If there's no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;