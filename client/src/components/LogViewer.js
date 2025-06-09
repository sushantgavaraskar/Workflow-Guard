import React, { useEffect, useState } from 'react';
import axios from 'axios';

const LogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get('/api/logs');
        setLogs(res.data);
      } catch (err) {
        setError('❌ Failed to fetch logs');
        console.error(err);
      }
    };

    fetchLogs();
  }, []);

  return (
    <div>
      <h2>Workflow Logs</h2>
      {error && <p>{error}</p>}
      {logs.length === 0 ? (
        <p>No logs found.</p>
      ) : (
        <ul>
          {logs.map((log) => (
            <li key={log.id}>
              <strong>{log.executedAt}:</strong> Rule ID: {log.ruleId}, Matched: {log.matched ? '✅ Yes' : '❌ No'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LogViewer;
