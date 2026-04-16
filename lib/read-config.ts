import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { parse, stringify } from 'smol-toml'
import type { AppSettings } from '@/lib/settings-context'

type ServiceConfig = { port: number }
type VoicevoxConfig = { port: number; speaker: string }

type ConfigToml = {
  lunatranslator: ServiceConfig
  voicevox: VoicevoxConfig
  anki_connect: ServiceConfig
  defaults: {
    lunatranslator: ServiceConfig
    voicevox: VoicevoxConfig
    anki_connect: ServiceConfig
  }
}

const CONFIG_PATH = join(process.cwd(), 'config.toml')

export function readConfigFile(): ConfigToml {
  const raw = readFileSync(CONFIG_PATH, 'utf-8')
  return parse(raw) as ConfigToml
}

export function configFileToSettings(cfg: ConfigToml): AppSettings {
  return {
    lunatranslatorPort: cfg.lunatranslator.port,
    voicevoxPort: cfg.voicevox.port,
    voicevoxSpeaker: cfg.voicevox.speaker,
    ankiPort: cfg.anki_connect.port,
  }
}

export function configFileToDefaults(cfg: ConfigToml): AppSettings {
  return {
    lunatranslatorPort: cfg.defaults.lunatranslator.port,
    voicevoxPort: cfg.defaults.voicevox.port,
    voicevoxSpeaker: cfg.defaults.voicevox.speaker,
    ankiPort: cfg.defaults.anki_connect.port,
  }
}

/** Write current settings back to config.toml, preserving the [defaults.*] section. */
export function writeConfigFile(settings: AppSettings): void {
  const existing = readConfigFile()
  const updated: ConfigToml = {
    lunatranslator: { port: settings.lunatranslatorPort },
    voicevox: {
      port: settings.voicevoxPort,
      speaker: settings.voicevoxSpeaker,
    },
    anki_connect: { port: settings.ankiPort },
    defaults: existing.defaults,
  }
  writeFileSync(CONFIG_PATH, stringify(updated), 'utf-8')
}
