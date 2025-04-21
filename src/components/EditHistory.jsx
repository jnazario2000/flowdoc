import React, { useEffect, useState } from 'react';
import axios from 'axios';

function EditHistory() {
  const [histories, setHistories] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:3000/api/editHistories')
      .then(res => setHistories(res.data))
      .catch(err => console.error('Failed to load edit history:', err));
  }, []);

  return (
    <div>
      <h3>Edit History</h3>
      {histories.length === 0 ? (
        <p>No edit history yet.</p>
      ) : (
        <ul>
          {histories.map((edit) => (
            <li key={edit._id}>
              <strong>User:</strong> {edit.userId}<br />
              <strong>Document:</strong> {edit.documentId}<br />
              <strong>Change:</strong> {edit.changes}<br />
              <strong>Time:</strong> {new Date(edit.timestamp).toLocaleString()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default EditHistory;
