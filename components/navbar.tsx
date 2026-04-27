'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart2, Settings } from 'lucide-react'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu'
import { AudioPlayer } from '@/components/audioplayer'
import { Screenshot } from '@/components/screenshot'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDeckStats } from '@/lib/deck-stats-context'
import { useSettings, type AppSettings } from '@/lib/settings-context'
import { cn } from '@/lib/utils'

const APP_NAME = 'Yomihooker'
const NAV_ITEMS = [{ label: 'Anki', href: '/anki' }]

function SettingsPopover() {
  const { settings, defaultSettings, setSettings } = useSettings()
  const [draft, setDraft] = useState<AppSettings>(settings)
  const [open, setOpen] = useState(false)

  const handleOpen = (v: boolean) => {
    if (v) setDraft(settings)
    setOpen(v)
  }

  const handleSave = async () => {
    await setSettings(draft)
    setOpen(false)
  }

  const handleReset = () => {
    setDraft(defaultSettings)
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Settings">
          <Settings />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <p className="mb-3 text-sm font-semibold">Settings</p>
        <div className="space-y-3 text-sm">
          <div className="space-y-1">
            <label className="text-muted-foreground">LunaTranslator port</label>
            <Input
              type="number"
              value={draft.lunatranslatorPort}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  lunatranslatorPort: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground">VOICEVOX port</label>
            <Input
              type="number"
              value={draft.voicevoxPort}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  voicevoxPort: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground">VOICEVOX speaker</label>
            <Input
              type="number"
              value={draft.voicevoxSpeaker}
              onChange={(e) =>
                setDraft((d) => ({ ...d, voicevoxSpeaker: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground">AnkiConnect port</label>
            <Input
              type="number"
              value={draft.ankiPort}
              onChange={(e) =>
                setDraft((d) => ({ ...d, ankiPort: Number(e.target.value) }))
              }
            />
          </div>
        </div>
        <div className="mt-4 flex justify-between">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Reset defaults
          </Button>
          <Button size="sm" onClick={() => void handleSave()}>
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function StatsButton() {
  const { charCount } = useDeckStats()
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Reading stats">
          <BarChart2 />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 text-sm" align="end">
        You&apos;ve read{' '}
        <span className="font-semibold">{charCount.toLocaleString()}</span>{' '}
        characters
      </PopoverContent>
    </Popover>
  )
}

export function Navbar() {
  const pathname = usePathname()

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 fixed top-0 right-0 left-0 z-50 border-b backdrop-blur">
      <div className="flex h-14 items-center gap-6 px-4">
        <Link
          href="/"
          className="text-xl font-extrabold tracking-tight text-green-500"
        >
          {APP_NAME}
        </Link>
        <NavigationMenu viewport={false}>
          <NavigationMenuList className="gap-0">
            {NAV_ITEMS.map(({ label, href }) => (
              <NavigationMenuItem key={href}>
                <NavigationMenuLink
                  asChild
                  active={pathname === href}
                  className={cn(
                    'inline-flex items-center rounded-md px-3 py-1.5 text-xl font-semibold tracking-tight transition-colors',
                    'text-foreground/55 hover:text-foreground hover:bg-transparent',
                    'data-active:text-foreground',
                  )}
                >
                  <Link href={href}>{label}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
        <div className="ml-auto flex items-center gap-2">
          <AudioPlayer />
          <Screenshot />
          <StatsButton />
          <SettingsPopover />
        </div>
      </div>
    </header>
  )
}
