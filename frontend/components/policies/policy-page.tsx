"use client";

import { useState } from "react";
import Link from "next/link";
import { IconChevronRight } from "@tabler/icons-react";
import { Policy } from "@/services/online-services/policyService";

interface PolicyPageProps {
  initialPolicy: Policy | null;
  slug: string;
  defaultTitle: string;
  defaultContent?: React.ReactNode;
}

export const PolicyPage = ({ initialPolicy, slug, defaultTitle, defaultContent }: PolicyPageProps) => {
  const [policy] = useState<Policy | null>(initialPolicy);

  // If no policy found, show default content
  if (!policy) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Breadcrumb */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-2 text-sm">
              <Link href="/" className="text-gray-500 hover:text-[#e63946]">
                Home
              </Link>
              <IconChevronRight size={16} className="text-gray-400" />
              <span className="text-gray-800 font-medium">{defaultTitle}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-[90rem] mx-auto bg-white rounded-xl shadow-sm p-8">
            {defaultContent || (
              <div className="text-center py-12">
                <h1 className="text-4xl font-bold text-gray-800 mb-4">{defaultTitle}</h1>
                <p className="text-gray-500">This policy is currently being updated. Please check back later.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-[#e63946]">
              Home
            </Link>
            <IconChevronRight size={16} className="text-gray-400" />
            <span className="text-gray-800 font-medium">{policy.title}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-[90rem] mx-auto bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">{policy.title}</h1>
          {policy.lastUpdated && (
            <p className="text-gray-500 mb-8">
              Last updated: {new Date(policy.lastUpdated).toLocaleDateString()}
            </p>
          )}

          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: policy.content }}
          />

          {policy.version > 1 && (
            <div className="mt-8 text-sm text-gray-500">
              Version {policy.version}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
