"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Country, State, City } from "country-state-city";
import { MapPin } from "lucide-react";
import { useAuthContext } from "@/components/providers/auth-provider";

export interface CountryStateCityValue {
  country: string;
  state: string;
  city: string;
}

export interface CountryStateCitySelectProps {
  value: CountryStateCityValue;
  onChange: (value: CountryStateCityValue) => void;
  disabled?: boolean;
  required?: boolean;
  showLabels?: boolean;
  countryDisabled?: boolean;
  countryLabel?: string;
  stateLabel?: string;
  cityLabel?: string;
  className?: string;
}

export const CountryStateCitySelect = React.forwardRef<
  HTMLDivElement,
  CountryStateCitySelectProps
>(
  (
    {
      value,
      onChange,
      disabled = false,
      required = false,
      showLabels = true,
      countryDisabled = false,
      countryLabel = "Country",
      stateLabel = "State",
      cityLabel = "City",
      className = "",
    },
    ref
  ) => {
    const { user } = useAuthContext();
    const [systemDefaultCountry, setSystemDefaultCountry] = React.useState<string>('');
    
    // Fetch system default country (admin's country)
    React.useEffect(() => {
      const fetchSystemSettings = async () => {
        try {
          const { getSystemSettings } = await import('@/services/systemSettingsService');
          const settings = await getSystemSettings();
          setSystemDefaultCountry(settings.defaultCountry);
        } catch (error) {
          console.error('Error fetching system settings:', error);
        }
      };

      fetchSystemSettings();
    }, []);
    
    // Memoize countries - immediate load
    const countries = React.useMemo(() => Country.getAllCountries(), []);

    // Derived state for country code - calculated from props if possible, otherwise internal state
    const [internalCountryCode, setInternalCountryCode] = React.useState<string>("");
    
    // Calculate the effective country code (from props or internal state)
    // We prioritize the prop 'value.country' if it exists
    const selectedCountryCode = React.useMemo(() => {
        if (value.country) {
             const found = countries.find(c => c.name.trim().toLowerCase() === value.country.trim().toLowerCase());
             if (found) return found.isoCode;
        }
        return internalCountryCode;
    }, [value.country, countries, internalCountryCode]);

    // Memoize states based on selected country
    const states = React.useMemo(() => {
        if (!selectedCountryCode) return [];
        return State.getStatesOfCountry(selectedCountryCode);
    }, [selectedCountryCode]);

    // Derived state for state code
    const [internalStateCode, setInternalStateCode] = React.useState<string>("");

    // Calculate effective state code
    const selectedStateCode = React.useMemo(() => {
        if (value.state) {
            const found = states.find(s => s.name.trim().toLowerCase() === value.state.trim().toLowerCase());
            if (found) return found.isoCode;
        }
        return internalStateCode;
    }, [value.state, states, internalStateCode]);

    // Memoize cities based on selected state
    const cities = React.useMemo(() => {
        if (!selectedCountryCode || !selectedStateCode) return [];
        return City.getCitiesOfState(selectedCountryCode, selectedStateCode);
    }, [selectedCountryCode, selectedStateCode]);

    // Auto-fill logic (simpler now)
    const hasAutoFilledRef = React.useRef(false);
    
    React.useEffect(() => {
        if (
            !hasAutoFilledRef.current &&
            !value.country &&
            countries.length > 0 &&
            (user?.country || systemDefaultCountry)
        ) {
            const countryToUse = user?.country || systemDefaultCountry;
            const foundCountry = countries.find(
                (c) => c.name.trim().toLowerCase() === countryToUse.trim().toLowerCase()
            );
            
            if (foundCountry) {
                console.log('Auto-filling country:', foundCountry.name);
                hasAutoFilledRef.current = true;
                // We don't set internal state here, we rely on parent onChange
                onChange({
                    country: foundCountry.name,
                    state: "",
                    city: "",
                });
            }
        }
    }, [user?.country, systemDefaultCountry, countries, value.country, onChange]);

    // Handlers
    const handleCountryChange = (countryCode: string) => {
      setInternalCountryCode(countryCode); // Optimistic update
      setInternalStateCode(""); 
      
      const country = countries.find((c) => c.isoCode === countryCode);
      onChange({
        country: country?.name || "",
        state: "",
        city: "",
      });
    };

    const handleStateChange = (stateCode: string) => {
      setInternalStateCode(stateCode); // Optimistic update
      const state = states.find((s) => s.isoCode === stateCode);
      onChange({
        ...value,
        state: state?.name || "",
        city: "",
      });
    };

    const handleCityChange = (cityName: string) => {
      onChange({
        ...value,
        city: cityName,
      });
    };

    return (
      <div ref={ref} className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
        {/* Country */}
        <div className="space-y-2">
          {showLabels && (
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {countryLabel}
              {required && <span className="text-destructive">*</span>}
            </Label>
          )}
          <Select
            value={selectedCountryCode}
            onValueChange={handleCountryChange}
            disabled={disabled || countryDisabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.isoCode} value={country.isoCode}>
                  {country.flag} {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* State */}
        <div className="space-y-2">
          {showLabels && (
            <Label>
              {stateLabel}
              {required && <span className="text-destructive">*</span>}
            </Label>
          )}
          <Select
            value={selectedStateCode}
            onValueChange={handleStateChange}
            disabled={disabled || !selectedCountryCode}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  selectedCountryCode ? "Select state" : "Select country first"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {states.length > 0 ? (
                states.map((state) => (
                  <SelectItem key={state.isoCode} value={state.isoCode}>
                    {state.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-states" disabled>
                  No states available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {value.state && (
            <p className="text-xs text-muted-foreground">
              ✓ Selected: {value.state}
            </p>
          )}
        </div>

        {/* City */}
        <div className="space-y-2">
          {showLabels && (
            <Label>
              {cityLabel}
              {required && <span className="text-destructive">*</span>}
            </Label>
          )}
          {cities.length > 0 ? (
            <Select
              value={value.city}
              onValueChange={handleCityChange}
              disabled={disabled || !selectedStateCode}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    selectedStateCode ? "Select city" : "Select state first"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.name} value={city.name}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={value.city}
              onChange={(e) => handleCityChange(e.target.value)}
              placeholder="Enter city manually"
              disabled={disabled}
            />
          )}
        </div>
      </div>
    );
  }
);

CountryStateCitySelect.displayName = "CountryStateCitySelect";
