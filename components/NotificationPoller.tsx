"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Bell } from "lucide-react";

export function NotificationPoller() {
  const isPolling = useRef(false);

  useEffect(() => {
    // Only poll if we have a token (user is logged in)
    const token = localStorage.getItem("token");
    if (!token) return;

    const poll = async () => {
      if (isPolling.current) return;
      isPolling.current = true;

      try {
        const res = await fetch("/api/notifications/poll", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (!res.ok) return;
        
        const data = await res.json();
        
        if (data.notifications && data.notifications.length > 0) {
          data.notifications.forEach((n: any) => {
            // Map the notification type to a visual style/sound if desired
            // For now, simple stylish toast
            toast(n.message, {
              icon: <Bell className="w-4 h-4 text-indigo-500" />,
              action: {
                label: "View",
                onClick: () => {
                  window.location.href = `/loto/${n.taskId}`;
                }
              },
              duration: 8000,
            });
          });
        }
      } catch (err) {
        // Silently fail polling to not spam the console
      } finally {
        isPolling.current = false;
      }
    };

    // Run immediately on mount
    poll();

    // Then every 10 seconds
    const intervalId = setInterval(poll, 10000);

    return () => clearInterval(intervalId);
  }, []);

  return null; // This component is invisible
}
