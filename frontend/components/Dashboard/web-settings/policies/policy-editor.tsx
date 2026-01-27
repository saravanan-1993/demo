"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, Eye, EyeOff, FileText, CheckCircle2 } from "lucide-react";
import axiosInstance from "@/lib/axios";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import dynamic from "next/dynamic";

// Dynamically import the rich text editor to avoid SSR issues
const RichTextEditor = dynamic<RichTextEditorProps>(
  () => import("@/components/ui/rich-text-editor").then((mod) => mod.RichTextEditor),
  { ssr: false, loading: () => <div className="h-64 border rounded-md animate-pulse bg-muted" /> }
);

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface Policy {
  id: string | null;
  policyType: string;
  title: string;
  slug: string;
  content: string;
  isActive: boolean;
  isPublished: boolean;
  version: number;
  lastUpdated: string | null;
}

const POLICY_TYPES = [
  {
    type: "privacy",
    title: "Privacy Policy",
    description: "How we collect, use, and protect user data",
    icon: "🔒",
  },
  {
    type: "terms",
    title: "Terms & Conditions",
    description: "Terms of service and user agreements",
    icon: "📜",
  },
  {
    type: "returns",
    title: "Returns & Refunds Policy",
    description: "Product return and refund guidelines",
    icon: "↩️",
  },
  {
    type: "shipping",
    title: "Shipping Policy",
    description: "Shipping methods, costs, and delivery times",
    icon: "📦",
  },
  // {
  //   type: "cookie",
  //   title: "Cookie Policy",
  //   description: "How we use cookies and tracking technologies",
  //   icon: "🍪",
  // },
];

export const PolicyEditor = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [editedTitle, setEditedTitle] = useState("");

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/api/web/policies");
      if (response.data.success) {
        setPolicies(response.data.data || []);
      }
    } catch (error: unknown) {
      console.error("Error fetching policies:", error);
      toast.error("Failed to load policies");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPolicy = (policy: Policy) => {
    setSelectedPolicy(policy);
    setEditedContent(policy.content);
    setEditedTitle(policy.title);
  };

  const handleSave = async () => {
    if (!selectedPolicy) return;

    try {
      setSaving(true);

      const response = await axiosInstance.post("/api/web/policies", {
        policyType: selectedPolicy.policyType,
        title: editedTitle,
        content: editedContent,
        isActive: selectedPolicy.isActive,
        isPublished: selectedPolicy.isPublished,
      });

      if (response.data.success) {
        toast.success("Policy saved successfully");
        fetchPolicies();
        // Update selected policy with new data
        setSelectedPolicy(response.data.data);
      }
    } catch (error: unknown) {
      console.error("Error saving policy:", error);
      const errorMessage =
        error instanceof Error && "response" in error && typeof (error as any).response === "object"
          ? ((error as any).response?.data?.error as string) || "Failed to save policy"
          : "Failed to save policy";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!selectedPolicy || !selectedPolicy.id) {
      toast.error("Please save the policy first before publishing");
      return;
    }

    try {
      const newPublishStatus = !selectedPolicy.isPublished;
      const response = await axiosInstance.patch(
        `/api/web/policies/${selectedPolicy.id}/publish`,
        { isPublished: newPublishStatus }
      );

      if (response.data.success) {
        toast.success(
          newPublishStatus ? "Policy published successfully" : "Policy unpublished successfully"
        );
        setSelectedPolicy({ ...selectedPolicy, isPublished: newPublishStatus });
        fetchPolicies();
      }
    } catch (error: unknown) {
      console.error("Error toggling publish status:", error);
      toast.error("Failed to update publish status");
    }
  };

  const handleToggleActive = (checked: boolean) => {
    if (selectedPolicy) {
      setSelectedPolicy({ ...selectedPolicy, isActive: checked });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Policy Management</h2>
        <p className="text-sm text-muted-foreground">
          Create and manage website policies
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Policy List */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase">
            Select Policy
          </h3>
          {POLICY_TYPES.map((policyType) => {
            const policy = policies.find((p) => p.policyType === policyType.type);
            const isSelected = selectedPolicy?.policyType === policyType.type;

            return (
              <Card
                key={policyType.type}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? "ring-2 ring-primary" : ""
                }`}
                onClick={() =>
                  handleSelectPolicy(
                    policy || {
                      id: null,
                      policyType: policyType.type,
                      title: policyType.title,
                      slug: "",
                      content: "",
                      isActive: true,
                      isPublished: false,
                      version: 1,
                      lastUpdated: null,
                    }
                  )
                }
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{policyType.icon}</span>
                      <div>
                        <CardTitle className="text-base">{policyType.title}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {policyType.description}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2">
                    {policy?.isPublished && (
                      <Badge variant="default" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Published
                      </Badge>
                    )}
                    {policy?.id && !policy?.isPublished && (
                      <Badge variant="secondary" className="text-xs">
                        Draft
                      </Badge>
                    )}
                    {!policy?.id && (
                      <Badge variant="outline" className="text-xs">
                        Not Created
                      </Badge>
                    )}
                    {policy?.version && policy.version > 1 && (
                      <Badge variant="outline" className="text-xs">
                        v{policy.version}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Policy Editor */}
        <div className="lg:col-span-2">
          {selectedPolicy ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Edit {selectedPolicy.title}</CardTitle>
                    <CardDescription>
                      {selectedPolicy.lastUpdated
                        ? `Last updated: ${new Date(selectedPolicy.lastUpdated).toLocaleString()}`
                        : "Not yet saved"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={selectedPolicy.isPublished ? "destructive" : "default"}
                      size="sm"
                      onClick={handleTogglePublish}
                      disabled={!selectedPolicy.id}
                    >
                      {selectedPolicy.isPublished ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Unpublish
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Publish
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Policy Title</Label>
                  <Input
                    id="title"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    placeholder="Enter policy title"
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Active Status</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable this policy
                    </p>
                  </div>
                  <Switch
                    checked={selectedPolicy.isActive}
                    onCheckedChange={handleToggleActive}
                  />
                </div>

                {/* Content Editor */}
                <div className="space-y-2">
                  <Label>Policy Content</Label>
                  <RichTextEditor
                    value={editedContent}
                    onChange={setEditedContent}
                    placeholder="Enter policy content..."
                  />
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Policy
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Policy Selected</h3>
                <p className="text-sm text-muted-foreground">
                  Select a policy from the list to start editing
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
