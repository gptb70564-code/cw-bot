import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Star, Edit, Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { SiTelegram } from "react-icons/si";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth";
interface CwProfile {
  id: string;
  cwEmail: string;
  cwPassword: string;
  openaiKey: string;
  openaiKeyStatus?: 'valid' | 'invalid' | 'limited' | null;
  profileDescription?: string;
  isPrimary: boolean;
  auth_token?: string;
  cookie?: string;
  lastAuthAt?: string;
  authStatus: boolean;
  createdAt: string;
}

export default function Profile() {
  const { updateUser } = useAuth();
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [cwProfile, setCwProfile] = useState<CwProfile | null>(null);
  const [isSavingMain, setIsSavingMain] = useState(false);
  const [isSavingCw, setIsSavingCw] = useState(false);
  const [deletingCw, setDeletingCw] = useState(false);
  const [savingOpenaiKey, setSavingOpenaiKey] = useState(false);
  const [openaiKeyStatus, setOpenaiKeyStatus] = useState<'valid' | 'invalid' | 'limited' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const { telegramUser } = useAuth();
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingCw, setLoadingCw] = useState(true);
  const [newProfile, setNewProfile] = useState({
    cwEmail: "",
    cwPassword: "",
    openaiKey: "",
    profileDescription: "",
  });

  const [profileData, setProfileData] = useState({
    fullName: "",
    age: 0,
    birthday: "",
    telegramUsername: "",
    telegramId: "",
    email: "",
  });

  // Fetch user profile from /api/user and set it to profileData

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await apiClient.get("/api/user", { telegramId: telegramUser.id });
        if (response?.data) {
          setProfileData((prev) => ({
            ...prev,
            ...response.data,
          }));
        }
      } catch (error: any) {
        if (error.response.status === 404) {
          toast({
            title: "Error",
            description: "User not found",
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Error",
          description: "Could not fetch user profile.",
          variant: "destructive",
        });
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUserProfile();

  }, []);

  // Fetch CW profile
  useEffect(() => {
    const fetchCwProfile = async () => {
      try {
        const response = await apiClient.get("/api/cw-profiles", { telegramId: telegramUser.id });
        if (response?.data && response.data.length > 0) {
          const profile = response.data[0]; // Get the single profile
          setCwProfile(profile);
          // Populate the form with existing data
          setNewProfile({
            cwEmail: profile.cwEmail,
            cwPassword: profile.cwPassword,
            openaiKey: profile.openaiKey || "",
            profileDescription: profile.profileDescription || "",
          });
          // Set API key status
          setOpenaiKeyStatus(profile.openaiKeyStatus || null);
        }
      } catch (error: any) {
        console.error("Error fetching CW profile:", error);
      } finally {
        setLoadingCw(false);
      }
    };
    fetchCwProfile();
  }, []);



  const handleProfileUpdate = async () => {
    setIsSavingMain(true);
    try {
      const response = await apiClient.patch('/api/user', { ...profileData, telegramId: telegramUser.id });

      if (response && response.data && response.data.success) {
        // Update the user data in auth context
        updateUser(profileData);

        toast({
          title: "Success",
          description: "Profile updated successfully.",
          variant: "default",
        });
      } else if (response && response.data && response.data.error) {
        toast({
          title: "Error",
          description: `Error updating profile: ${response.data.error}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Info",
          description: "Profile update response received.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingMain(false);
    }
  };

  const handleAddCwProfile = async () => {
    // Clear previous validation errors
    setValidationErrors({});

    // Validate all required fields
    if (!validateProfile()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingCw(true);
    try {
      let response;
      if (cwProfile) {
        // Update existing profile (exclude openaiKey as it's saved separately)
        const { openaiKey, ...profileDataWithoutKey } = newProfile;
        response = await apiClient.patch("/api/cw-profiles", { ...profileDataWithoutKey, telegramId: telegramUser.id });
      } else {
        // Create new profile (exclude openaiKey as it's saved separately)
        const { openaiKey, ...profileDataWithoutKey } = newProfile;
        response = await apiClient.post("/api/cw-profiles", { ...profileDataWithoutKey, telegramId: telegramUser.id });
      }

      if (response?.data) {
        setCwProfile(response.data);
        toast({
          title: "Success",
          description: response.data.authMessage || (cwProfile ? "Profile updated successfully." : "Profile created successfully."),
          variant: "default",
        });
        // Don't clear the form after successful save
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || error.response?.data?.message || "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingCw(false);
    }
  };

  const handleSaveOpenaiKey = async () => {
    if (!newProfile.openaiKey.trim()) {
      toast({
        title: "Error",
        description: "OpenAI API key is required",
        variant: "destructive",
      });
      return;
    }

    if (!cwProfile) {
      toast({
        title: "Error",
        description: "Please create a Crowdworks profile first",
        variant: "destructive",
      });
      return;
    }

    setSavingOpenaiKey(true);
    try {
      const response = await apiClient.patch("/api/cw-profiles/save-openai-key", {
        openaiKey: newProfile.openaiKey.trim(),
        telegramId: telegramUser.id
      });

      if (response?.data) {
        // Update cwProfile with new key info
        setCwProfile({
          ...cwProfile,
          openaiKey: response.data.openaiKey || newProfile.openaiKey.trim(),
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
      setSavingOpenaiKey(false);
    }
  };

  const handleDeleteCwProfile = async () => {
    if (!cwProfile) return;

    try {
      setDeletingCw(true);
      await apiClient.delete(`/api/cw-profiles/${cwProfile.id}`, { telegramId: telegramUser.id });
      setCwProfile(null);
      // Clear the form after deletion
      setNewProfile({ cwEmail: "", cwPassword: "", openaiKey: "", profileDescription: "" });
      setOpenaiKeyStatus(null);
      toast({
        title: "Success",
        description: "Profile deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingCw(false);
    }
  };


  const toggleSensitiveData = () => {
    setShowSensitiveData(prev => !prev);
  };

  const maskSensitiveData = (data: string) => {
    return "•".repeat(8);
  };

  const validateProfile = () => {
    const errors: { [key: string]: string } = {};

    if (!newProfile.cwEmail.trim()) {
      errors.cwEmail = "Crowdworks email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newProfile.cwEmail)) {
      errors.cwEmail = "Please enter a valid email address";
    }

    if (!newProfile.cwPassword.trim()) {
      errors.cwPassword = "Crowdworks password is required";
    }

    // OpenAI key is now saved independently, so remove from validation

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearFieldError = (fieldName: string) => {
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  if (loadingUser || loadingCw) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information and Crowdworks profiles
        </p>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList>
          <TabsTrigger value="personal" data-testid="tab-personal">Personal Info</TabsTrigger>
          <TabsTrigger value="crowdworks" data-testid="tab-crowdworks">Crowdworks Profiles</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your profile details and Telegram connection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    JD
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Profile Picture</p>
                  <p className="text-sm">Synced from Telegram</p>
                  <Button variant="outline" size="sm" className="gap-2">
                    <SiTelegram className="h-4 w-4 text-[#0088cc]" />
                    Refresh from Telegram
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                    data-testid="input-full-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    data-testid="input-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={profileData.age}
                    onChange={(e) => setProfileData({ ...profileData, age: Number(e.target.value) })}
                    data-testid="input-age"
                    min={1}
                    max={120}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthday">Birthday</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={profileData.birthday}
                    onChange={(e) => setProfileData({ ...profileData, birthday: e.target.value })}
                    data-testid="input-birthday"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telegramUsername">Telegram Username</Label>
                  <Input
                    id="telegramUsername"
                    value={profileData.telegramUsername}
                    disabled
                    data-testid="input-telegram-username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telegramId">Telegram ID</Label>
                  <Input
                    id="telegramId"
                    value={profileData.telegramId}
                    disabled
                    data-testid="input-telegram-id"
                  />
                </div>
              </div>

              <Button onClick={handleProfileUpdate} data-testid="button-save-profile" disabled={isSavingMain}>
                {isSavingMain && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSavingMain ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crowdworks" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">Crowdworks Profile</h3>
            <p className="text-sm text-muted-foreground">
              Manage your Crowdworks account for automated bidding
            </p>
          </div>


          <Card>
            <CardHeader>
              <CardTitle>Crowdworks Account Information</CardTitle>
              <CardDescription>
                Configure your Crowdworks account for automated bidding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">

                <div className="space-y-2">
                  <Label htmlFor="cwEmail">Crowdworks Email *</Label>
                  <Input
                    id="cwEmail"
                    type="email"
                    placeholder="your@email.com"
                    value={newProfile.cwEmail}
                    onChange={(e) => {
                      setNewProfile({ ...newProfile, cwEmail: e.target.value });
                      clearFieldError('cwEmail');
                    }}
                    data-testid="input-cw-email"
                    className={validationErrors.cwEmail ? "border-red-500" : ""}
                  />
                  {validationErrors.cwEmail && (
                    <p className="text-sm text-red-500">{validationErrors.cwEmail}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cwPassword">Crowdworks Password *</Label>
                  <div className="relative">
                    <Input
                      id="cwPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={newProfile.cwPassword}
                      onChange={(e) => {
                        setNewProfile({ ...newProfile, cwPassword: e.target.value });
                        clearFieldError('cwPassword');
                      }}
                      data-testid="input-cw-password"
                      className={`pr-10 ${validationErrors.cwPassword ? "border-red-500" : ""}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-auto p-1.5 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {validationErrors.cwPassword && (
                    <p className="text-sm text-red-500">{validationErrors.cwPassword}</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="openaiKey">OpenAI API Key</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="openaiKey"
                        type={showOpenaiKey ? "text" : "password"}
                        placeholder="sk-..."
                        value={newProfile.openaiKey}
                        onChange={(e) => {
                          setNewProfile({ ...newProfile, openaiKey: e.target.value });
                          clearFieldError('openaiKey');
                          // Clear status when user starts typing
                          if (openaiKeyStatus && newProfile.openaiKey !== e.target.value) {
                            setOpenaiKeyStatus(null);
                          }
                        }}
                        data-testid="input-openai-key"
                        className={`pr-10 ${openaiKeyStatus === 'invalid' || openaiKeyStatus === 'limited' ? "border-red-500" : openaiKeyStatus === 'valid' ? "border-green-500" : ""}`}
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
                      type="button"
                      size="sm"
                      onClick={handleSaveOpenaiKey}
                      disabled={savingOpenaiKey || !newProfile.openaiKey.trim() || !cwProfile}
                    >
                      {savingOpenaiKey ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        cwProfile?.openaiKey ? "Update Key" : "Save Key"
                      )}
                    </Button>
                  </div>
                  {validationErrors.openaiKey && (
                    <p className="text-sm text-red-500">{validationErrors.openaiKey}</p>
                  )}
                  {openaiKeyStatus === 'valid' && (
                    <p className="text-sm text-green-600">✓ API key is valid</p>
                  )}
                  {openaiKeyStatus === 'invalid' && (
                    <p className="text-sm text-red-500">✗ API key is invalid. Please check your API key.</p>
                  )}
                  {openaiKeyStatus === 'limited' && (
                    <p className="text-sm text-orange-600">⚠ API key has reached the rate limit. Please try again later.</p>
                  )}
                  {!validationErrors.openaiKey && !openaiKeyStatus && (
                    <p className="text-xs text-muted-foreground">
                      Your OpenAI API key is required for automated bid generation. Save your Crowdworks profile first to enable this field.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profileDescription">Profile Description</Label>
                <Textarea
                  id="profileDescription"
                  placeholder="Describe your skills, experience, and what you can offer to clients..."
                  value={newProfile.profileDescription}
                  onChange={(e) => setNewProfile({ ...newProfile, profileDescription: e.target.value })}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs">
                  CW registration may take some time for Validation.
                </p>
              </div>

              {/* Authentication Status */}
              {cwProfile && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Authentication Status:</span>
                    <div className="flex items-center gap-1">
                      {cwProfile.authStatus ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm ${cwProfile.authStatus ? 'text-green-600' : 'text-red-600'}`}>
                        {cwProfile.authStatus ? 'Authenticated' : 'Authentication Failed'}
                      </span>
                    </div>
                  </div>

                  {cwProfile.lastAuthAt && (
                    <div className="text-sm text-muted-foreground">
                      Last Authentication: {new Date(cwProfile.lastAuthAt).toLocaleString()}
                    </div>
                  )}

                  {/* Sensitive Data Section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Password:</span>
                      <span className="text-sm font-mono">
                        {showSensitiveData ? cwProfile.cwPassword : maskSensitiveData(cwProfile.cwPassword)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={toggleSensitiveData}
                      >
                        {showSensitiveData ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                    </div>

                    {cwProfile.openaiKey && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">OpenAI Key:</span>
                        <span className="text-sm font-mono">
                          {showSensitiveData ? cwProfile.openaiKey : maskSensitiveData(cwProfile.openaiKey)}
                        </span>
                      </div>
                    )}

                    {cwProfile.auth_token && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Auth Token:</span>
                        <span className="text-sm font-mono">
                          {showSensitiveData ? cwProfile.auth_token : maskSensitiveData(cwProfile.auth_token)}
                        </span>
                      </div>
                    )}

                    {cwProfile.cookie && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Cookie:</span>
                        <span className="text-sm font-mono">
                          {showSensitiveData ? cwProfile.cookie : maskSensitiveData(cwProfile.cookie)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleAddCwProfile} data-testid="button-save-profile" disabled={isSavingCw}>
                  {isSavingCw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSavingCw ? (cwProfile ? 'Updating...' : 'Saving...') : (cwProfile ? 'Update Profile' : 'Save Profile')}
                </Button>
                {cwProfile && (
                  <Button
                    variant="outline"
                    onClick={handleDeleteCwProfile}
                    data-testid="button-delete-profile"
                    disabled={deletingCw || isSavingCw}
                  >
                    {deletingCw ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                        Delete Profile
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
