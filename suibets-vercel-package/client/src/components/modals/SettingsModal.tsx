import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { SettingsModalProps } from "@/types";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
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
    saveSettings 
  } = useSettings();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">GENERAL SETTINGS</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <Label className="text-gray-500 text-sm">LANGUAGE</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-[180px]">
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
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="spanish">Spanish</SelectItem>
                    <SelectItem value="french">French</SelectItem>
                    <SelectItem value="german">German</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-gray-500 text-sm">ODDS FORMAT</Label>
              <Select value={oddsFormat} onValueChange={setOddsFormat}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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

          <div className="flex items-center justify-between py-3">
            <span>Estimated amount in fiat</span>
            <Switch
              checked={showFiatAmount}
              onCheckedChange={setShowFiatAmount}
            />
          </div>

          <div className="space-y-3">
            <div className="text-gray-500 text-sm">EMAIL</div>
            <div className="flex items-center justify-between bg-white border border-gray-300 rounded-md px-3 py-2 mb-3">
              <span>suibetsui@gmail.com</span>
              <Button variant="link" className="text-primary text-sm h-auto p-0">
                Change
              </Button>
            </div>

            <div className="flex items-center mb-4">
              <Checkbox
                id="newsletter"
                checked={receiveNewsletter}
                onCheckedChange={(checked) => setReceiveNewsletter(!!checked)}
              />
              <Label htmlFor="newsletter" className="ml-2 text-sm text-gray-700">
                Receive newsletter updates
              </Label>
            </div>

            <div className="text-gray-500 text-sm mb-1">NOTIFICATIONS:</div>
            <div className="flex items-center justify-between py-3">
              <span>On-Site</span>
              <Switch
                checked={onSiteNotifications}
                onCheckedChange={setOnSiteNotifications}
              />
            </div>
          </div>

          <div>
            <div className="text-gray-500 text-sm mb-1">SELF-EXCLUSION</div>
            <div className="bg-gray-100 rounded-md p-4">
              <p className="text-sm text-gray-600 mb-3">
                To start the automated self exclusion process, please click the button below
              </p>
              <Button>Request Self-Exclusion</Button>
            </div>
          </div>
          
          {/* Save button */}
          <div className="flex justify-end pt-4">
            <Button 
              onClick={() => {
                saveSettings();
                toast({
                  title: "Settings Saved",
                  description: "Your preferences have been updated successfully.",
                });
                onClose();
              }}
              className="bg-[#00FFFF] hover:bg-[#00FFFF]/90 text-black"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
