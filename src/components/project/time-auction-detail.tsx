"use client";

import { TimeAuctionProject } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  Users, 
  ExternalLink,
  Award,
  Calendar,
  Clock,
  MapPin,
  Target,
  CheckCircle,
  Lightbulb,
  Briefcase,
  Globe,
  Trophy,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";

interface TimeAuctionDetailProps {
  project: TimeAuctionProject;
}

export function TimeAuctionDetail({ project }: TimeAuctionDetailProps) {
  const formatSkills = (skills: string[]) => {
    return skills.join(' • ');
  };

  const formatLanguages = (languages: string[]) => {
    return languages.join(' / ');
  };

  return (
    <div className="space-y-6">
      {/* Back to Time Auction Button */}
      <div className="flex items-center">
        <Link href="/time-auction">
          <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Time Auction Projects
          </Button>
        </Link>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 rounded-2xl p-8 md:p-12">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-orange-200 opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-red-200 opacity-20 blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm font-medium text-orange-700 bg-orange-100 px-3 py-1 rounded-full">
                  Time Auction Partner Project
                </span>
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                  project.posting_info.application_status === 'Application closed' 
                    ? 'text-gray-700 bg-gray-100' 
                    : 'text-green-700 bg-green-100'
                }`}>
                  {project.posting_info.application_status}
                </span>
              </div>
              <h1 className="text-4xl font-bold text-gray-900">{project.project_title}</h1>
            </div>
          </div>
          
          <div className="text-lg text-gray-700 mb-6">
            {project.project_description}
          </div>
          
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm rounded-full px-4 py-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium">{project.requirements.time}</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm rounded-full px-4 py-2">
              <MapPin className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium">{project.project_details.location}</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm rounded-full px-4 py-2">
              <Calendar className="w-4 h-4 text-pink-600" />
              <span className="text-sm font-medium">{project.project_details.project_period}</span>
            </div>
          </div>
          
          <div className="flex gap-4">
            <Link href={project.project_url} target="_blank" rel="noopener noreferrer">
              <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white">
                Apply on Time Auction
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href={project.organization.website} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50">
                Learn More About Time Auction
                <Globe className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* What We Need */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-orange-600" />
                <span>What We Need</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {project.project_details.what_we_need.map((item, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Project Background */}
          {project.project_details.background && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5 text-blue-600" />
                  <span>Project Background</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{project.project_details.background}</p>
              </CardContent>
            </Card>
          )}

          {/* What We Provide */}
          {project.project_details.what_we_have && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="w-5 h-5 text-purple-600" />
                  <span>What We Provide</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{project.project_details.what_we_have}</p>
                {project.project_details.what_we_have.includes('https://') && (
                  <div className="mt-4">
                    <Link 
                      href="https://timeauction.org/en/calls/program_page" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-orange-600 hover:text-orange-700 font-medium inline-flex items-center"
                    >
                      View Program Details
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Why Important */}
          {project.project_details.why_important && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="w-5 h-5 text-red-600" />
                  <span>Why This Matters</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{project.project_details.why_important}</p>
              </CardContent>
            </Card>
          )}

          {/* Special Program */}
          {project.special_program && (
            <Card className="border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  <span>{project.special_program.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{project.special_program.description}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-gray-600" />
                <span>Requirements</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Skills Needed</h4>
                <p className="text-sm text-gray-600">{formatSkills(project.requirements.skills)}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Experience Level</h4>
                <p className="text-sm text-gray-600">{project.requirements.experience_level.join(', ')}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Languages</h4>
                <p className="text-sm text-gray-600">{formatLanguages(project.requirements.language)}</p>
              </div>
              
              {project.requirements.age_range !== 'No age requirement' && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Age Range</h4>
                  <p className="text-sm text-gray-600">{project.requirements.age_range}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Organization Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-gray-600" />
                <span>About Time Auction</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700 leading-relaxed">{project.organization.description}</p>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Focus Areas</h4>
                <div className="flex flex-wrap gap-1">
                  {project.organization.causes.map((cause, index) => (
                    <span 
                      key={index}
                      className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full"
                    >
                      {cause}
                    </span>
                  ))}
                </div>
              </div>
              
              <Link 
                href={project.organization.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-700 text-sm font-medium inline-flex items-center"
              >
                Visit Website
                <ExternalLink className="w-3 h-3 ml-1" />
              </Link>
            </CardContent>
          </Card>

          {/* Similar Opportunities */}
          {project.similar_opportunities && project.similar_opportunities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Similar Opportunities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.similar_opportunities.map((opportunity, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-sm text-gray-900 mb-1">{opportunity.title}</h4>
                    <p className="text-xs text-gray-600 mb-2">{opportunity.organization}</p>
                    <p className="text-xs text-orange-600">{opportunity.time}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 