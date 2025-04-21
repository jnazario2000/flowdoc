import React, { useState } from 'react';
import axios from 'axios';

function AddEditForm() {
  const [formData, setFormData] = useState({
    userId: '',
    documentId: '',
    changes: '',
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/api/editHistories', formData);
      alert('Edit history submitted!');
    } catch (error) {
      console.error('Error submitting edit history:', error);
      alert('Failed to submit.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Submit Edit</h3>
      <input name="userId" placeholder="User ID" onChange={handleChange} required />
      <input name="documentId" placeholder="Document ID" onChange={handleChange} required />
      <textarea name="changes" placeholder="Changes" onChange={handleChange} required />
      <button type="submit">Submit</button>
    </form>
  );
}

export default AddEditForm;
