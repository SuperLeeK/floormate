import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ChatInputView } from './components/ChatInputView';
import { SettingsView } from './components/SettingsView';
import { ChatHistoryView } from './components/ChatHistoryView';
import { LivePreviewView } from './components/LivePreviewView';

const urlParams = new URLSearchParams(window.location.search);
const windowType = urlParams.get('window');

function renderRoot() {
  if (windowType === 'chat') {
    return <ChatInputView />;
  }
  if (windowType === 'settings') {
    return <SettingsView />;
  }
  if (windowType === 'history') {
    return <ChatHistoryView />;
  }
  if (windowType === 'preview') {
    return <LivePreviewView />;
  }
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {renderRoot()}
  </React.StrictMode>
);
