import TextDeck from "./deck";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col px-4 py-6">
      <div className="mt-6">
        <TextDeck />
      </div>
    </main>
  );
}
