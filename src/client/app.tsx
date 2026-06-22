import React, { useState, useEffect, useCallback } from "react";
import Navigation from "./components/Navigation.tsx";
import Applications from "./components/Applications.tsx";
import AppDetail from "./components/AppDetail.tsx";
import ConversationDetail from "./components/ConversationDetail.tsx";
import AgentPerformance from "./components/AgentPerformance.tsx";
import TimeSeriesView from "./components/TimeSeriesView.tsx";
import "./app.css";

declare const window: any;

interface ViewState {
  view: string;
  id: string | null;
}

function getViewFromUrl(): ViewState {
  const params = new URLSearchParams(window.location.search);
  return {
    view: params.get("view") || "applications",
    id: params.get("id") || null,
  };
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>(getViewFromUrl);

  useEffect(() => {
    const onPopState = () => setCurrentView(getViewFromUrl());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigateToView = useCallback(
    (viewName: string, id?: string | null) => {
      const params = new URLSearchParams({ view: viewName });
      if (id) params.set("id", id);
      const relativePath = `${window.location.pathname}?${params}`;
      const title = `Build Agent Analytics - ${viewName}`;

      if (window.self !== window.top) {
        window.CustomEvent.fireTop("magellanNavigator.permalink.set", {
          relativePath,
          title,
        });
      }

      window.history.pushState({ viewName, id }, "", relativePath);
      document.title = title;
      setCurrentView({ view: viewName, id: id || null });
    },
    []
  );

  const { view, id } = currentView;

  const renderView = () => {
    switch (view) {
      case "app-detail":
        return id ? (
          <AppDetail appId={id} onNavigate={navigateToView} />
        ) : (
          <div className="ba-empty">No application selected</div>
        );
      case "conversation":
        return id ? (
          <ConversationDetail conversationId={id} onNavigate={navigateToView} />
        ) : (
          <div className="ba-empty">No conversation selected</div>
        );
      case "performance":
        return <AgentPerformance />;
      case "timeseries":
        return <TimeSeriesView />;
      case "applications":
      default:
        return <Applications onNavigate={navigateToView} />;
    }
  };

  return (
    <div className="ba-app">
      <Navigation currentView={view} onNavigate={(v) => navigateToView(v)} />
      <main className="ba-main">{renderView()}</main>
    </div>
  );
}
