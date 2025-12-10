import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Clock, Calendar, DollarSign, Play, Pause, Save, Eye, EyeOff } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface AutoBidSchedule {
  id?: string;
  userId: string;
  isActive: boolean;
  daysOfWeek: string[];
  timeRangeStart?: string;
  timeRangeEnd?: string;
  startDate?: string;
  endDate?: string;
  // Project type/category
  projectType?: string;
  // Fixed budget settings
  fixedBudgetLevel: 'low' | 'medium' | 'high' | 'custom';
  fixedBudgetMin?: number;
  fixedBudgetMax?: number;
  // Hourly budget settings
  hourlyBudgetLevel: 'low' | 'medium' | 'high' | 'custom';
  hourlyBudgetMin?: number;
  hourlyBudgetMax?: number;
  // Client budget preferences
  clientBudgetPreference: 'low' | 'high';
  // Preferred hourly budget when no budget range in client post
  preferredHourlyBudget: number;
  // Preferred roles (max 2)
  preferredRoles?: string[];
  createdAt?: string;
  updatedAt?: string;
}

const FIXED_BUDGET_PRESETS = {
  low: { min: 10000, max: 50000 },
  medium: { min: 50000, max: 200000 },
  high: { min: 200000, max: 1000000 }
} as const;

const HOURLY_BUDGET_PRESETS = {
  low: { min: 1000, max: 2000 },
  medium: { min: 2000, max: 3000 },
  high: { min: 3000, max: 7000 }
} as const;

