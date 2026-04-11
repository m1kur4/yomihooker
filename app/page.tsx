import DualWebSocketList from "./deck";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-green-500">
            witch on the holy night
          </h1>
        </div>
      </div>

      <DualWebSocketList />
    </main>
  );
}
