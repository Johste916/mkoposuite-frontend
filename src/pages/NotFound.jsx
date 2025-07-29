import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
      <h1 className="text-6xl font-bold text-red-500 mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
      <p className="mb-6 text-gray-600 max-w-md">
        Oops! The page you are looking for doesn’t exist or has been moved. Try going back to the dashboard.
      </p>
      <Button asChild variant="default" size="lg">
        <Link to="/dashboard" className="flex items-center gap-2">
          <ArrowLeft size={20} /> Back to Dashboard
        </Link>
      </Button>
    </div>
  );
};

export default NotFound;