export default function Schedule() {
  const [schedule, setSchedule] = useState<AutoBidSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cwProfile, setCwProfile] = useState<any>(null);
  const [openaiKey, setOpenaiKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [openaiKeyStatus, setOpenaiKeyStatus] = useState<'valid' | 'invalid' | 'limited' | null>(null);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const { telegramUser } = useAuth();
  // Form state
  const [isActive, setIsActive] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [timeStart, setTimeStart] = useState("09:00");
  const [timeEnd, setTimeEnd] = useState("18:00");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // Project Type (used as left-hand category selection for role list)
  const categories = [
    { label: "Default (All Bids)", value: "default" },
    { label: "System Development", value: "system-development" },
    { label: "AI & Machine Learning", value: "ai-machine-learning" },
    { label: "App & Smartphone", value: "app-smartphone" },
    { label: "HP & Web Design", value: "hp-web-design" },
    { label: "EC Building", value: "ec-building" },
  ];
  const roleOptions: Record<string, { label: string; value: string }[]> = {
    default: [{ label: "General Bid Template", value: "general-bid-template" }],
    "system-development": [
      { label: "Site Construction and Web Development", value: "2" },
      { label: "Business systems and software", value: "83" },
      { label: "Server/Network Construction", value: "8" },
      { label: "Database design and construction", value: "12" },
      { label: "Excel VBA/Macro Development", value: "13" },
      { label: "Scraping/Data Collection", value: "282" },
      { label: "Web Programming", value: "173" },
      { label: "Project management and requirements definition", value: "1" },
      { label: "Programming instructor/mentor", value: "284" },
      { label: "Others (system development)", value: "78" },
      { label: "AWS construction and WAF implementation", value: "342" },
      { label: "Stock, FX, and virtual currency tool development", value: "343" },
      { label: "Customer management/CRM system development", value: "344" },
      { label: "Salesforce/SFA system development", value: "345" },
      { label: "Ordering system development", value: "346" },
      { label: "Reservation system development", value: "347" },
      { label: "Attendance management system development", value: "348" },
      { label: "Responsive website creation", value: "349" },
      { label: "Metaverse Development", value: "355" },
      { label: "System management, updates, and maintenance", value: "25" },
      { label: "Testing, Verification, and Debugging", value: "51" },
      { label: "Website updates and maintenance", value: "177" },
      { label: "Data Cleansing", value: "104" },
      { label: "Security measures", value: "179" },
      { label: "Quality assessment", value: "178" },
      { label: "Windows Application Development", value: "9" },
      { label: "Mac Application Development", value: "10" },
    ],
    "ai-machine-learning": [
      { label: "Machine Learning and Deep Learning", value: "364" },
      { label: "ChatGPT Development", value: "365" },
      { label: "AI/Chatbot Development", value: "283" },
      { label: "AI annotation", value: "366" },
    ],
    "app-smartphone": [
      { label: "iPhone/iPad app development", value: "3" },
      { label: "Android App Development", value: "4" },
      { label: "Smartphone app development and website construction", value: "82" },
      { label: "Social Game Development", value: "6" },
      { label: "Android Game Development", value: "174" },
      { label: "iPhone/iPad game development", value: "175" },
      { label: "Mobile app development", value: "81" },
    ],
    "hp-web-design": [
      { label: "Homepage creation", value: "14" },
      { label: "Web Design", value: "15" },
      { label: "WordPress production and installation", value: "20" },
      { label: "Landing page (LP) production", value: "17" },
      { label: "HTML and CSS coding", value: "16" },
      { label: "Website corrections, updates, and feature additions", value: "285" },
      { label: "Icon, button and header production", value: "286" },
      { label: "CMS implementation", value: "7" },
      { label: "Mobile site/smartphone site production", value: "87" },
      { label: "UI/UX Design", value: "77" },
      { label: "Interaction Design", value: "112" },
      { label: "Owned media production", value: "304" },
    ],
    "ec-building": [
      { label: "EC site production", value: "84" },
      { label: "E-commerce website design", value: "137" },
      { label: "EC site operation tool development", value: "315" },
      { label: "Product description creation", value: "316" },
      { label: "E-commerce consulting", value: "317" },
    ]
  };
  const [projectType, setProjectType] = useState<string>("default");
  const [preferredRoles, setPreferredRoles] = useState<string[]>([]);

  // Helpers for bulk selection
  const getAllRoleValues = () => Object.values(roleOptions).flat().map((r) => r.value);
  const getCurrentRoleValues = () => (roleOptions[projectType] || []).map((r) => r.value);
  // Fixed budget state
  const [fixedBudgetLevel, setFixedBudgetLevel] = useState<'low' | 'medium' | 'high' | 'custom'>('low');
  const [fixedBudgetMin, setFixedBudgetMin] = useState("50000");
  const [fixedBudgetMax, setFixedBudgetMax] = useState("200000");
  // Hourly budget state
  const [hourlyBudgetLevel, setHourlyBudgetLevel] = useState<'low' | 'medium' | 'high' | 'custom'>('low');
  const [hourlyBudgetMin, setHourlyBudgetMin] = useState("1000");
  const [hourlyBudgetMax, setHourlyBudgetMax] = useState("3000");
  // Client budget state
  const [clientBudgetPreference, setClientBudgetPreference] = useState<'low' | 'high'>('low');
  const [preferredHourlyBudget, setPreferredHourlyBudget] = useState("2000");
  const [hoursLimit, setHoursLimit] = useState("35");

  // Load schedule and CW profile on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch schedule
        const scheduleResponse = await apiClient.get("/api/auto-bid-schedule", { telegramId: telegramUser.id });
            if (scheduleResponse?.data?.success) {
          setSchedule(scheduleResponse.data);
          // Populate form with existing data
          setIsActive(scheduleResponse.data.schedule.isActive);
          setSelectedDays(scheduleResponse.data.schedule.daysOfWeek || []);
          setTimeStart(scheduleResponse.data.schedule.timeRangeStart || "09:00");
          setTimeEnd(scheduleResponse.data.schedule.timeRangeEnd || "18:00");
          setStartDate(scheduleResponse.data.schedule.startDate || "");
          setEndDate(scheduleResponse.data.schedule.endDate || "");
          setProjectType(scheduleResponse.data.schedule.projectType || "default");
          setPreferredRoles(scheduleResponse.data.schedule.preferredRoles || []);
          // Fixed budget
          setFixedBudgetLevel(scheduleResponse.data.schedule.fixedBudgetLevel || "low");
          setFixedBudgetMin(scheduleResponse.data.schedule.fixedBudgetMin?.toString() || "");
          setFixedBudgetMax(scheduleResponse.data.schedule.fixedBudgetMax?.toString() || "");
          // Hourly budget
          setHourlyBudgetLevel(scheduleResponse.data.schedule.hourlyBudgetLevel || "low");
          setHourlyBudgetMin(scheduleResponse.data.schedule.hourlyBudgetMin?.toString() || "");
          setHourlyBudgetMax(scheduleResponse.data.schedule.hourlyBudgetMax?.toString() || "");
          // Client budget
          setClientBudgetPreference(scheduleResponse.data.schedule.clientBudgetPreference || "low");
          setPreferredHourlyBudget(scheduleResponse.data.schedule.preferredHourlyBudget?.toString() || "2000");
          setHoursLimit(scheduleResponse.data.schedule.hoursLimit?.toString() || "35");
        }

        console.log(schedule, 'schedule');

        // Fetch OpenAI key status
        try {
          const keyResponse = await apiClient.get("/api/cw-profiles/get-openai-key", { telegramId: telegramUser.id });
          if (keyResponse?.data) {
            setCwProfile({ openaiKey: keyResponse.data.openaiKey, authStatus: keyResponse.data.authStatus });
            setOpenaiKey(keyResponse.data.openaiKey || "");
            setOpenaiKeyStatus(keyResponse.data.openaiKeyStatus || null);
          }
        } catch (keyError: any) {
          console.error("Error fetching OpenAI key:", keyError);
        }
      } catch (error: any) {
        return toast({
          title: "Error",
          description: error.response?.data?.message || "Failed to load schedule",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleFixedBudgetLevelChange = (level: 'low' | 'medium' | 'high' | 'custom') => {
    setFixedBudgetLevel(level);

    // Set default values for fixed budget
    switch (level) {
      case "low":
        setFixedBudgetMin("10000");
        setFixedBudgetMax("50000");
        break;
      case "medium":
        setFixedBudgetMin("50000");
        setFixedBudgetMax("200000");
        break;
      case "high":
        setFixedBudgetMin("200000");
        setFixedBudgetMax("1000000");
        break;
      case "custom":
        setFixedBudgetMin("");
        setFixedBudgetMax("");
        break;
    }
  };

  const handleHourlyBudgetLevelChange = (level: 'low' | 'medium' | 'high' | 'custom') => {
    setHourlyBudgetLevel(level);

    // Set default values for hourly budget
    switch (level) {
      case "low":
        setHourlyBudgetMin("1000");
        setHourlyBudgetMax("2000");
        break;
      case "medium":
        setHourlyBudgetMin("2000");
        setHourlyBudgetMax("3000");
        break;
      case "high":
        setHourlyBudgetMin("3000");
        setHourlyBudgetMax("7000");
        break;
      case "custom":
        setHourlyBudgetMin("");
        setHourlyBudgetMax("");
        break;
    }
  };

  const handleSave = async () => {

    setSaving(true);

    // Validation
    if (selectedDays.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one day",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    // If trying to activate schedule, check for OpenAI key and its validity
    // If invalid, save as inactive instead of preventing save
    let finalIsActive = isActive;
    if (isActive) {
      if (!cwProfile || !cwProfile.openaiKey || !cwProfile.openaiKey.trim()) {
        finalIsActive = false;
        toast({
          title: "Warning",
          description: "Schedule saved as inactive. Please save your OpenAI API key before activating the schedule",
          variant: "default",
        });
      } else if (openaiKeyStatus !== 'valid') {
        finalIsActive = false;
        if (openaiKeyStatus === 'invalid') {
          toast({
            title: "Warning",
            description: "Schedule saved as inactive. Your OpenAI API key is invalid. Please update it before activating the schedule",
            variant: "default",
          });
        } else if (openaiKeyStatus === 'limited') {
          toast({
            title: "Warning",
            description: "Schedule saved as inactive. Your OpenAI API key has reached the rate limit. Please try again later",
            variant: "default",
          });
        } else {
          toast({
            title: "Warning",
            description: "Schedule saved as inactive. Please validate your OpenAI API key before activating the schedule",
            variant: "default",
          });
        }
      }
    }

    // No limit on preferred roles

    if (fixedBudgetLevel === "custom" && (!fixedBudgetMin || !fixedBudgetMax)) {
      toast({
        title: "Error",
        description: "Please enter both minimum and maximum fixed budget for custom level",
        variant: "destructive",
      });
      return;
    }

    if (fixedBudgetLevel === "custom" && parseInt(fixedBudgetMin) >= parseInt(fixedBudgetMax)) {
      toast({
        title: "Error",
        description: "Minimum fixed budget must be less than maximum fixed budget",
        variant: "destructive",
      });
      return;
    }

    if (hourlyBudgetLevel === "custom" && (!hourlyBudgetMin || !hourlyBudgetMax)) {
      toast({
        title: "Error",
        description: "Please enter both minimum and maximum hourly budget for custom level",
        variant: "destructive",
      });
      return;
    }

    if (hourlyBudgetLevel === "custom" && parseInt(hourlyBudgetMin) >= parseInt(hourlyBudgetMax)) {
      toast({
        title: "Error",
        description: "Minimum hourly budget must be less than maximum hourly budget",
        variant: "destructive",
      });
      return;
    }

    // Set min/max by level if not custom
    let sendFixedBudgetMin: number | undefined;
    let sendFixedBudgetMax: number | undefined;
    if (fixedBudgetLevel === 'custom') {
      sendFixedBudgetMin = fixedBudgetMin ? parseInt(fixedBudgetMin) : undefined;
      sendFixedBudgetMax = fixedBudgetMax ? parseInt(fixedBudgetMax) : undefined;
    } else {
      sendFixedBudgetMin = FIXED_BUDGET_PRESETS[fixedBudgetLevel].min;
      sendFixedBudgetMax = FIXED_BUDGET_PRESETS[fixedBudgetLevel].max;
    }

    let sendHourlyBudgetMin: number | undefined;
    let sendHourlyBudgetMax: number | undefined;
    if (hourlyBudgetLevel === 'custom') {
      sendHourlyBudgetMin = hourlyBudgetMin ? parseInt(hourlyBudgetMin) : undefined;
      sendHourlyBudgetMax = hourlyBudgetMax ? parseInt(hourlyBudgetMax) : undefined;
    } else {
      sendHourlyBudgetMin = HOURLY_BUDGET_PRESETS[hourlyBudgetLevel].min;
      sendHourlyBudgetMax = HOURLY_BUDGET_PRESETS[hourlyBudgetLevel].max;
    }

    try {
      const scheduleData = {
        isActive: finalIsActive,
        daysOfWeek: selectedDays,
        timeRangeStart: timeStart,
        timeRangeEnd: timeEnd,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        projectType,
        preferredRoles,
        // Fixed budget
        fixedBudgetLevel,
        fixedBudgetMin: sendFixedBudgetMin,
        fixedBudgetMax: sendFixedBudgetMax,
        // Hourly budget
        hourlyBudgetLevel,
        hourlyBudgetMin: sendHourlyBudgetMin,
        hourlyBudgetMax: sendHourlyBudgetMax,
        // Client budget
        clientBudgetPreference,
        preferredHourlyBudget: parseInt(preferredHourlyBudget),
        hoursLimit: parseInt(hoursLimit),
      };

      const response = await apiClient.post("/api/auto-bid-schedule", { ...scheduleData, telegramId: telegramUser.id });
      setSchedule(response);

      // Update isActive state if it was forced to inactive due to invalid API key
      if (finalIsActive !== isActive) {
        setIsActive(false);
      }

      toast({
        title: "Success",
        description: "Schedule saved successfully",
      });
    } catch (error: any) {
      console.error("Error saving schedule:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save schedule",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setIsActive(false);
    setSelectedDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
    setTimeStart("09:00");
    setTimeEnd("18:00");
    setStartDate("");
    setEndDate("");
    // Fixed budget
    setFixedBudgetLevel("low");
    setFixedBudgetMin("");
    setFixedBudgetMax("");
    // Hourly budget
    setHourlyBudgetLevel("low");
    setHourlyBudgetMin("");
    setHourlyBudgetMax("");
    // Client budget
    setClientBudgetPreference("low");
    setPreferredHourlyBudget("2000");
  };

  const handleSaveOpenaiKey = async () => {
    if (!openaiKey.trim()) {
      toast({
        title: "Error",
        description: "OpenAI API key is required",
        variant: "destructive",
      });
      return;
    }

    setSavingKey(true);
    try {
      const response = await apiClient.patch("/api/cw-profiles/save-openai-key", {
        openaiKey: openaiKey.trim(),
        telegramId: telegramUser.id
      });

      if (response?.data) {
        setCwProfile({
          openaiKey: response.data.openaiKey || openaiKey.trim(),
          authStatus: response.data.authStatus
        });
        // Update API key status if present in response
        if (response.data.openaiKeyStatus !== undefined) {
          setOpenaiKeyStatus(response.data.openaiKeyStatus);
        } else {
          setOpenaiKeyStatus('valid'); // If saved successfully, assume valid
        }
        toast({
          title: "Success",
          description: "OpenAI API key saved successfully",
        });
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast({
          title: "Error",
          description: "Please create a Crowdworks profile first",
          variant: "destructive",
        });
      } else if (error.response?.data?.openaiKeyStatus === 'invalid') {
        setOpenaiKeyStatus('invalid');
        toast({
          title: "Invalid API Key",
          description: "The OpenAI API key is invalid. Please check your API key and try again.",
          variant: "destructive",
        });
      } else if (error.response?.data?.openaiKeyStatus === 'limited') {
        setOpenaiKeyStatus('limited');
        toast({
          title: "API Key Limited",
          description: "The OpenAI API key has reached the rate limit. Please try again later.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.error || "Failed to save OpenAI key",
          variant: "destructive",
        });
      }
    } finally {
      setSavingKey(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Auto-Bid Schedule</h1>
          <p className="text-muted-foreground">
            Configure when and how your automated bidding should run
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={isActive ? "default" : "secondary"} className="px-3 py-1">
            {isActive ? "Active" : "Inactive"}
          </Badge>
          <Button
            variant={isActive ? "destructive" : "default"}
            className="gap-2"
            onClick={() => {
              if (!isActive) {
                // Check if API key exists
                if (!cwProfile || !cwProfile.openaiKey || !cwProfile.openaiKey.trim()) {
                  toast({
                    title: "Error",
                    description: "Please save your OpenAI API key before activating the schedule",
                    variant: "destructive",
                  });
                  return;
                }
                // Check if API key is valid (not invalid or limited)
                if (openaiKeyStatus !== 'valid') {
                  if (openaiKeyStatus === 'invalid') {
                    toast({
                      title: "Error",
                      description: "Your OpenAI API key is invalid. Please update it before activating the schedule",
                      variant: "destructive",
                    });
                  } else if (openaiKeyStatus === 'limited') {
                    toast({
                      title: "Error",
                      description: "Your OpenAI API key has reached the rate limit. Please try again later",
                      variant: "destructive",
                    });
                  } else {
                    toast({
                      title: "Error",
                      description: "Please validate your OpenAI API key before activating the schedule",
                      variant: "destructive",
                    });
                  }
                  return;
                }
              }
              setIsActive(!isActive);
            }}
            data-testid="button-toggle-schedule"
            disabled={!cwProfile || !cwProfile.openaiKey || !cwProfile.openaiKey.trim() || openaiKeyStatus !== 'valid'}
          >
            {isActive ? (
              <>
                <Pause className="h-4 w-4" />
                Pause Schedule
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Activate Schedule
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="mt-3 flex items-center gap-3">
          <Badge variant={cwProfile?.openaiKey && cwProfile.openaiKey.trim() ? "default" : "destructive"}>
            OpenAI API Key: {cwProfile?.openaiKey && cwProfile.openaiKey.trim() ? "✓ Saved" : "✗ Not Saved"}
          </Badge>
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type={showOpenaiKey ? "text" : "password"}
                  placeholder="sk-..."
                  value={openaiKey}
                  onChange={(e) => {
                    setOpenaiKey(e.target.value);
                    // Clear status when user starts typing
                    if (openaiKeyStatus) {
                      setOpenaiKeyStatus(null);
                    }
                  }}
                  className={`w-full pr-10 ${openaiKeyStatus === 'invalid' || openaiKeyStatus === 'limited' ? 'border-red-500' : openaiKeyStatus === 'valid' ? 'border-green-500' : ''}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-auto p-1.5 hover:bg-transparent"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                >
                  {showOpenaiKey ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <Button
                size="sm"
                onClick={handleSaveOpenaiKey}
                disabled={savingKey || !openaiKey.trim()}
              >
                {savingKey ? "Saving..." : cwProfile?.openaiKey ? "Update Key" : "Save Key"}
              </Button>
            </div>
            {openaiKeyStatus === 'valid' && (
              <p className="text-sm text-green-600">✓ API key is valid</p>
            )}
            {openaiKeyStatus === 'invalid' && (
              <p className="text-sm text-red-500">✗ API key is invalid. Please check your API key.</p>
            )}
            {openaiKeyStatus === 'limited' && (
              <p className="text-sm text-orange-600">⚠ API key has reached the rate limit. Please try again later.</p>
            )}
            {!openaiKeyStatus && (
              <p className="text-xs text-muted-foreground">
                Enter your OpenAI API key to enable automated bid generation
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Time Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>Time Settings</CardTitle>
            </div>
            <CardDescription>When should auto-bidding be active?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Active Days</Label>
              <div className="grid grid-cols-2 gap-2">
                {daysOfWeek.map((day) => (
                  <Button
                    key={day}
                    variant={selectedDays.includes(day) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDay(day)}
                    data-testid={`button-day-${day.toLowerCase()}`}
                  >
                    {day.substring(0, 3)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timeStart">Start Time</Label>
                <Input
                  id="timeStart"
                  type="time"
                  value={timeStart}
                  onChange={(e) => setTimeStart(e.target.value)}
                  data-testid="input-time-start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeEnd">End Time</Label>
                <Input
                  id="timeEnd"
                  type="time"
                  value={timeEnd}
                  onChange={(e) => setTimeEnd(e.target.value)}
                  data-testid="input-time-end"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date (Optional)</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-start-date"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to start immediately
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-end-date"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for no end date
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <CardTitle>Budget Settings</CardTitle>
            </div>
            <CardDescription>Define your bidding budget preferences in JPY (both fixed and hourly)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Fixed Budget Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-semibold">Fixed Budget (Total Project Cost)</h4>
              </div>

              <div className="space-y-2">
                <Label>Fixed Budget Level</Label>
                <Select value={fixedBudgetLevel} onValueChange={handleFixedBudgetLevelChange}>
                  <SelectTrigger data-testid="select-fixed-budget-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Budget (10,000 - 50,000 JPY)</SelectItem>
                    <SelectItem value="medium">Medium Budget (50,000 - 200,000 JPY)</SelectItem>
                    <SelectItem value="high">High Budget (200,000 - 1,000,000 JPY)</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {fixedBudgetLevel === "custom" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fixedBudgetMin">Minimum Fixed Budget (JPY)</Label>
                    <Input
                      id="fixedBudgetMin"
                      type="number"
                      value={fixedBudgetMin}
                      onChange={(e) => setFixedBudgetMin(e.target.value)}
                      data-testid="input-fixed-budget-min"
                      placeholder="10000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fixedBudgetMax">Maximum Fixed Budget (JPY)</Label>
                    <Input
                      id="fixedBudgetMax"
                      type="number"
                      value={fixedBudgetMax}
                      onChange={(e) => setFixedBudgetMax(e.target.value)}
                      data-testid="input-fixed-budget-max"
                      placeholder="50000"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Hourly Budget Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-semibold">Hourly Rate</h4>
              </div>

              <div className="space-y-2">
                <Label>Hourly Budget Level</Label>
                <Select value={hourlyBudgetLevel} onValueChange={handleHourlyBudgetLevelChange}>
                  <SelectTrigger data-testid="select-hourly-budget-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Rate (1,000 - 2,000 JPY/hour)</SelectItem>
                    <SelectItem value="medium">Medium Rate (2,000 - 3,000 JPY/hour)</SelectItem>
                    <SelectItem value="high">High Rate (3,000 - 7,000 JPY/hour)</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hourlyBudgetLevel === "custom" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hourlyBudgetMin">Minimum Hourly Rate (JPY/hour)</Label>
                    <Input
                      id="hourlyBudgetMin"
                      type="number"
                      value={hourlyBudgetMin}
                      onChange={(e) => setHourlyBudgetMin(e.target.value)}
                      data-testid="input-hourly-budget-min"
                      placeholder="1000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourlyBudgetMax">Maximum Hourly Rate (JPY/hour)</Label>
                    <Input
                      id="hourlyBudgetMax"
                      type="number"
                      value={hourlyBudgetMax}
                      onChange={(e) => setHourlyBudgetMax(e.target.value)}
                      data-testid="input-hourly-budget-max"
                      placeholder="2000"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Client Budget Preference */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-semibold">Client Budget Preference</h4>
              </div>

              <div className="space-y-2">
                <Label>Client Budget Preference</Label>
                <Select value={clientBudgetPreference} onValueChange={(value: 'low' | 'high') => setClientBudgetPreference(value)}>
                  <SelectTrigger data-testid="select-client-budget">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Budget Projects Only</SelectItem>
                    <SelectItem value="high">High Budget Projects Only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose whether to bid on low or high budget projects from client posts
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredHourlyBudget">Preferred Hourly Budget (JPY/hour)</Label>
                <Input
                  id="preferredHourlyBudget"
                  type="number"
                  value={preferredHourlyBudget}
                  onChange={(e) => setPreferredHourlyBudget(e.target.value)}
                  data-testid="input-preferred-hourly-budget"
                  placeholder="2000"
                />
                <p className="text-xs text-muted-foreground">
                  Hourly rate to use when client post doesn't specify budget range
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hoursLimit">Hours Limit (hours/week)</Label>
                <Input
                  id="hoursLimit"
                  type="number"
                  value={hoursLimit}
                  onChange={(e) => setHoursLimit(e.target.value)}
                  data-testid="input-hours-limit"
                  placeholder="35"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum hours per week to include when bidding hourly jobs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Targeting Settings */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Selector (left) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Categories</CardTitle>
            </div>
            <CardDescription>Browse categories to pick roles from any list</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              {categories.map((c) => (
                <Button
                  key={c.value}
                  variant={projectType === c.value ? "default" : "outline"}
                  onClick={() => setProjectType(c.value)}
                  className="justify-start"
                >
                  {c.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Preferred Roles (right) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Preferred Job Roles</CardTitle>
            </div>
            <CardDescription>Select any roles; you can choose across categories</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreferredRoles(getAllRoleValues())}
              >
                Select All (All Categories)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreferredRoles(Array.from(new Set([...preferredRoles, ...getCurrentRoleValues()])))}
              >
                Select All (Current Category)
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPreferredRoles([])}
              >
                Clear
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {(roleOptions[projectType] || []).map((role) => {
                const checked = preferredRoles.includes(role.value);
                return (
                  <label key={role.value} className="flex items-center gap-2 rounded border p-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const isGeneralDefault = projectType === 'default' && role.value === 'general-bid-template';
                        if (e.target.checked) {
                          if (isGeneralDefault) {
                            // Selecting the general template on Default selects all roles across all categories
                            setPreferredRoles(getAllRoleValues());
                          } else {
                            setPreferredRoles(Array.from(new Set([...preferredRoles, role.value])));
                          }
                        } else {
                          if (isGeneralDefault) {
                            // Unselecting the general template on Default clears all
                            setPreferredRoles([]);
                          } else {
                            setPreferredRoles(preferredRoles.filter((r) => r !== role.value));
                          }
                        }
                      }}
                    />
                    <span className="text-sm">{role.label}</span>
                  </label>
                );
              })}
            </div>
            {preferredRoles.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Selected: {preferredRoles.length}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Schedule Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle>Schedule Preview</CardTitle>
          </div>
          <CardDescription>Your current auto-bidding configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active Days</p>
                <p className="text-sm font-medium">
                  {selectedDays.length === 7
                    ? "Every Day"
                    : selectedDays.length === 0
                      ? "No days selected"
                      : selectedDays.map((d) => d.substring(0, 3)).join(", ")}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active Hours</p>
                <p className="text-sm font-medium">
                  {timeStart} - {timeEnd}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Date Range</p>
                <p className="text-sm font-medium">
                  {startDate && endDate
                    ? `${startDate} - ${endDate}`
                    : startDate
                      ? `From ${startDate}`
                      : endDate
                        ? `Until ${endDate}`
                        : "No date limit"
                  }
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Fixed Budget</p>
                <p className="text-sm font-medium">
                  {fixedBudgetLevel === "custom" && fixedBudgetMin && fixedBudgetMax
                    ? `${fixedBudgetMin} - ${fixedBudgetMax} JPY`
                    : fixedBudgetLevel === "low"
                      ? "10,000 - 50,000 JPY"
                      : fixedBudgetLevel === "medium"
                        ? "50,000 - 200,000 JPY"
                        : "200,000 - 1,000,000 JPY"
                  }
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Hourly Rate</p>
                <p className="text-sm font-medium">
                  {hourlyBudgetLevel === "custom" && hourlyBudgetMin && hourlyBudgetMax
                    ? `${hourlyBudgetMin} - ${hourlyBudgetMax} JPY/hour`
                    : hourlyBudgetLevel === "low"
                      ? "1,000 - 2,000 JPY/hour"
                      : hourlyBudgetLevel === "medium"
                        ? "2,000 - 3,000 JPY/hour"
                        : "3,000 - 7,000 JPY/hour"
                  }
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Client Budget</p>
                <p className="text-sm font-medium capitalize">
                  {clientBudgetPreference} budget projects
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Project Type</p>
                <p className="text-sm font-medium">
                  {categories.find(c => c.value === projectType)?.label || 'Default (All Bids)'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Preferred Roles</p>
                <p className="text-sm font-medium">
                  {preferredRoles.length === 0 ? 'None' : preferredRoles.join(', ')}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Preferred Hourly Rate</p>
                <p className="text-sm font-medium">
                  {preferredHourlyBudget} JPY/hour
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={isActive ? "default" : "secondary"}>
                  {isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                data-testid="button-save-schedule"
                className="gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Schedule
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Reset to Defaults
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
