"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Text", href: "/" },
  { label: "Anki", href: "/anki" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-6">
        <span className="text-lg font-bold tracking-tight text-green-500">
          TextHooker
        </span>
        <NavigationMenu viewport={false}>
          <NavigationMenuList className="gap-0">
            {NAV_ITEMS.map(({ label, href }) => (
              <NavigationMenuItem key={href}>
                <NavigationMenuLink
                  asChild
                  active={pathname === href}
                  className={cn(
                    "inline-flex items-center px-3 py-1.5 text-xl font-semibold tracking-tight transition-colors rounded-md",
                    "text-foreground/55 hover:text-foreground hover:bg-transparent",
                    "data-[active]:text-foreground"
                  )}
                >
                  <Link href={href}>{label}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  );
}
