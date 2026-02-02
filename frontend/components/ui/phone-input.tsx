"use client";

import * as React from "react";
import { getCountryCallingCode, CountryCode, getExampleNumber } from "libphonenumber-js";
import examples from "libphonenumber-js/mobile/examples";
import { cn } from "@/lib/utils";
import { Country } from "country-state-city";
import * as flags from 'country-flag-icons/react/3x2';

export interface PhoneInputProps {
  country?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
}

// Cache for country lookups to improve performance
const countryCache = new Map<string, string>();

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, country = "", value = "", onChange, disabled, id }, ref) => {
    // Get country object with flag - memoized
    const countryData = React.useMemo(() => {
      if (!country) return null;
      
      const allCountries = Country.getAllCountries();
      return allCountries.find(
        (c) => c.name.trim().toLowerCase() === country.trim().toLowerCase()
      );
    }, [country]);
    
    // Get ISO code from country name - memoized
    const countryCode = React.useMemo(() => {
      if (!country) return "IN";
      
      // Check cache first
      if (countryCache.has(country)) {
        return countryCache.get(country)!;
      }
      
      const isoCode = countryData?.isoCode || "IN";
      countryCache.set(country, isoCode);
      return isoCode;
    }, [country, countryData]);
    
    // Get country calling code - memoized
    const callingCode = React.useMemo(() => {
      try {
        return `+${getCountryCallingCode(countryCode as CountryCode)}`;
      } catch {
        return "+91";
      }
    }, [countryCode]);
    
    // Get Flag component from country-flag-icons - memoized
    const FlagComponent = React.useMemo(() => {
      return flags[countryCode as keyof typeof flags] || flags.IN;
    }, [countryCode]);
    
    // Get exact phone length - dynamically from libphonenumber-js
    const exactLength = React.useMemo(() => {
      try {
        // Get example number for the country to determine exact length
        const exampleNumber = getExampleNumber(countryCode as CountryCode, examples);
        if (exampleNumber) {
          return exampleNumber.nationalNumber.length;
        }
      } catch {
        // Fallback if example not found
      }
      // Default fallback
      return 10;
    }, [countryCode]);
    
    // Extract only digits from value, removing country code if present
    const extractDigits = React.useCallback((fullNumber: string, currentCallingCode: string): string => {
      if (!fullNumber) return "";
      
      // Remove all non-digit characters first
      const digitsOnly = fullNumber.replace(/\D/g, "");
      
      // If the number starts with the calling code (without +), remove it
      const callingCodeDigits = currentCallingCode.replace(/\D/g, "");
      if (digitsOnly.startsWith(callingCodeDigits)) {
        return digitsOnly.slice(callingCodeDigits.length);
      }
      
      // Handle case where number might have country code without + (e.g., "919876543210")
      // Check if it's longer than expected and starts with country code
      if (digitsOnly.length > exactLength && digitsOnly.startsWith(callingCodeDigits)) {
        return digitsOnly.slice(callingCodeDigits.length);
      }
      
      return digitsOnly;
    }, [exactLength]);

    // Local state for input value (digits only, without country code)
    const [localValue, setLocalValue] = React.useState(() => extractDigits(value, callingCode));
    
    // Track previous country to detect changes
    const prevCountryRef = React.useRef(country);
    
    // Only clear when country actually changes
    React.useEffect(() => {
      if (prevCountryRef.current !== country) {
        setLocalValue("");
        onChange?.("");
        prevCountryRef.current = country;
      }
    }, [country, onChange]);

    // Sync with external value changes (but not during typing)
    const isTypingRef = React.useRef(false);
    React.useEffect(() => {
      if (!isTypingRef.current) {
        const digits = extractDigits(value, callingCode);
        // Always update if the extracted digits are different
        if (digits !== localValue) {
          setLocalValue(digits);
        }
      }
      // Reset typing flag after a delay
      const timer = setTimeout(() => {
        isTypingRef.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }, [value, extractDigits, localValue, callingCode]);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      isTypingRef.current = true;
      
      const inputValue = e.target.value;
      const cleanedValue = inputValue.replace(/\D/g, "");
      
      // Enforce max length
      if (cleanedValue.length > exactLength) {
        isTypingRef.current = false;
        return;
      }
      
      // Update local state immediately
      setLocalValue(cleanedValue);
      
      // Combine with calling code and notify parent
      const fullNumber = cleanedValue ? `${callingCode}${cleanedValue}` : "";
      onChange?.(fullNumber);
      
      // Reset typing flag after a short delay
      setTimeout(() => {
        isTypingRef.current = false;
      }, 100);
    };

    // Validate phone number - must be exact length
    const isValidLength = React.useMemo(() => {
      if (localValue.length === 0) return true;
      return localValue.length === exactLength;
    }, [localValue.length, exactLength]);

    return (
      <div className={cn("relative", className)} key={countryCode}>
        <div className={cn(
          "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          !isValidLength && localValue.length > 0 && "border-red-500 focus-within:ring-red-500"
        )}>
          {/* Country Flag and Code - Non-editable */}
          <div className="flex items-center gap-1.5 mr-2 select-none pointer-events-none flex-shrink-0" key={`flag-${countryCode}`}>
            <FlagComponent className="w-5 h-4 rounded-sm" />
            <span className="font-medium text-foreground">{callingCode}</span>
          </div>
          
          {/* Phone Number Input - Editable */}
          <input
            ref={ref}
            id={id}
            type="tel"
            value={localValue}
            onChange={handlePhoneChange}
            onInput={(e) => {
              // Handle browser autocomplete
              const target = e.target as HTMLInputElement;
              const inputValue = target.value;
              
              // If autocomplete fills with country code, extract digits
              if (inputValue.includes('+') || inputValue.length > exactLength) {
                const digits = extractDigits(inputValue, callingCode);
                if (digits.length <= exactLength) {
                  setLocalValue(digits);
                  onChange?.(digits ? `${callingCode}${digits}` : "");
                }
              }
            }}
            disabled={disabled}
            placeholder={`Enter ${exactLength} digit number`}
            autoComplete="tel"
            className="flex-1 bg-transparent outline-none border-none text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        
        {/* Validation message */}
        {!isValidLength && localValue.length > 0 && (
          <p className="text-xs text-red-500 mt-1">
            Phone number must be exactly {exactLength} digits
          </p>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
