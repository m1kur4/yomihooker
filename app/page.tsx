import TextDeck from "./deck";
import { AudioPlayer } from "@/components/audioplayer";
import { Screenshot } from "@/components/screenshot";

const TITLE = "witch on the holy night";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col px-4 py-6">
      <div className="w-full max-w-md space-y-8 self-center">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-green-500">
            {TITLE}
          </h1>
        </div>
      </div>

      <div className="mt-6">
        <TextDeck />
      </div>

      <div className="mt-auto flex items-center justify-center gap-4 pt-8">
        <AudioPlayer />
        <Screenshot />
      </div>
    </main>
  );
}
