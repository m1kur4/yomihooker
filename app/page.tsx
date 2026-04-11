import DualWebSocketList from "./deck";

const title = "witch on the holy night"
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-green-500">
           {title}
          </h1>
        </div>
      </div>

      <DualWebSocketList />
    </main>
  );
}
