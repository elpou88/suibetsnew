import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NotificationsModalProps, Notification } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function NotificationsModal({ isOpen, onClose }: NotificationsModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"unread" | "inbox">("unread");
  const queryClient = useQueryClient();
  const modalRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications/user/", user?.id, { unreadOnly: activeTab === "unread" }],
    enabled: isOpen && !!user,
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await apiRequest(
        "PATCH",
        `/api/notifications/user/${user.id}/read-all`,
        {}
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/user/", user?.id] });
    },
  });

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">NOTIFICATIONS</DialogTitle>
        </DialogHeader>

        <div className="flex space-x-2 mb-6">
          <Button
            className={`flex-1 ${activeTab === "unread" ? "bg-primary text-white" : "bg-white border border-gray-300"}`}
            onClick={() => setActiveTab("unread")}
          >
            Unread
          </Button>
          <Button
            className={`flex-1 ${activeTab === "inbox" ? "bg-primary text-white" : "bg-white border border-gray-300"}`}
            onClick={() => setActiveTab("inbox")}
          >
            Inbox
          </Button>
        </div>

        {isLoading ? (
          <div className="h-40 flex items-center justify-center">
            <span>Loading notifications...</span>
          </div>
        ) : notifications.length > 0 ? (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="p-3 border-b border-gray-100 last:border-b-0"
              >
                <h4 className="font-medium">{notification.title}</h4>
                <p className="text-sm text-gray-600">{notification.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center text-gray-500">
            No {activeTab === "unread" ? "new" : ""} notifications
          </div>
        )}

        <div className="text-right mt-4">
          <Button
            variant="link"
            className="text-primary text-sm"
            onClick={handleMarkAllAsRead}
            disabled={
              markAllAsReadMutation.isPending ||
              (activeTab === "unread" && notifications.length === 0)
            }
          >
            Mark all as read
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
