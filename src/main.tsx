import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import "./index.css";
import { initSupabase } from "./lib/supabase";

const root = ReactDOM.createRoot(document.getElementById("root")!);

initSupabase()
  .then(async () => {
    const { default: App } = await import("./App");
    root.render(
      <React.StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </React.StrictMode>,
    );
  })
  .catch((e: Error) => {
    root.render(<div style={{ padding: 40, fontFamily: "Inter, sans-serif", color: "#5f6368" }}>{e.message}</div>);
  });
