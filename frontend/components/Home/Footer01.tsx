"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import {
  IconBrandFacebook,
  IconBrandX,
  IconBrandInstagram,
  IconBrandYoutube,
  IconBrandLinkedin,
} from "@tabler/icons-react";
import {
  type WebSettings,
  type CompanySettings,
} from "@/services/online-services/webSettingsService";
import { useAuthContext } from "@/components/providers/auth-provider";

interface Footer01Props {
  initialWebSettings: WebSettings | null;
  initialCompanySettings: CompanySettings | null;
}

export default function Footer01({ initialWebSettings, initialCompanySettings }: Footer01Props) {
  const [webSettings] = useState<WebSettings | null>(initialWebSettings);
  const [companySettings] = useState<CompanySettings | null>(initialCompanySettings);
  const { isAuthenticated } = useAuthContext();
  const [isClient, setIsClient] = useState(false);

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Helper to check if social media link exists
  const hasSocialMedia = companySettings?.socialMedia && (
    companySettings.socialMedia.facebook ||
    companySettings.socialMedia.twitter ||
    companySettings.socialMedia.instagram ||
    companySettings.socialMedia.youtube ||
    companySettings.socialMedia.linkedin
  );

  return (
    <footer className="bg-gray-900 text-gray-300 pt-8 sm:pt-12 pb-4 sm:pb-6">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center mb-3 sm:mb-4">
              {webSettings?.logoUrl && webSettings.logoUrl.trim() !== '' ? (
                <Image
                  src={webSettings.logoUrl}
                  alt="Logo"
                  width={180}
                  height={64}
                  sizes="180px"
                  className="h-12 sm:h-14 lg:h-16 w-auto object-contain"
                  priority={false}
                  quality={90}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-white font-bold text-2xl sm:text-3xl">
                  {companySettings?.companyName || "LEATS"}
                </span>
              )}
            </Link>
            <p className="text-xs sm:text-sm mb-3 sm:mb-4 text-gray-400">
              {companySettings?.description || "Your one-stop shop for fresh groceries, daily essentials, and household items. We deliver quality products at the best prices, right to your doorstep."}
            </p>
            {hasSocialMedia && (
              <div className="flex gap-2 sm:gap-3">
                {companySettings?.socialMedia.facebook && (
                  <a
                    href={companySettings.socialMedia.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-800 rounded-full flex items-center justify-center hover:bg-[#e63946] transition-colors active:scale-95"
                  >
                    <IconBrandFacebook
                      size={16}
                      className="sm:w-[18px] sm:h-[18px]"
                    />
                  </a>
                )}
                {companySettings?.socialMedia.twitter && (
                  <a
                    href={companySettings.socialMedia.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-800 rounded-full flex items-center justify-center hover:bg-[#e63946] transition-colors active:scale-95"
                  >
                    <IconBrandX
                      size={16}
                      className="sm:w-[18px] sm:h-[18px]"
                    />
                  </a>
                )}
                {companySettings?.socialMedia.instagram && (
                  <a
                    href={companySettings.socialMedia.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-800 rounded-full flex items-center justify-center hover:bg-[#e63946] transition-colors active:scale-95"
                  >
                    <IconBrandInstagram
                      size={16}
                      className="sm:w-[18px] sm:h-[18px]"
                    />
                  </a>
                )}
                {companySettings?.socialMedia.youtube && (
                  <a
                    href={companySettings.socialMedia.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-800 rounded-full flex items-center justify-center hover:bg-[#e63946] transition-colors active:scale-95"
                  >
                    <IconBrandYoutube
                      size={16}
                      className="sm:w-[18px] sm:h-[18px]"
                    />
                  </a>
                )}
                {companySettings?.socialMedia.linkedin && (
                  <a
                    href={companySettings.socialMedia.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-800 rounded-full flex items-center justify-center hover:bg-[#e63946] transition-colors active:scale-95"
                  >
                    <IconBrandLinkedin
                      size={16}
                      className="sm:w-[18px] sm:h-[18px]"
                    />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-3 sm:mb-4 text-sm sm:text-base">
              Quick Links
            </h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <li>
                <Link
                  href="/about"
                  className="hover:text-[#e63946] transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-[#e63946] transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="hover:text-[#e63946] transition-colors"
                >
                  FAQs
                </Link>
              </li>
              {isClient && isAuthenticated && (
                <li>
                  <Link
                    href="/my-orders"
                    className="hover:text-[#e63946] transition-colors"
                  >
                    My Orders
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="text-white font-semibold mb-3 sm:mb-4 text-sm sm:text-base">
              Customer Service
            </h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <li>
                <Link
                  href="/shipping"
                  className="hover:text-[#e63946] transition-colors"
                >
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/returns"
                  className="hover:text-[#e63946] transition-colors"
                >
                  Returns & Refunds
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-[#e63946] transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-[#e63946] transition-colors"
                >
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-2 sm:col-span-1">
            <h4 className="text-white font-semibold mb-3 sm:mb-4 text-sm sm:text-base">
              Contact Us
            </h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              {/* {companySettings?.address && (
                <li className="flex items-start gap-2">
                  <span>📍</span>
                  <span>
                    {companySettings.address}
                    {companySettings.city && `, ${companySettings.city}`}
                    {companySettings.state && `, ${companySettings.state}`}
                    {companySettings.zipCode && ` ${companySettings.zipCode}`}
                  </span>
                </li>
              )} */}
              {companySettings?.phone && (
                <li className="flex items-center gap-2">
                  <span>📞</span>
                  <a 
                    href={`tel:${companySettings.phone}`}
                    className="hover:text-[#e63946] transition-colors hover:underline"
                  >
                    {companySettings.phone}
                  </a>
                </li>
              )}
              {companySettings?.email && (
                <li className="flex items-center gap-2">
                  <span>✉️</span>
                  <a 
                    href={`mailto:${companySettings.email}`}
                    className="hover:text-[#e63946] transition-colors hover:underline"
                  >
                    {companySettings.email}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
