"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Loader2 } from "lucide-react";
import { Country } from "country-state-city";

// Helper function to validate postal code
const validatePostalCode = async (postcode: string, countryCode: string): Promise<boolean> => {
  try {
    // Dynamic import for postcode-validator
    const validatorModule = await import('postcode-validator');
    
    // The module exports postcodeValidator function
    if (typeof validatorModule.postcodeValidator === 'function') {
      return validatorModule.postcodeValidator(postcode, countryCode);
    }
    
    // Fallback: accept all formats if structure is unexpected
    return true;
  } catch {
    // If module not available or doesn't support country, accept all formats
    return true;
  }
};

export interface ZipCodeInputProps {
  country?: string;
  state?: string;
  city?: string;
  value?: string;
  onChange?: (value: string, details?: PostOfficeDetails) => void;
  onLocationSelect?: (location: { city?: string; state?: string; district?: string }) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
}

// Cache for country lookups
const countryCache = new Map<string, string>();

interface PostOfficeDetails {
  Name: string;
  Description: string | null;
  BranchType: string;
  DeliveryStatus: string;
  Circle: string;
  District: string;
  Division: string;
  Region: string;
  Block: string;
  State: string;
  Country: string;
  Pincode: string;
}

interface IndianPostalAPIResponse {
  Message: string;
  Status: string;
  PostOffice: PostOfficeDetails[] | null;
}

interface ZippopotamPlace {
  'place name': string;
  'state': string;
  'state abbreviation': string;
  'latitude': string;
  'longitude': string;
}

interface ZippopotamResponse {
  'post code': string;
  'country': string;
  'country abbreviation': string;
  places: ZippopotamPlace[];
}

