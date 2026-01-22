'use client';

import { useState } from "react";
import {
  type CompanySettings,
} from "@/services/online-services/webSettingsService";

interface Footer02Props {
  initialCompanySettings: CompanySettings | null;
}

export default function Footer02({ initialCompanySettings }: Footer02Props) {
  const [companySettings] = useState<CompanySettings | null>(initialCompanySettings);

  const currentYear = new Date().getFullYear();

  return (
    <div className="bg-gray-950 text-gray-400 py-3 sm:py-4">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <p className="text-xs sm:text-sm text-center sm:text-left">
            © {currentYear} {companySettings?.companyName || "Leats"}. All rights reserved. Developed with ❤️ by{" "}
            <a
              href="https://mntfuture.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#e63946] hover:underline font-medium"
            >
              MNT
            </a>
          </p>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
            <span className="text-xs sm:text-sm">We Accept:</span>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="bg-white text-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium">VISA</span>
              <span className="bg-white text-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium">Mastercard</span>
              <span className="bg-white text-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium">UPI</span>
              <span className="bg-white text-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium">COD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
