import React from "react";
import ReactDOM from "react-dom/client";
import { CockpitRouter } from "./router";
import "./styles.css";
import "@emappa/web-immersive/immersive.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CockpitRouter />
  </React.StrictMode>,
);
