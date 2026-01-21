"use client";

import React, { useState, useEffect } from "react";
import {
  paymentGatewayService,
  PaymentGateway,
  PaymentGatewayConfig,
} from "@/services/paymentGatewayService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface PaymentGatewayFormData {
  apiKey: string;
  secretKey: string;
  webhookSecret: string;
  isActive: boolean;
}

 export const PaymentGatewaySettings = () => {
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"razorpay" | "stripe" | "cod">(
    "razorpay"
  );

  const [razorpayConfig, setRazorpayConfig] = useState<PaymentGatewayFormData>({
    apiKey: "",
    secretKey: "",
    webhookSecret: "",
    isActive: false,
  });

  const [stripeConfig, setStripeConfig] = useState<PaymentGatewayFormData>({
    apiKey: "",
    secretKey: "",
    webhookSecret: "",
    isActive: false,
  });

  const [codConfig, setCodConfig] = useState<{ isActive: boolean }>({
    isActive: false,
  });

  useEffect(() => {
    fetchGateways();
  }, []);

  const fetchGateways = async () => {
    try {
      setLoading(true);
      const gatewayData = await paymentGatewayService.getGateways();
      setGateways(gatewayData);

      const razorpay = gatewayData.find((g) => g.name === "razorpay");
      const stripe = gatewayData.find((g) => g.name === "stripe");

      if (razorpay) {
        setRazorpayConfig((prev) => ({
          ...prev,
          isActive: razorpay.isActive,
          apiKey: razorpay.hasApiKey ? razorpay.apiKey || "" : "",
          secretKey: razorpay.hasSecretKey ? "••••••••••••••••" : "",
          webhookSecret: razorpay.hasWebhookSecret ? "••••••••••••••••" : "",
        }));
      }

      if (stripe) {
        setStripeConfig((prev) => ({
          ...prev,
          isActive: stripe.isActive,
          apiKey: stripe.hasApiKey ? stripe.apiKey || "" : "",
          secretKey: stripe.hasSecretKey ? "••••••••••••••••" : "",
          webhookSecret: stripe.hasWebhookSecret ? "••••••••••••••••" : "",
        }));
      }

      const cod = gatewayData.find((g) => g.name === "cod");
      if (cod) {
        setCodConfig((prev) => ({
          ...prev,
          isActive: cod.isActive,
        }));
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      toast.error("Failed to load payment gateways", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const validateGatewayConfig = (
    gatewayName: string,
    config: Partial<PaymentGatewayConfig>
  ): boolean => {
    // API Key validation
    if (config.apiKey && config.apiKey.includes("•")) {
      toast.error("Please enter a valid API Key", {
        description:
          "The current value appears to be masked. Please enter the actual API key.",
      });
      return false;
    }

    // API Key is required for new configurations
    if (!config.apiKey || config.apiKey.trim() === "") {
      const gateway = gateways.find((g) => g.name === gatewayName);
      if (!gateway?.hasApiKey) {
        toast.error("API Key is required", {
          description: "Please enter the API key to configure the payment gateway.",
        });
        return false;
      }
    }

    if (config.secretKey && config.secretKey.includes("•")) {
      toast.error("Please enter a valid Secret Key", {
        description:
          "The current value appears to be masked. Please enter the actual secret key.",
      });
      return false;
    }

    if (config.webhookSecret && config.webhookSecret.includes("•")) {
      toast.error("Please enter a valid Webhook Secret", {
        description:
          "The current value appears to be masked. Please enter the actual webhook secret.",
      });
      return false;
    }

    if (gatewayName === "razorpay") {
      if (config.apiKey && !config.apiKey.startsWith("rzp_")) {
        toast.error("Invalid Razorpay API Key", {
          description: 'API Key should start with "rzp_"',
        });
        return false;
      }
    } else if (gatewayName === "stripe") {
      if (config.apiKey && !config.apiKey.startsWith("pk_")) {
        toast.error("Invalid Stripe Publishable Key", {
          description: 'Publishable Key should start with "pk_"',
        });
        return false;
      }
      if (config.secretKey && config.secretKey && !config.secretKey.includes("•") && !config.secretKey.startsWith("sk_")) {
        toast.error("Invalid Stripe Secret Key", {
          description: 'Secret Key should start with "sk_"',
        });
        return false;
      }
    }

    return true;
  };

  const handleSaveGateway = async (
    gatewayName: string,
    config: Partial<PaymentGatewayConfig>
  ) => {
    try {
      setSaving(gatewayName);

      const configToSend: Partial<PaymentGatewayConfig> = { ...config };

      if (configToSend.apiKey && configToSend.apiKey.includes("•")) {
        configToSend.apiKey = undefined;
      }
      if (configToSend.secretKey && configToSend.secretKey.includes("•")) {
        configToSend.secretKey = undefined;
      }
      if (
        configToSend.webhookSecret &&
        configToSend.webhookSecret.includes("•")
      ) {
        configToSend.webhookSecret = undefined;
      }

      if (
        !configToSend.webhookSecret ||
        configToSend.webhookSecret.trim() === ""
      ) {
        configToSend.webhookSecret = undefined;
      }

      if (!validateGatewayConfig(gatewayName, configToSend)) {
        setSaving(null);
        return;
      }

      await paymentGatewayService.updateGateway(
        gatewayName,
        configToSend as PaymentGatewayConfig
      );
      toast.success(
        `${
          gatewayName.charAt(0).toUpperCase() + gatewayName.slice(1)
        } configuration saved successfully!`,
        {
          description:
            "Your payment gateway is now configured and ready to use.",
        }
      );
      await fetchGateways();
    } catch (err: unknown) {
      // Extract error message from response
      let errorMessage = "An unknown error occurred";
      
      if (err && typeof err === "object" && "response" in err) {
        const response = err as { 
          response?: { 
            data?: { message?: string; error?: string }; 
            statusText?: string 
          } 
        };
        if (response.response?.data?.message) {
          errorMessage = response.response.data.message;
        } else if (response.response?.data?.error) {
          errorMessage = response.response.data.error;
        } else if (response.response?.statusText) {
          errorMessage = response.response.statusText;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      toast.error("Configuration failed", {
        description: errorMessage,
      });
    } finally {
      setSaving(null);
    }
  };

  const handleToggleGateway = async (
    gatewayName: string,
    isActive: boolean
  ) => {
    try {
      await paymentGatewayService.toggleGateway(gatewayName, isActive);
      toast.success(
        `${gatewayName.charAt(0).toUpperCase() + gatewayName.slice(1)} ${
          isActive ? "enabled" : "disabled"
        } successfully!`,
        {
          description: isActive
            ? "Payment gateway is now active and ready to process payments"
            : "Payment gateway has been disabled",
        }
      );
      await fetchGateways();
    } catch (err: unknown) {
      // Extract error message from response
      let errorMessage = "An unknown error occurred";
      
      if (err && typeof err === "object" && "response" in err) {
        const response = err as { 
          response?: { 
            data?: { message?: string; error?: string }; 
            statusText?: string 
          } 
        };
        if (response.response?.data?.message) {
          errorMessage = response.response.data.message;
        } else if (response.response?.data?.error) {
          errorMessage = response.response.data.error;
        } else if (response.response?.statusText) {
          errorMessage = response.response.statusText;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      toast.error("Toggle failed", {
        description: errorMessage,
      });

      // Revert the toggle state
      if (gatewayName === "razorpay") {
        setRazorpayConfig((prev) => ({ ...prev, isActive: !isActive }));
      } else if (gatewayName === "stripe") {
        setStripeConfig((prev) => ({ ...prev, isActive: !isActive }));
      } else if (gatewayName === "cod") {
        setCodConfig((prev) => ({ ...prev, isActive: !isActive }));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
        <span className="ml-3 text-gray-700 dark:text-gray-300">
          Loading payment gateways...
        </span>
      </div>
    );
  }

  const currentGateway =
    activeTab === "razorpay"
      ? razorpayConfig
      : activeTab === "stripe"
      ? stripeConfig
      : { ...codConfig, apiKey: "", secretKey: "", webhookSecret: "" };
  const gatewayData = gateways.find((g) => g.name === activeTab);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Payment Gateway Settings</h2>
        <p className="text-muted-foreground">
          Configure your payment processing providers
        </p>
      </div>

      <div className="rounded-lg border">
        {/* Tab Navigation */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("razorpay")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "razorpay"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>Razorpay</span>
                {gateways.find((g) => g.name === "razorpay")?.isActive && (
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                )}
              </div>
            </button>
            {/* Stripe tab - temporarily hidden */}
            {/* <button
              onClick={() => setActiveTab("stripe")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "stripe"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>Stripe</span>
                {gateways.find((g) => g.name === "stripe")?.isActive && (
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                )}
              </div>
            </button> */}
            <button
              onClick={() => setActiveTab("cod")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "cod"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>Cash on Delivery</span>
                {gateways.find((g) => g.name === "cod")?.isActive && (
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                )}
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Gateway Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">
                {activeTab === "razorpay"
                  ? "Razorpay Configuration"
                  : activeTab === "stripe"
                  ? "Stripe Configuration"
                  : "Cash on Delivery Configuration"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {activeTab === "razorpay"
                  ? "Indian payment gateway"
                  : activeTab === "stripe"
                  ? "Global payment platform"
                  : "Accept payments on delivery"}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm">
                {currentGateway.isActive ? "Enabled" : "Disabled"}
              </span>
              <Switch
                checked={currentGateway.isActive}
                onCheckedChange={(isActive) => {
                  if (activeTab === "razorpay") {
                    setRazorpayConfig((prev) => ({ ...prev, isActive }));
                  } else if (activeTab === "stripe") {
                    setStripeConfig((prev) => ({ ...prev, isActive }));
                  } else if (activeTab === "cod") {
                    setCodConfig((prev) => ({ ...prev, isActive }));
                  }
                  handleToggleGateway(activeTab, isActive);
                }}
              />
            </div>
          </div>

          {/* Configuration Form - Only for online payment gateways */}
          {activeTab !== "cod" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveGateway(activeTab, currentGateway);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="apiKey">
                    {activeTab === "razorpay"
                      ? "API Key ID"
                      : "Publishable Key"}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <input
                    id="apiKey"
                    type="text"
                    required
                    value={currentGateway.apiKey}
                    onChange={(e) => {
                      if (activeTab === "razorpay") {
                        setRazorpayConfig((prev) => ({
                          ...prev,
                          apiKey: e.target.value,
                        }));
                      } else {
                        setStripeConfig((prev) => ({
                          ...prev,
                          apiKey: e.target.value,
                        }));
                      }
                    }}
                    placeholder={
                      activeTab === "razorpay"
                        ? "rzp_test_xxxxxxxxxx"
                        : "pk_test_xxxxxxxxxx"
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Required to enable the payment gateway
                  </p>
                </div>
                <div>
                  <Label htmlFor="secretKey">
                    Secret Key{" "}
                    <span className="text-muted-foreground text-xs">(Optional)</span>
                  </Label>
                  <input
                    id="secretKey"
                    type="password"
                    value={currentGateway.secretKey}
                    onChange={(e) => {
                      if (activeTab === "razorpay") {
                        setRazorpayConfig((prev) => ({
                          ...prev,
                          secretKey: e.target.value,
                        }));
                      } else {
                        setStripeConfig((prev) => ({
                          ...prev,
                          secretKey: e.target.value,
                        }));
                      }
                    }}
                    placeholder={
                      gatewayData?.hasSecretKey
                        ? "Enter new secret key to update"
                        : activeTab === "razorpay"
                        ? "Enter secret key (optional)"
                        : "sk_test_xxxxxxxxxx (optional)"
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional - Required only for server-side payment processing
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="webhookSecret">
                  Webhook Secret{" "}
                  <span className="text-muted-foreground text-xs">(Optional)</span>
                </Label>
                <input
                  id="webhookSecret"
                  type="password"
                  value={currentGateway.webhookSecret}
                  onChange={(e) => {
                    if (activeTab === "razorpay") {
                      setRazorpayConfig((prev) => ({
                        ...prev,
                        webhookSecret: e.target.value,
                      }));
                    } else {
                      setStripeConfig((prev) => ({
                        ...prev,
                        webhookSecret: e.target.value,
                      }));
                    }
                  }}
                  placeholder={
                    gatewayData?.hasWebhookSecret
                      ? "Enter new webhook secret to update"
                      : activeTab === "razorpay"
                      ? "Enter webhook secret (optional)"
                      : "whsec_xxxxxxxxxx (optional)"
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional - Required only for webhook verification
                </p>
              </div>

              {/* Configuration Status */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        gatewayData?.hasApiKey ? "bg-green-500" : "bg-red-500"
                      }`}
                    ></span>
                    <span className="text-sm text-muted-foreground">
                      API Key: {gatewayData?.hasApiKey ? "Set" : "Missing"} (Required)
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        gatewayData?.hasSecretKey
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    ></span>
                    <span className="text-sm text-muted-foreground">
                      Secret: {gatewayData?.hasSecretKey ? "Set" : "Not Set"} (Optional)
                    </span>
                  </div>
                </div>
                <Button type="submit" disabled={saving === activeTab}>
                  {saving === activeTab ? "Saving..." : "Save Configuration"}
                </Button>
              </div>
            </form>
          )}

          {/* COD Configuration */}
          {activeTab === "cod" && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Cash on Delivery Information
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Cash on Delivery allows customers to pay when they receive
                      their order. No additional configuration is required -
                      simply enable or disable this payment method.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2">
                  Payment Method Status
                </h4>
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      codConfig.isActive ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></span>
                  <span className="text-sm text-muted-foreground">
                    Cash on Delivery is{" "}
                    {codConfig.isActive ? "enabled" : "disabled"}
                  </span>
                </div>
                {codConfig.isActive && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    Customers can now select &quot;Cash on Delivery&quot; during checkout.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Webhook Information */}
      <div className="rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Webhook Configuration</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Configure these webhook URLs in your payment gateway dashboards:
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
            <span className="text-sm font-medium">Razorpay Webhook</span>
            <code className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
              {process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}
              /api/payment-gateway/webhook/razorpay
            </code>
          </div>
          {/* <div className="flex items-center justify-between p-3 bg-muted rounded-md">
            <span className="text-sm font-medium">Stripe Webhook</span>
            <code className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
              {process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}
              /api/payment-gateway/webhook/stripe
            </code>
          </div> */}
        </div>
      </div>
    </div>
  );
};
