"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createSampleSubmissions } from "@/lib/firestore";
import { 
  Database,
  Users,
  FileText,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

export default function AdminPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const handleCreateSampleData = async () => {
    setIsCreating(true);
    setMessage("");
    
    try {
      await createSampleSubmissions();
      setMessage("Sample submissions created successfully!");
      setMessageType('success');
    } catch (error) {
      console.error("Error creating sample data:", error);
      setMessage("Error creating sample data. Please try again.");
      setMessageType('error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Manage system data and configurations 🔧
            </p>
          </div>
        </div>

        {/* Data Management */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-blue-600" />
                <span>Sample Data Management</span>
              </CardTitle>
              <CardDescription>
                Create sample data for testing the teacher functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Sample Submissions</h4>
                <p className="text-blue-800 text-sm mb-3">
                  Creates sample student submissions for teachers to review. This includes:
                </p>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• Water quality analysis project submission</li>
                  <li>• Food waste reduction app prototype</li>
                  <li>• Digital literacy training report</li>
                </ul>
              </div>
              
              <Button 
                onClick={handleCreateSampleData}
                disabled={isCreating}
                className="w-full"
              >
                {isCreating ? (
                  <div className="loading-spinner mr-2" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                {isCreating ? "Creating..." : "Create Sample Submissions"}
              </Button>

              {message && (
                <div className={`p-3 rounded-lg flex items-center ${
                  messageType === 'success' 
                    ? 'bg-green-50 text-green-800' 
                    : 'bg-red-50 text-red-800'
                }`}>
                  {messageType === 'success' ? (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 mr-2" />
                  )}
                  {message}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-green-600" />
                <span>User Management</span>
              </CardTitle>
              <CardDescription>
                Manage user roles and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
                <p className="text-gray-600">
                  User management features coming soon...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions for Testing Teacher Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Step 1: Create Sample Data</h4>
                <p className="text-gray-600 text-sm">
                  Click the &quot;Create Sample Submissions&quot; button to generate test submissions for teachers to review.
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Step 2: Login as Teacher</h4>
                <p className="text-gray-600 text-sm">
                  Sign in with a teacher account to access the teacher dashboard and review features.
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Step 3: Test Features</h4>
                <p className="text-gray-600 text-sm">
                  Navigate to Submissions page to review student work, Students page to view learners, and Reports for analytics.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
} 