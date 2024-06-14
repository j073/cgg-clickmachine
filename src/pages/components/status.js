import { useEffect, useState } from 'react';

const DownloadStatus = () => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const eventSource = new EventSource('/api/download');

    eventSource.onmessage = (event) => {
      const { downloadMessage } = JSON.parse(event.data);
      setMessages(prevMessages => [...prevMessages, downloadMessage]);
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div>
      <h2>Download Status:</h2>
      <ul>
        {messages.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </div>
  );
};

export default DownloadStatus;
