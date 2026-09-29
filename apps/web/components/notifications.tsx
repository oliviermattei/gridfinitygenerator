"use client";

import { Toast } from "@base-ui/react/toast";
import { focusRing } from "@repo/ui";
import { X } from "lucide-react";
import { useStrings } from "@/lib/locale";

const manager = Toast.createToastManager();

/** Shows a short notification at the top of the screen, announced politely to screen readers. */
export function notify(title: string, description?: string) {
  // A description is something to read or copy: it stays until closed.
  manager.add({ title, description, timeout: description ? 0 : 2500 });
}

function NotificationList() {
  const t = useStrings();
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      swipeDirection="up"
      className="rounded-card bg-ink text-white shadow-pop transition-[opacity,transform] duration-200 data-ending-style:-translate-y-2 data-ending-style:opacity-0 data-limited:hidden data-starting-style:-translate-y-2 data-starting-style:opacity-0"
    >
      <Toast.Content className="flex items-start gap-3 py-2.5 pr-2 pl-4">
        <div className="min-w-0 flex-1 py-0.5">
          <Toast.Title className="text-[13px] font-medium" />
          <Toast.Description className="mt-1 text-[12.5px] break-all text-white/80 select-all" />
        </div>
        {toast.description ? (
          <Toast.Close aria-label={t.close} className={`grid size-7 shrink-0 place-items-center rounded-full hover:bg-white/10 ${focusRing}`}>
            <X className="size-3.5" aria-hidden />
          </Toast.Close>
        ) : null}
      </Toast.Content>
    </Toast.Root>
  ));
}

/** Where notifications show: centred under the top bar. */
export function Notifications() {
  return (
    <Toast.Provider toastManager={manager} limit={1}>
      <Toast.Portal>
        <Toast.Viewport className="fixed top-18 left-1/2 z-50 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col">
          <NotificationList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
