"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  RefreshCw,
  Shield,
  Bell,
  Globe,
  Server,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/monitor/language-switcher";
import { LoadingState } from "@/components/ui/loading-state";
import type { RuntimeAdminSettingsSnapshot } from "@/lib/admin-settings";

type SectionCardProps = {
  title: string;
  description: string;
  icon: React.ElementType;
  rows: Array<{ label: string; value: string; status?: "ok" | "warn" }>;
};

function StatusPill({ status }: { status?: "ok" | "warn" }) {
  if (!status) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        status === "ok"
          ? "bg-green-100 text-green-800"
          : "bg-amber-100 text-amber-800"
      }`}
    >
      {status === "ok" ? "Configured" : "Fallback"}
    </span>
  );
}

function SectionCard({ title, description, icon: Icon, rows }: SectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-blue-600" />
          <span>{title}</span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0">
            <span className="text-sm text-gray-600">{row.label}</span>
            <div className="flex items-center gap-2 text-right">
              <span className="text-sm font-medium text-gray-900 break-all">{row.value}</span>
              <StatusPill status={row.status} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<RuntimeAdminSettingsSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch("/api/admin/settings", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Settings request failed: ${response.status}`);
      }

      const data = (await response.json()) as RuntimeAdminSettingsSnapshot;
      setSettings(data);
    } catch (error) {
      console.error("Error loading admin settings:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const exportSnapshot = () => {
    if (!settings) {
      return;
    }

    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `runtime-settings-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading || !settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingState text="Loading runtime settings..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>返回</span>
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">运行配置摘要</h1>
                <p className="text-sm text-gray-600">
                  Updated at {new Date(settings.generatedAt).toLocaleString("zh-CN")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Button
                onClick={() => void loadSettings()}
                variant="outline"
                className="flex items-center gap-2"
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>刷新</span>
              </Button>
              <Button onClick={exportSnapshot} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span>导出快照</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-amber-900">This page is read-only.</p>
            <p className="text-sm text-amber-800">
              It shows the effective server runtime configuration. Editing values here no longer pretends to change production behavior.
            </p>
          </div>
        </div>

        {settings.notes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Runtime Notes</CardTitle>
              <CardDescription>These are configuration risks detected from the live server environment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {settings.notes.map((note) => (
                <div key={note} className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {note}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionCard
            title="General"
            description="Core runtime identity and deployment values."
            icon={Globe}
            rows={[
              { label: "System Name", value: settings.general.systemName },
              { label: "Default Language", value: settings.general.defaultLanguage },
              { label: "Timezone", value: settings.general.timezone },
              {
                label: "App URL",
                value: settings.general.appUrlConfigured ? "Configured" : "Missing",
                status: settings.general.appUrlConfigured ? "ok" : "warn",
              },
              {
                label: "Deployment Project",
                value: settings.general.deploymentProjectId ?? "Unavailable",
                status: settings.general.deploymentProjectId ? "ok" : "warn",
              },
            ]}
          />

          <SectionCard
            title="Monitoring"
            description="Monitor access and session protection values."
            icon={Server}
            rows={[
              {
                label: "Monitor Access",
                value: settings.monitoring.monitorAccessConfigured ? "Configured" : "Missing env",
                status: settings.monitoring.monitorAccessConfigured ? "ok" : "warn",
              },
              {
                label: "Session Timeout",
                value: `${settings.monitoring.sessionTimeoutSeconds} seconds`,
              },
              { label: "Session Cookie", value: settings.monitoring.cookieName },
            ]}
          />

          <SectionCard
            title="Notifications"
            description="Current email delivery mode and admin alert setup."
            icon={Bell}
            rows={[
              { label: "Email Mode", value: "NGO sender credentials per request" },
              {
                label: "Platform SMTP",
                value: settings.notifications.platformEmailConfigured ? "Configured" : "Not configured",
                status: settings.notifications.platformEmailConfigured ? "ok" : "warn",
              },
              {
                label: "Admin Email Env",
                value: settings.notifications.adminEmailConfigured ? "Configured" : "Missing",
                status: settings.notifications.adminEmailConfigured ? "ok" : "warn",
              },
            ]}
          />

          <SectionCard
            title="Security"
            description="Secrets and auth bridge state derived from server env."
            icon={Shield}
            rows={[
              {
                label: "NextAuth Secret",
                value: settings.security.nextAuthSecretConfigured ? "Configured" : "Missing",
                status: settings.security.nextAuthSecretConfigured ? "ok" : "warn",
              },
              {
                label: "Monitor Session Secret",
                value: settings.security.monitorSessionSecretConfigured ? "Configured" : "Fallback to NEXTAUTH_SECRET or missing",
                status: settings.security.monitorSessionSecretConfigured ? "ok" : "warn",
              },
              {
                label: "Firebase Auth Bridge",
                value: settings.security.firebaseAuthBridgeEnabled ? "Available" : "Unavailable",
                status: settings.security.firebaseAuthBridgeEnabled ? "ok" : "warn",
              },
            ]}
          />

          <SectionCard
            title="Firebase Client"
            description="Browser-side Firebase runtime values."
            icon={Globe}
            rows={[
              {
                label: "Project ID",
                value: settings.integrations.firebaseClient.effectiveProjectId,
                status: settings.integrations.firebaseClient.usesFallback ? "warn" : "ok",
              },
              { label: "Auth Domain", value: settings.integrations.firebaseClient.authDomain },
              { label: "Storage Bucket", value: settings.integrations.firebaseClient.storageBucket },
              {
                label: "Env Completeness",
                value: settings.integrations.firebaseClient.envConfigured ? "Complete" : "Partial",
                status: settings.integrations.firebaseClient.envConfigured ? "ok" : "warn",
              },
            ]}
          />

          <SectionCard
            title="Firebase Admin / Vertex"
            description="Server-side project selection and model routing."
            icon={Server}
            rows={[
              {
                label: "Firebase Admin Project",
                value: settings.integrations.firebaseAdmin.effectiveProjectId,
                status: settings.integrations.firebaseAdmin.usesFallback ? "warn" : "ok",
              },
              {
                label: "Service Account ID",
                value: settings.integrations.firebaseAdmin.serviceAccountIdConfigured ? "Explicitly configured" : "Derived or default",
                status: settings.integrations.firebaseAdmin.serviceAccountIdConfigured ? "ok" : "warn",
              },
              {
                label: "Vertex Project",
                value: settings.integrations.vertexAI.effectiveProjectId,
                status: settings.integrations.vertexAI.usesProjectFallback ? "warn" : "ok",
              },
              {
                label: "Vertex Location",
                value: settings.integrations.vertexAI.location,
                status: settings.integrations.vertexAI.usesLocationFallback ? "warn" : "ok",
              },
              { label: "Fast Model", value: settings.integrations.vertexAI.fastModel },
              { label: "Complex Model", value: settings.integrations.vertexAI.complexModel },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
