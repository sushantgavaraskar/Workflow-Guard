import React, { useState } from 'react';
import axios from 'axios';

const TriggerForm = () => {
  const [event, setEvent] = useState('');
  const [data, setData] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    try {
      const parsedData = JSON.parse(data);
  
      const payload = { event, data: parsedData };
      await axios.post('/api/trigger', payload);
      setMessage('✅ Trigger sent successfully!');
    } catch (err) {
      if (err instanceof SyntaxError) {
        setMessage('❌ Invalid JSON in trigger data');
      } else {
        setMessage('❌ Error sending trigger');
      }
      console.error(err);
    }
  };
  

  return (
    <div>
      <h2>Trigger Rule</h2>
      <input
        placeholder="Event Name (e.g., transaction)"
        value={event}
        onChange={(e) => setEvent(e.target.value)}
      />
      <textarea
        placeholder='{"amount": 1200, "currency": "INR"}'
        value={data}
        onChange={(e) => setData(e.target.value)}
      />
      <button onClick={handleSubmit}>Send Trigger</button>
      <p>{message}</p>
    </div>
  );
};

export default TriggerForm;
