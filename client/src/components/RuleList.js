import React, { useEffect, useState } from 'react';
import axios from 'axios';

const RuleList = () => {
  const [rules, setRules] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const res = await axios.get('/api/rules');
        setRules(res.data);
      } catch (err) {
        setError('❌ Failed to fetch rules');
        
      }finally{
        setLoading(false);
      }
    };

    fetchRules();
  }, []);

  return (
    <div>
      <h2>Saved Rules</h2>
      {error && <p>{error}</p>}
      {rules.length === 0 ? (
        <p>No rules found.</p>
      ) : (
        <ul>
          {rules.map((rule) => (
            <li key={rule.id} style={{ marginBottom: '1rem' }}>
              <strong>{rule.name}</strong><br />
              <em>Conditions:</em> <pre>{JSON.stringify(JSON.parse(rule.conditions), null, 2)}</pre>
              <em>Actions:</em> <pre>{JSON.stringify(JSON.parse(rule.actions), null, 2)}</pre>
              {rule.schedule && <p><em>Schedule:</em> {rule.schedule}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RuleList;
