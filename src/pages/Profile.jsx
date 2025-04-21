import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Profile() {
  const [editHistory, setEditHistory] = useState([]);

  useEffect(() => {
    // Hard coded user Id for now
    const userId = "6805a3fbebffbc873b263f3a";

    axios.get(`http://localhost:3000/api/editHistories/user/${userId}`)
      .then((response) => {
        setEditHistory(response.data);
      })
      .catch((error) => {
        console.error('Error fetching edit history:', error);
      });
  }, []);

  return (
    <div>
      <h2>User Edit History</h2>
      {editHistory.length === 0 ? (
        <p>No edit history found.</p>
      ) : (
        <ul>
          {editHistory.map((history) => (
            <li key={history._id}>
              <strong>Document ID:</strong> {history.documentId}<br />
              <strong>Changes:</strong> {history.changes}<br />
              <strong>Timestamp:</strong> {new Date(history.timestamp).toLocaleString()}
              <hr />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Profile;
