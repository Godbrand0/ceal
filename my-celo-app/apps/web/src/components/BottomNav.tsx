"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/discover", icon: Flame,          label: "Discover" },
  { href: "/matches",  icon: MessageCircle,  label: "Matches"  },
  { href: "/profile",  icon: User,           label: "Profile"  },
];

export function BottomNav() {
  const path = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50
                    bg-gray-900/95 backdrop-blur border-t border-gray-800">
      {/* touchAction:manipulation kills the 300ms double-tap delay on mobile */}
      <div className="flex" style={{ touchAction: "manipulation" }}>
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              prefetch
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 text-xs",
                active ? "text-rose-400" : "text-gray-500"
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
