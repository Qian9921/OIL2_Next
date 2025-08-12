"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { ProjectCard } from "@/components/project/project-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Project } from "@/lib/types";
import { Timestamp } from "firebase/firestore";

export default function TestExpiredPage() {
  // Create mock projects with different expiration statuses
  const mockProjects: Project[] = [
    {
      id: "1",
      title: "Active Project - Not Expired",
      description: "This is an active project that hasn't expired yet.",
      shortDescription: "Active project description",
      ngoId: "ngo1",
      ngoName: "Test NGO",
      status: "published",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      currentParticipants: 5,
      maxParticipants: 20,
      tags: ["education", "technology"],
      difficulty: "intermediate",
      deadline: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
      subtasks: [
        {
          id: "1",
          title: "Task 1",
          description: "First task",
          order: 1,
          estimatedHours: 5
        }
      ]
    },
    {
      id: "2", 
      title: "Expired Project - Past Deadline",
      description: "This project has passed its deadline and should appear grayed out.",
      shortDescription: "Expired project description",
      ngoId: "ngo2",
      ngoName: "Another NGO",
      status: "completed",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      currentParticipants: 10,
      maxParticipants: 15,
      tags: ["environment", "research"],
      difficulty: "advanced",
      deadline: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)), // 7 days ago
      subtasks: [
        {
          id: "2",
          title: "Task 2",
          description: "Second task",
          order: 1,
          estimatedHours: 8
        }
      ]
    },
    {
      id: "3",
      title: "Recently Expired Project",
      description: "This project expired yesterday and should be in the expired category.",
      shortDescription: "Recently expired project",
      ngoId: "ngo3", 
      ngoName: "Third NGO",
      status: "completed",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      currentParticipants: 3,
      maxParticipants: 10,
      tags: ["health", "community"],
      difficulty: "beginner",
      deadline: Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)), // 1 day ago
      subtasks: [
        {
          id: "3",
          title: "Task 3", 
          description: "Third task",
          order: 1,
          estimatedHours: 3
        }
      ]
    }
  ];

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleJoinClick = (project: Project) => {
    setSelectedProject(project);
    alert(`Attempted to join: ${project.title}`);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expired Projects Test Page</h1>
          <p className="text-gray-600 mt-2">
            This page demonstrates how expired projects appear grayed out and cannot be joined.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              showJoinButton={true}
              isJoined={false}
              isCompleted={false}
              isFull={false}
              isJoining={false}
              onJoinClick={handleJoinClick}
            />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p><strong>Expected Behavior:</strong></p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Active Project:</strong> Should appear normal with a blue "Join Project" button</li>
                <li><strong>Expired Projects:</strong> Should appear grayed out with "Project Expired" button (disabled)</li>
                <li>Expired projects should have an "Expired" badge visible</li>
                <li>The expired projects should have reduced opacity and grayscale effect</li>
              </ul>
              
              <p className="mt-4"><strong>To test the full functionality:</strong></p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Go to the student projects page (/student/projects)</li>
                <li>Check that the default filter shows "Available" projects (non-expired)</li>
                <li>Change the filter to "Expired" to see only expired projects</li>
                <li>Change to "All Statuses" to see both active and expired projects</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
