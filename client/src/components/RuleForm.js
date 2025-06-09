// src/components/RuleForm.js
import React, { useState } from 'react';
import axios from 'axios';

const RuleForm = () => {
  const [rule, setRule] = useState({
    name: '',
    conditions: '',
    actions: '',
    schedule: '',
  });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setRule({ ...rule, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const parsedConditions = JSON.parse(rule.conditions);
      const parsedActions = JSON.parse(rule.actions);
  
      const payload = {
        name: rule.name,
        conditions: parsedConditions,
        actions: parsedActions,
        schedule: rule.schedule || null,
      };
  
      await axios.post('/api/rules', payload);
      setMessage('✅ Rule created successfully!');
    } catch (err) {
  if (err.response && err.response.data && err.response.data.error) {
    setMessage(`❌ ${err.response.data.error}`);
  } else {
    setMessage('❌ Error creating rule');
  }
}

  

  return (
    <div>
      <h2>Create Rule</h2>
      <input name="name" placeholder="Rule Name" onChange={handleChange} />
      <textarea name="conditions" placeholder='{"==": [{"var":"age"}, 18]}' onChange={handleChange} />
      <textarea name="actions" placeholder='[{"type":"webhook","url":"..."}]' onChange={handleChange} />
      <input name="schedule" placeholder="Cron (optional)" onChange={handleChange} />
      <button onClick={handleSubmit}>Create Rule</button>
      <p>{message}</p>
    </div>
  );
};

export default RuleForm;
