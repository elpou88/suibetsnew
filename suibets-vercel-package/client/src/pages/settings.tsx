import { useLocation } from "wouter";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Save, Check, RefreshCw, Palette } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { 
    language, 
    setLanguage, 
    oddsFormat, 
    setOddsFormat, 
    showFiatAmount, 
    setShowFiatAmount, 
    onSiteNotifications, 
    setOnSiteNotifications, 
    receiveNewsletter, 
    setReceiveNewsletter,
    darkMode,
    setDarkMode,
    accentColor,
    setAccentColor,
    gasSettings,
    setGasSettings,
    saveSettings,
    applyTheme
  } = useSettings();

  const handleSaveSettings = () => {
    saveSettings();
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully.",
      variant: "default",
    });
  };

  return (
    <Layout>
      <div className="w-full min-h-screen flex flex-col bg-[#112225] text-white p-4 md:p-8">
        {/* Header with back button */}
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => window.history.back()}
            className="mr-4 text-white hover:bg-[#1e3a3f]"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold text-[#00FFFF]">Settings</h1>
        </div>

        <Tabs defaultValue="general" className="w-full max-w-4xl mx-auto">
          <TabsList className="grid grid-cols-3 mb-8 bg-[#0b1618] border-[#1e3a3f]">
            <TabsTrigger 
              value="general" 
              className="data-[state=active]:bg-[#1e3a3f] data-[state=active]:text-[#00FFFF]"
            >
              General
            </TabsTrigger>
            <TabsTrigger 
              value="preferences" 
              className="data-[state=active]:bg-[#1e3a3f] data-[state=active]:text-[#00FFFF]"
            >
              Preferences
            </TabsTrigger>
            <TabsTrigger 
              value="blockchain" 
              className="data-[state=active]:bg-[#1e3a3f] data-[state=active]:text-[#00FFFF]"
            >
              Blockchain
            </TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general">
            <div className="grid gap-6">
              <Card className="bg-[#1e3a3f] border-[#2a4a54]">
                <CardHeader>
                  <CardTitle>Interface Settings</CardTitle>
                  <CardDescription className="text-gray-300">
                    Customize how the interface appears and behaves
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-start gap-6 flex-wrap">
                    <div className="space-y-1">
                      <Label className="text-gray-300 text-sm">LANGUAGE</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="w-[180px] bg-[#112225]">
                          <div className="flex items-center">
                            <svg className="h-4 w-6 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30">
                              <clipPath id="a"><path d="M0 0v30h60V0z"/></clipPath>
                              <clipPath id="b"><path d="M30 15h30v15zv15H0zH0V0zV0h30z"/></clipPath>
                              <g clipPath="url(#a)">
                                <path d="M0 0v30h60V0z" fill="#012169"/>
                                <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6"/>
                                <path d="M0 0l60 30m0-30L0 30" clipPath="url(#b)" stroke="#C8102E" strokeWidth="4"/>
                                <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10"/>
                                <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6"/>
                              </g>
                            </svg>
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-[#112225] border-[#1e3a3f]">
                          <SelectGroup>
                            <SelectItem value="english">English</SelectItem>
                            <SelectItem value="spanish">Spanish</SelectItem>
                            <SelectItem value="french">French</SelectItem>
                            <SelectItem value="german">German</SelectItem>
                            <SelectItem value="italian">Italian</SelectItem>
                            <SelectItem value="portuguese">Portuguese</SelectItem>
                            <SelectItem value="russian">Russian</SelectItem>
                            <SelectItem value="chinese">Chinese</SelectItem>
                            <SelectItem value="japanese">Japanese</SelectItem>
                            <SelectItem value="korean">Korean</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-gray-300 text-sm">ODDS FORMAT</Label>
                      <Select value={oddsFormat} onValueChange={setOddsFormat}>
                        <SelectTrigger className="w-[180px] bg-[#112225]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#112225] border-[#1e3a3f]">
                          <SelectGroup>
                            <SelectItem value="decimal">Decimal</SelectItem>
                            <SelectItem value="fractional">Fractional</SelectItem>
                            <SelectItem value="american">American</SelectItem>
                            <SelectItem value="hongkong">Hong Kong</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3 border-t border-[#2a4a54]">
                    <span>Dark Mode</span>
                    <Switch
                      checked={darkMode}
                      onCheckedChange={setDarkMode}
                    />
                  </div>


                </CardContent>
              </Card>

              <Card className="bg-[#1e3a3f] border-[#2a4a54]">
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription className="text-gray-300">
                    Configure how you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <span>On-Site Notifications</span>
                    <Switch
                      checked={onSiteNotifications}
                      onCheckedChange={setOnSiteNotifications}
                    />
                  </div>

                  <div className="flex items-center py-2 border-t border-[#2a4a54]">
                    <Checkbox
                      id="newsletter"
                      checked={receiveNewsletter}
                      onCheckedChange={(checked) => setReceiveNewsletter(!!checked)}
                      className="border-gray-400"
                    />
                    <Label htmlFor="newsletter" className="ml-2 text-sm text-gray-300">
                      Receive newsletter updates
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <div className="grid gap-6">
              <Card className="bg-[#1e3a3f] border-[#2a4a54]">
                <CardHeader>
                  <CardTitle>Display Preferences</CardTitle>
                  <CardDescription className="text-gray-300">
                    Customize how information is displayed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between py-3">
                    <span>Show Estimated Amount in Fiat</span>
                    <Switch
                      checked={showFiatAmount}
                      onCheckedChange={setShowFiatAmount}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1e3a3f] border-[#2a4a54]">
                <CardHeader>
                  <CardTitle>Account</CardTitle>
                  <CardDescription className="text-gray-300">
                    Manage your account information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="text-gray-300 text-sm">EMAIL</div>
                    <div className="flex items-center justify-between bg-[#112225] border border-[#2a4a54] rounded-md px-3 py-2 mb-3">
                      <span>suibetsui@gmail.com</span>
                      <Button variant="link" className="text-[#00FFFF] text-sm h-auto p-0">
                        Change
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1e3a3f] border-[#2a4a54]">
                <CardHeader>
                  <CardTitle>Self-Exclusion</CardTitle>
                  <CardDescription className="text-gray-300">
                    Take a break or self-exclude from betting
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-300 mb-3">
                    To start the automated self exclusion process, please click the button below
                  </p>
                  <Button variant="outline" className="border-[#00FFFF] text-[#00FFFF]">
                    Request Self-Exclusion
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Blockchain Tab */}
          <TabsContent value="blockchain">
            <div className="grid gap-6">
              <Card className="bg-[#1e3a3f] border-[#2a4a54]">
                <CardHeader>
                  <CardTitle>Transaction Settings</CardTitle>
                  <CardDescription className="text-gray-300">
                    Customize blockchain transaction parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">GAS PRICE SETTINGS</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button 
                        onClick={() => setGasSettings('low')}
                        variant={gasSettings === 'low' ? 'default' : 'outline'}
                        className={gasSettings === 'low' 
                          ? "bg-[#00FFFF] text-black hover:bg-[#00FFFF]/90" 
                          : "border-[#00FFFF] text-[#00FFFF] hover:bg-[#00FFFF]/20"}
                      >
                        Low
                        {gasSettings === 'low' && <Check className="h-4 w-4 ml-2" />}
                      </Button>
                      <Button 
                        onClick={() => setGasSettings('medium')}
                        variant={gasSettings === 'medium' ? 'default' : 'outline'}
                        className={gasSettings === 'medium' 
                          ? "bg-[#00FFFF] text-black hover:bg-[#00FFFF]/90" 
                          : "border-[#00FFFF] text-[#00FFFF] hover:bg-[#00FFFF]/20"}
                      >
                        Medium
                        {gasSettings === 'medium' && <Check className="h-4 w-4 ml-2" />}
                      </Button>
                      <Button 
                        onClick={() => setGasSettings('high')}
                        variant={gasSettings === 'high' ? 'default' : 'outline'}
                        className={gasSettings === 'high' 
                          ? "bg-[#00FFFF] text-black hover:bg-[#00FFFF]/90" 
                          : "border-[#00FFFF] text-[#00FFFF] hover:bg-[#00FFFF]/20"}
                      >
                        High
                        {gasSettings === 'high' && <Check className="h-4 w-4 ml-2" />}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {gasSettings === 'low' && 'Lower gas price means cheaper transactions but may take longer to confirm'}
                      {gasSettings === 'medium' && 'Balanced gas price for reasonable transaction speed and cost'}
                      {gasSettings === 'high' && 'Higher gas price for faster confirmations but more expensive transactions'}
                    </p>
                  </div>

                  <div className="py-3 border-t border-[#2a4a54]">
                    <Button 
                      className="w-full bg-[#112225] hover:bg-[#1e3a3f] text-[#00FFFF] border border-[#2a4a54]"
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Clear Transaction Cache
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Save button */}
        <div className="flex justify-end mt-8 max-w-4xl mx-auto w-full">
          <Button 
            onClick={handleSaveSettings}
            className="bg-[#00FFFF] hover:bg-[#00FFFF]/90 text-black"
          >
            <Save className="h-4 w-4 mr-2" />
            Save All Settings
          </Button>
        </div>
      </div>
    </Layout>
  );
}