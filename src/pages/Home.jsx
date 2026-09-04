export default function Home() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-white">
      <iframe
        src="/hub.html"
        title="GLAM ChatGPT Learning Hub"
        className="h-full w-full border-0"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
