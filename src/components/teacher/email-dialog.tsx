"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { LoadingState } from "@/components/ui/loading-state";
import { toast } from "@/hooks/use-toast";
import { getUsersByRole } from "@/lib/firestore";
import { User } from "@/lib/types";
import { generateAvatar } from "@/lib/utils";
import { Mail, Send, Users, CheckSquare, Square, AlertCircle, Info, FileText } from "lucide-react";

interface EmailDialogProps {
  trigger: React.ReactNode;
}

export function EmailDialog({ trigger }: EmailDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  
  // 表单数据
  const [senderEmail, setSenderEmail] = useState("");
  const [senderPassword, setSenderPassword] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  // 加载学生列表
  useEffect(() => {
    if (isOpen) {
      loadStudents();
    }
  }, [isOpen]);

  const loadStudents = async () => {
    setLoadingStudents(true);
    try {
      const allStudents = await getUsersByRole('student');
      setStudents(allStudents);
    } catch (error) {
      console.error("Failed to load student list:", error);
      toast({
        title: "Error",
        description: "Failed to load student list",
        variant: "destructive",
      });
    } finally {
      setLoadingStudents(false);
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(student => student.id));
    }
  };

  const handleSendEmail = async () => {
    if (!senderEmail || !senderPassword || !subject || !content) {
      toast({
        title: "Incomplete Form",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderEmail,
          senderPassword,
          subject,
          content,
          recipientIds: selectedStudents,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Email Sent Successfully",
          description: result.message,
        });
        
        // 重置表单
        setSenderEmail("");
        setSenderPassword("");
        setSubject("");
        setContent("");
        setSelectedStudents([]);
        setIsOpen(false);
      } else {
        toast({
          title: "Email Sending Failed",
          description: result.error || "Failed to send email. Please try again later.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Email sending error:", error);
      toast({
        title: "Network Error",
        description: "Please check your network connection and try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <span>Send Email to Students</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 发送者信息 */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>Sender Information</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Gmail Email Address *
                    </label>
                    <Input
                      type="email"
                      placeholder="your.email@gmail.com"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Gmail Password or App Password *
                    </label>
                    <Input
                      type="password"
                      placeholder="Password"
                      value={senderPassword}
                      onChange={(e) => setSenderPassword(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Important Note:</p>
                    <p>For security reasons, we recommend using Gmail App Password instead of your account password.</p>
                    <p>Please go to Gmail Settings → Security → 2-Step Verification → App Passwords to create one.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 邮件内容 */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Email Content</span>
                </h3>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email Subject *
                  </label>
                  <Input
                    placeholder="Enter email subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email Content *
                  </label>
                  <Textarea
                    placeholder="Enter email content..."
                    rows={6}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 学生选择 */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>Select Recipients</span>
                  </h3>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllStudents}
                    className="flex items-center space-x-2"
                  >
                    {selectedStudents.length === students.length ? (
                      <>
                        <CheckSquare className="w-4 h-4" />
                        <span>Deselect All</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4" />
                        <span>Select All ({students.length} students)</span>
                      </>
                    )}
                  </Button>
                </div>

                {loadingStudents ? (
                  <LoadingState text="Loading student list..." />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedStudents.includes(student.id)
                            ? "bg-blue-50 border-blue-300"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => toggleStudentSelection(student.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {selectedStudents.includes(student.id) ? (
                              <CheckSquare className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          
                          <Avatar
                            src={generateAvatar(student.id)}
                            alt={student.name}
                            size="sm"
                          />
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {student.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {student.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-sm text-gray-600">
                  Selected {selectedStudents.length} students
                  {selectedStudents.length === 0 && (
                    <span className="text-blue-600 ml-1">(will send to all students)</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 发送按钮 */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleSendEmail}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Email</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 