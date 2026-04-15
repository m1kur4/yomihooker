import TextDeck from "./deck";
import { AudioPlayer } from "@/components/audioplayer";
import { Screenshot } from "@/components/screenshot";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col px-4 py-6">
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