const ZipCodeInput = React.forwardRef<HTMLInputElement, ZipCodeInputProps>(
  ({ className, country = "", state, city, value = "", onChange, onLocationSelect, disabled, id, placeholder }, ref) => {
    const [localValue, setLocalValue] = React.useState(value);
    const [suggestions, setSuggestions] = React.useState<PostOfficeDetails[]>([]);
    const [internationalSuggestions, setInternationalSuggestions] = React.useState<Array<{ postalCode: string; placeName: string; state: string }>>([]);
    const [open, setOpen] = React.useState(false);
    const [validationError, setValidationError] = React.useState<string>("");
    const [isLoading, setIsLoading] = React.useState(false);

    // Get country ISO code from country name using country-state-city - memoized
    const countryCode = React.useMemo(() => {
      if (!country) return "IN";
      
      // Check cache first
      if (countryCache.has(country)) {
        return countryCache.get(country)!;
      }
      
      const allCountries = Country.getAllCountries();
      const foundCountry = allCountries.find(
        (c) => c.name.trim().toLowerCase() === country.trim().toLowerCase()
      );
      
      const isoCode = foundCountry?.isoCode || "IN";
      countryCache.set(country, isoCode);
      return isoCode;
    }, [country]);

    const isIndia = countryCode === "IN";

    // Track previous country to detect changes
    const prevCountryRef = React.useRef(country);
    
    // Clear value when country changes
    React.useEffect(() => {
      if (prevCountryRef.current !== country) {
        setLocalValue("");
        onChange?.("");
        setValidationError("");
        setSuggestions([]);
        setInternationalSuggestions([]);
        setOpen(false);
        prevCountryRef.current = country;
      }
    }, [country, onChange]);

    // Update local value when external value changes
    React.useEffect(() => {
      setLocalValue(value);
    }, [value]);

    // Fetch Indian pincode details from official API
    const fetchIndianPincodeDetails = React.useCallback(async (pincode: string): Promise<PostOfficeDetails[]> => {
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const data: IndianPostalAPIResponse[] = await response.json();
        
        if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice) {
          return data[0].PostOffice;
        }
        return [];
      } catch (error) {
        console.error("Error fetching pincode details:", error);
        return [];
      }
    }, []);

    // Fetch international postal codes using Zippopotam.us API
    const fetchInternationalPostalCodes = React.useCallback(async (partialCode: string): Promise<Array<{ postalCode: string; placeName: string; state: string }>> => {
      try {
        const results: Array<{ postalCode: string; placeName: string; state: string }> = [];
        
        console.log(`Fetching postal code for ${countryCode}: ${partialCode}`);
        
        // For Swedish postal codes (format: NNN NN), try generating possible codes
        if (countryCode === 'SE' && partialCode.length >= 3) {
          const cleanCode = partialCode.replace(/\s/g, '');
          
          // If user typed 3-4 digits, try common endings
          if (cleanCode.length === 3 || cleanCode.length === 4) {
            const commonEndings = ['00', '01', '20', '22', '30', '32', '35', '40', '41', '52', '91'];
            const promises = commonEndings.map(async (ending) => {
              const testCode = cleanCode.padEnd(5, ending.charAt(0));
              const formattedCode = `${testCode.slice(0, 3)} ${testCode.slice(3, 5)}`;
              
              try {
                const response = await fetch(`https://api.zippopotam.us/${countryCode}/${formattedCode}`);
                if (response.ok) {
                  const data: ZippopotamResponse = await response.json();
                  if (data && data.places) {
                    return data.places.map((place: ZippopotamPlace) => ({
                      postalCode: data['post code'],
                      placeName: place['place name'],
                      state: place['state'],
                    }));
                  }
                }
              } catch {
                // Ignore
              }
              return [];
            });
            
            const allResults = await Promise.all(promises);
            allResults.flat().forEach(result => {
              if (!results.find(r => r.postalCode === result.postalCode)) {
                results.push(result);
              }
            });
          }
          
          // If user typed 5 digits, format with space and try
          if (cleanCode.length === 5) {
            const formattedCode = `${cleanCode.slice(0, 3)} ${cleanCode.slice(3, 5)}`;
            try {
              const response = await fetch(`https://api.zippopotam.us/${countryCode}/${formattedCode}`);
              if (response.ok) {
                const data: ZippopotamResponse = await response.json();
                if (data && data.places) {
                  data.places.forEach((place: ZippopotamPlace) => {
                    if (!results.find(r => r.postalCode === data['post code'])) {
                      results.push({
                        postalCode: data['post code'],
                        placeName: place['place name'],
                        state: place['state'],
                      });
                    }
                  });
                }
              }
            } catch {
              // Ignore
            }
          }
        } else {
          // For other countries, try the entered code as-is
          try {
            const url = `https://api.zippopotam.us/${countryCode}/${partialCode}`;
            console.log(`Fetching from: ${url}`);
            
            const response = await fetch(url);
            console.log(`Response status: ${response.status}`);
            
            if (response.ok) {
              const data: ZippopotamResponse = await response.json();
              console.log('API Response:', data);
              
              if (data && data.places) {
                data.places.forEach((place: ZippopotamPlace) => {
                  results.push({
                    postalCode: data['post code'],
                    placeName: place['place name'],
                    state: place['state'],
                  });
                });
                console.log('Results found:', results);
              }
            } else {
              console.log(`API returned ${response.status} - postal code may not exist in database`);
            }
          } catch (error) {
            console.error(`Error fetching postal code for ${countryCode}:`, error);
          }
        }
        
        return results;
      } catch (error) {
        console.error("Error fetching international postal codes:", error);
        return [];
      }
    }, [countryCode]);

    // Search pincodes by partial input (for 4-5 digits)
    const searchPartialPincode = React.useCallback(async (partialPincode: string): Promise<PostOfficeDetails[]> => {
      try {
        // Try to fetch multiple possible pincodes
        const promises: Promise<PostOfficeDetails[]>[] = [];
        
        // Generate possible pincodes (e.g., if user types "6251", try 625100-625199)
        const baseNumber = parseInt(partialPincode);
        const multiplier = Math.pow(10, 6 - partialPincode.length);
        
        // Try first 5 possible pincodes to avoid too many API calls
        for (let i = 0; i < 5; i++) {
          const testPincode = (baseNumber * multiplier + i * (multiplier / 10)).toString().padStart(6, '0');
          promises.push(fetchIndianPincodeDetails(testPincode));
        }
        
        const results = await Promise.all(promises);
        const allResults = results.flat();
        
        // Remove duplicates and filter by state/city if provided
        const uniqueResults = allResults.reduce((acc: PostOfficeDetails[], current) => {
          const exists = acc.find(item => item.Pincode === current.Pincode && item.Name === current.Name);
          if (!exists) {
            acc.push(current);
          }
          return acc;
        }, []);
        
        return uniqueResults;
      } catch (error) {
        console.error("Error searching partial pincode:", error);
        return [];
      }
    }, [fetchIndianPincodeDetails]);

    // Debounce timer ref
    const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clean input - for India only digits, for others allow alphanumeric
    const cleanInput = React.useCallback((input: string): string => {
      if (isIndia) {
        // India: only digits
        return input.replace(/\D/g, "");
      }
      // Other countries: allow alphanumeric, spaces, and hyphens
      return input.replace(/[^a-zA-Z0-9\s-]/g, "").toUpperCase();
    }, [isIndia]);

    // Handle input change
    const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Clean input based on country
      const cleanedValue = cleanInput(inputValue);
      
      // For India, enforce 6 digit max; for others, allow up to 10 characters
      const maxLength = isIndia ? 6 : 10;
      if (cleanedValue.length > maxLength) {
        return;
      }
      
      setLocalValue(cleanedValue);
      setValidationError("");

      // For India, fetch suggestions when typing (4+ digits)
      if (isIndia && cleanedValue.length >= 4) {
        // Clear previous debounce timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        setIsLoading(true);

        // Debounce API call
        debounceTimerRef.current = setTimeout(async () => {
          let results: PostOfficeDetails[] = [];
          
          if (cleanedValue.length === 6) {
            // Full pincode - fetch exact match
            results = await fetchIndianPincodeDetails(cleanedValue);
          } else if (cleanedValue.length >= 4) {
            // Partial pincode - search for matches
            results = await searchPartialPincode(cleanedValue);
          }
          
          // Filter by state and city if provided
          let filteredResults = results;
          if (state) {
            filteredResults = filteredResults.filter(
              (item) => item.State.toLowerCase() === state.toLowerCase()
            );
          }
          if (city) {
            filteredResults = filteredResults.filter(
              (item) => item.District.toLowerCase().includes(city.toLowerCase())
            );
          }

          setSuggestions(filteredResults);
          setOpen(filteredResults.length > 0);
          setIsLoading(false);

          // If results found, auto-select location from first result
          if (filteredResults.length > 0) {
            const details = filteredResults[0];
            onLocationSelect?.({
              city: details.District,
              state: details.State,
              district: details.District,
            });
          }
        }, 400);
      } else if (isIndia && cleanedValue.length === 0) {
        setSuggestions([]);
        setOpen(false);
        setIsLoading(false);
      } else if (isIndia && cleanedValue.length < 4) {
        // Less than 4 digits - just show helper text
        setSuggestions([]);
        setOpen(false);
        setIsLoading(false);
      }

      // Real-time search for non-Indian countries (when length >= 4 for most countries, 5 for some)
      if (!isIndia && cleanedValue.length >= 4) {
        // Clear previous debounce timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        setIsLoading(true);

        // Debounce API call for international postal codes
        debounceTimerRef.current = setTimeout(async () => {
          // Try to fetch from API (may not be available for all countries)
          const results = await fetchInternationalPostalCodes(cleanedValue);
          
          console.log('Fetched results:', results);
          console.log('Results length:', results.length);
          
          // Filter by state if provided
          let filteredResults = results;
          if (state) {
            filteredResults = filteredResults.filter(
              (item) => item.state.toLowerCase().includes(state.toLowerCase())
            );
            console.log('Filtered results:', filteredResults);
          }
          
          console.log('Setting international suggestions:', filteredResults);
          setInternationalSuggestions(filteredResults);
          console.log('Setting open to:', filteredResults.length > 0);
          setOpen(filteredResults.length > 0);
          console.log('Open state should now be:', filteredResults.length > 0);
          setIsLoading(false);

          // If results found, auto-select location from first result
          if (filteredResults.length > 0) {
            const details = filteredResults[0];
            console.log('Auto-selecting location:', details);
            onLocationSelect?.({
              city: details.placeName,
              state: details.state,
            });
            setValidationError("");
          } else {
            // No results from API (country may not be supported)
            // Just validate format using postcode-validator
            console.log(`No API results for ${countryCode}, validating format only`);
            try {
              const isValid = await validatePostalCode(cleanedValue, countryCode);
              if (!isValid) {
                setValidationError(`Invalid postal code format for ${country}`);
              } else {
                setValidationError("");
              }
            } catch {
              // If validation library doesn't support this country, accept any format
              console.log(`Postcode validator doesn't support ${countryCode}, accepting input`);
              setValidationError("");
            }
          }
        }, 600);
      } else if (!isIndia && cleanedValue.length === 0) {
        setInternationalSuggestions([]);
        setOpen(false);
        setIsLoading(false);
      }

      onChange?.(cleanedValue);
    };

    // Handle suggestion selection
    const handleSelectSuggestion = (suggestion: PostOfficeDetails) => {
      setLocalValue(suggestion.Pincode);
      setOpen(false);
      setSuggestions([]);
      setInternationalSuggestions([]);
      setValidationError("");
      
      onChange?.(suggestion.Pincode, suggestion);
      
      // Notify parent about location details
      onLocationSelect?.({
        city: suggestion.District,
        state: suggestion.State,
        district: suggestion.District,
      });
    };

    // Handle international suggestion selection
    const handleSelectInternationalSuggestion = (suggestion: { postalCode: string; placeName: string; state: string }) => {
      setLocalValue(suggestion.postalCode);
      setOpen(false);
      setSuggestions([]);
      setInternationalSuggestions([]);
      setValidationError("");
      
      onChange?.(suggestion.postalCode);
      
      // Notify parent about location details
      onLocationSelect?.({
        city: suggestion.placeName,
        state: suggestion.state,
      });
    };

    // Validate on blur
    const handleBlur = async () => {
      if (!localValue) {
        setValidationError("");
        return;
      }

      if (isIndia) {
        // Validate Indian pincode (6 digits)
        if (localValue.length !== 6 || !/^\d{6}$/.test(localValue)) {
          setValidationError("Indian pincode must be 6 digits");
        } else {
          setIsLoading(true);
          const details = await fetchIndianPincodeDetails(localValue);
          setIsLoading(false);
          
          if (details.length === 0) {
            setValidationError("Invalid pincode");
          } else {
            setValidationError("");
            // Auto-fill location if available
            const firstOffice = details[0];
            onLocationSelect?.({
              city: firstOffice.District,
              state: firstOffice.State,
              district: firstOffice.District,
            });
          }
        }
      } else {
        // Validate international postal code using postcode-validator
        if (localValue.length < 3) {
          setValidationError("Postal code is too short");
          return;
        }

        try {
          const isValid = await validatePostalCode(localValue, countryCode);
          if (!isValid) {
            setValidationError(`Invalid postal code format for ${country}`);
          } else {
            setValidationError("");
          }
        } catch {
          // If validation library doesn't support this country, just clear error
          setValidationError("");
        }
      }
    };

    return (
      <div className={cn("relative", className)}>
        <Popover open={open} onOpenChange={setOpen} modal={false}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                ref={ref}
                id={id}
                type="text"
                value={localValue}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onFocus={() => {
                  // Keep dropdown open if there are suggestions
                  console.log('Input focused. Suggestions:', suggestions.length, 'International:', internationalSuggestions.length);
                  if (suggestions.length > 0 || internationalSuggestions.length > 0) {
                    console.log('Reopening dropdown on focus');
                    setOpen(true);
                  }
                }}
                disabled={disabled}
                placeholder={placeholder || (isIndia ? "Enter 6-digit pincode" : `Enter postal code for ${country}`)}
                maxLength={isIndia ? 6 : 10}
                className={cn(
                  validationError && "border-red-500 focus-visible:ring-red-500"
                )}
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </PopoverTrigger>
          {(suggestions.length > 0 || internationalSuggestions.length > 0) && (
            <PopoverContent 
              className="w-[400px] p-0" 
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onInteractOutside={(e) => {
                // Don't close when clicking on the input
                const target = e.target as HTMLElement;
                if (target.closest('input')) {
                  e.preventDefault();
                }
              }}
            >
              <Command>
                <CommandList 
                  className="max-h-[300px] overflow-y-scroll [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-red-500 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-red-600"
                  style={{ scrollBehavior: 'smooth' }}
                  onWheel={(e) => {
                    e.preventDefault();
                    const element = e.currentTarget;
                    const scrollAmount = (e as any).deltaY * 1.5; // 1.5x faster scrolling
                    element.scrollTop += scrollAmount;
                  }}
                >
                  <CommandEmpty>No postal codes found.</CommandEmpty>
                  <CommandGroup>
                    {/* Indian suggestions */}
                    {suggestions.map((suggestion, index) => (
                      <CommandItem
                        key={`${suggestion.Pincode}-${suggestion.Name}-${index}`}
                        value={suggestion.Name}
                        onSelect={() => handleSelectSuggestion(suggestion)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            localValue === suggestion.Pincode ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{suggestion.Name}</span>
                          <span className="text-xs text-muted-foreground">
                            {suggestion.District}, {suggestion.State} - {suggestion.Pincode}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {suggestion.BranchType} • {suggestion.DeliveryStatus}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                    
                    {/* International suggestions */}
                    {internationalSuggestions.map((suggestion, index) => (
                      <CommandItem
                        key={`${suggestion.postalCode}-${suggestion.placeName}-${index}`}
                        value={suggestion.placeName}
                        onSelect={() => handleSelectInternationalSuggestion(suggestion)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            localValue === suggestion.postalCode ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{suggestion.placeName}</span>
                          <span className="text-xs text-muted-foreground">
                            {suggestion.state} - {suggestion.postalCode}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          )}
        </Popover>
        
        {/* Validation message */}
        {validationError && (
          <p className="text-xs text-red-500 mt-1">
            {validationError}
          </p>
        )}
        
        {/* Helper text */}
        {!validationError && (
          <p className="text-xs text-muted-foreground mt-1">
            {isIndia ? (
              localValue.length === 0 ? (
                city && state 
                  ? `Enter pincode for ${city}, ${state}` 
                  : state 
                  ? `Enter pincode for ${state}`
                  : "Enter at least 4 digits to search"
              ) : localValue.length < 4 ? (
                `Enter ${4 - localValue.length} more digit${4 - localValue.length > 1 ? 's' : ''} to search`
              ) : isLoading ? (
                "Searching pincodes..."
              ) : localValue.length < 6 ? (
                `${6 - localValue.length} more digit${6 - localValue.length > 1 ? 's' : ''} for exact match`
              ) : null
            ) : (
              localValue.length === 0 ? (
                city && state 
                  ? `Enter postal code for ${city}, ${state}` 
                  : state 
                  ? `Enter postal code for ${state}`
                  : `Enter postal code for ${country}`
              ) : localValue.length < 4 ? (
                `${4 - localValue.length} more character${4 - localValue.length > 1 ? 's' : ''} to search`
              ) : isLoading ? (
                "Searching postal codes..."
              ) : internationalSuggestions.length > 0 ? (
                `${internationalSuggestions.length} location${internationalSuggestions.length > 1 ? 's' : ''} found`
              ) : null
            )}
          </p>
        )}
      </div>
    );
  }
);

ZipCodeInput.displayName = "ZipCodeInput";

export { ZipCodeInput };
