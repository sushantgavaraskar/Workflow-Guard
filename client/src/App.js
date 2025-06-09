import React from 'react';
import RuleForm from './components/RuleForm';
import TriggerForm from './components/TriggerForm';
import LogViewer from './components/LogViewer';
import RuleList from './components/RuleList';

function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>⚙️ Workflow Guard Dashboard</h1>

      <section style={{ marginBottom: '2rem', borderBottom: '1px solid #ccc' }}>
        <RuleForm />
      </section>

      <section style={{ marginBottom: '2rem', borderBottom: '1px solid #ccc' }}>
        <TriggerForm />
      </section>

      <section style={{ marginBottom: '2rem', borderBottom: '1px solid #ccc' }}>
        <RuleList />
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <LogViewer />
      </section>
    </div>
  );
}

export default App;
