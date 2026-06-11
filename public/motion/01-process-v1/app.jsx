// app.jsx — mounts the Stage with our Scene
const { Stage } = window;

function App() {
  return (
    <Stage
      width={1920}
      height={1080}
      duration={10}
      background="#0a0a0a"
      persistKey="atheric-code-to-site"
      controls={false}
    >
      <window.Scene/>
    </Stage>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
