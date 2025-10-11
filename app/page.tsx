import Canvas from "@/components/Canvas";
import duckImage from "@/assets/images/duck.png";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <main className="flex flex-col gap-8 items-center">
        <h1 className="text-4xl font-bold">Emily Draw</h1>
        <Canvas imageSrc={duckImage} />
      </main>
    </div>
  );
}
