import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-bold text-primary mb-4">404: Page Not Found</h1>
      <p className="text-xl mb-8">The page you are looking for doesn't exist or has been moved.</p>
      <Link href="/">
        <a className="px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors">
          Return to Home
        </a>
      </Link>
    </div>
  );
}